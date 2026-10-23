# -*- coding: utf-8 -*-
"""日志过滤器（PLAN 8.3）：注入 trace_id、递归脱敏敏感字段。"""
from __future__ import annotations

import logging
from typing import Any

from common.trace import get_trace_id

SENSITIVE_KEYS = ("password", "token", "id_card", "phone", "secret", "csrf")

MASK = "***"


class TraceIdFilter(logging.Filter):
    """把当前请求的 trace_id 注入每条日志记录。"""

    def filter(self, record: logging.LogRecord) -> bool:
        record.trace_id = get_trace_id() or "-"
        return True


def sanitize_params(data: Any) -> Any:
    """递归脱敏：键名命中敏感词的字段值替换为 ***（大小写不敏感）。"""
    if isinstance(data, dict):
        cleaned = {}
        for key, value in data.items():
            key_text = str(key)
            if any(word in key_text.lower() for word in SENSITIVE_KEYS):
                cleaned[key] = MASK
            else:
                cleaned[key] = sanitize_params(value)
        return cleaned
    if isinstance(data, (list, tuple)):
        return [sanitize_params(item) for item in data]
    return data


class SensitiveFilter(logging.Filter):
    """记录级脱敏：把 extra 中的 context 递归清洗。"""

    def filter(self, record: logging.LogRecord) -> bool:
        context = getattr(record, "context", None)
        if isinstance(context, (dict, list, tuple)):
            record.context = sanitize_params(context)
        return True
