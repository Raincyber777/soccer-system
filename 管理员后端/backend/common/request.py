# -*- coding: utf-8 -*-
"""请求参数校验层（PLAN 8.2）：BaseRequest + 字段类型，只做校验不做业务查询。

约定：
- 校验失败统一抛 RequestValidationError，由 ExceptionMiddleware 映射为 10001；
- 必填项缺失抛 10002 语义的消息（沿用 10001 响应码，消息区分）；
- `exists` 只用于存在性查询，不做业务判断。
"""
from __future__ import annotations

import json
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Callable, Dict, Iterable, Optional

from common.exceptions import RequestValidationError

_INT_RE = re.compile(r"^-?\d+$")


class Field:
    """字段基类：必填、默认值、范围、长度、枚举、正则、存在性。"""

    default_type_name = "值"

    def __init__(
        self,
        required: bool = False,
        default: Any = None,
        label: str = "",
        min_value: Any = None,
        max_value: Any = None,
        max_length: Optional[int] = None,
        min_length: Optional[int] = None,
        choices: Optional[Iterable] = None,
        regex: Optional[str] = None,
        exists: Optional[Callable[[Any], bool]] = None,
        strip: bool = True,
    ) -> None:
        self.required = required
        self.default = default
        self.label = label
        self.min_value = min_value
        self.max_value = max_value
        self.max_length = max_length
        self.min_length = min_length
        self.choices = list(choices) if choices is not None else None
        self.regex = re.compile(regex) if regex else None
        self.exists = exists
        self.strip = strip

    # -- 子类实现 ---------------------------------------------------------
    def to_python(self, raw: Any) -> Any:  # pragma: no cover - 由子类覆盖
        return raw

    # -- 通用流程 ---------------------------------------------------------
    def clean(self, raw: Any) -> Any:
        name = self.label or "参数"
        if raw is None or (isinstance(raw, str) and not raw.strip()):
            if self.required:
                raise RequestValidationError(f"{name}不能为空")
            return self.default

        if self.strip and isinstance(raw, str):
            raw = raw.strip()

        if self.max_length is not None and isinstance(raw, str) and len(raw) > self.max_length:
            raise RequestValidationError(f"{name}长度不能超过 {self.max_length} 个字符")
        if self.min_length is not None and isinstance(raw, str) and len(raw) < self.min_length:
            raise RequestValidationError(f"{name}长度不能少于 {self.min_length} 个字符")

        if self.regex is not None and isinstance(raw, str) and not self.regex.match(raw):
            raise RequestValidationError(f"{name}格式不正确")

        value = self.to_python(raw)

        if self.choices is not None and value not in self.choices:
            allowed = "、".join(str(item) for item in self.choices)
            raise RequestValidationError(f"{name}只能是：{allowed}")
        if self.min_value is not None and value < self.min_value:
            raise RequestValidationError(f"{name}不能小于 {self.min_value}")
        if self.max_value is not None and value > self.max_value:
            raise RequestValidationError(f"{name}不能大于 {self.max_value}")
        if self.exists is not None and not self.exists(value):
            raise RequestValidationError(f"{name}对应的记录不存在")
        return value


class IntegerField(Field):
    default_type_name = "整数"

    def to_python(self, raw: Any) -> int:
        if isinstance(raw, bool):
            raise RequestValidationError(f"{self.label or '参数'}必须是整数")
        if isinstance(raw, int):
            return raw
        text = str(raw).strip()
        if not _INT_RE.match(text):
            raise RequestValidationError(f"{self.label or '参数'}必须是整数")
        return int(text)


class CharField(Field):
    default_type_name = "字符串"

    def to_python(self, raw: Any) -> str:
        if isinstance(raw, (dict, list, tuple)):
            raise RequestValidationError(f"{self.label or '参数'}必须是字符串")
        return str(raw)


class ChoiceField(Field):
    """枚举字段：输入按整数解析（不存在时按字符串匹配）。"""

    def to_python(self, raw: Any) -> Any:
        if isinstance(raw, int) and not isinstance(raw, bool):
            return raw
        text = str(raw).strip()
        if _INT_RE.match(text):
            return int(text)
        return text


class DecimalField(Field):
    default_type_name = "小数"

    def __init__(self, decimal_places: int = 2, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.decimal_places = decimal_places

    def to_python(self, raw: Any) -> Decimal:
        try:
            value = Decimal(str(raw).strip())
        except (InvalidOperation, ValueError):
            raise RequestValidationError(f"{self.label or '参数'}必须是数字") from None
        if not value.is_finite():
            raise RequestValidationError(f"{self.label or '参数'}必须是数字")
        quant = Decimal(1).scaleb(-self.decimal_places)
        return value.quantize(quant)


class DateField(Field):
    default_type_name = "日期"

    def to_python(self, raw: Any) -> date:
        if isinstance(raw, datetime):
            return raw.date()
        if isinstance(raw, date):
            return raw
        text = str(raw).strip()
        for fmt in ("%Y-%m-%d", "%Y/%m/%d"):
            try:
                return datetime.strptime(text, fmt).date()
            except ValueError:
                continue
        raise RequestValidationError(f"{self.label or '参数'}日期格式应为 YYYY-MM-DD")


def parse_payload(request: Any) -> Dict[str, Any]:
    """把请求解析成 dict：JSON 请求体 > 表单 > 查询串。"""
    content_type = (getattr(request, "content_type", "") or "").lower()
    if "application/json" in content_type:
        body = request.body or b""
        if not body:
            return {}
        try:
            data = json.loads(body.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            raise RequestValidationError("请求体不是合法的 JSON") from None
        if not isinstance(data, dict):
            raise RequestValidationError("请求体必须是 JSON 对象")
        return data

    if request.method in ("GET", "HEAD"):
        return dict(request.GET.items())

    data = dict(request.POST.items())
    for key, value in request.GET.items():
        data.setdefault(key, value)
    return data


class BaseRequest:
    """请求对象基类：子类声明字段，`validate()` 返回清理后的 dict。"""

    def __init__(self, data: Optional[Dict[str, Any]] = None) -> None:
        self._data = data or {}

    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)
        cls._fields = {
            name: value
            for name, value in vars(cls).items()
            if isinstance(value, Field) and not name.startswith("_")
        }

    def __getitem__(self, item: str) -> Any:
        return self._data.get(item)

    def raw(self) -> Dict[str, Any]:
        return dict(self._data)

    def validate(self) -> Dict[str, Any]:
        cleaned: Dict[str, Any] = {}
        for name, field in self._fields.items():
            cleaned[name] = field.clean(self._data.get(name))
        return cleaned

    @classmethod
    def from_request(cls, request: Any) -> "BaseRequest":
        return cls(parse_payload(request))

    @classmethod
    def make(cls, data: Dict[str, Any]) -> "BaseRequest":
        return cls(data)
