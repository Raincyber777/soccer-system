# -*- coding: utf-8 -*-
"""中间件（PLAN 8.3 / 8.4）：trace_id、请求上下文、API 日志、统一异常。

关键实现说明：
Django 5 会给每个中间件外包一层 `convert_exception_to_response`，视图异常在到达
本中间件的 `__call__` 之前就已被转成响应。因此统一异常分两条通道处理：
1. `process_exception`：视图/CSRF 抛出的异常（早于 Django 转换，可拿到业务码）；
2. `__call__` 中的状态码兜底：把 404/403/400 等响应统一转成 Result（仅 /api/ 路径）。
"""
from __future__ import annotations

import logging
import time
import uuid
from typing import Any, Callable, Optional, Tuple

from django.core.exceptions import ObjectDoesNotExist, PermissionDenied
from django.db import DatabaseError, IntegrityError, OperationalError
from django.http import Http404

from common.codes import ResponseCode
from common.context import set_current_request
from common.exceptions import BusinessException, RequestValidationError
from common.result import error
from common.trace import set_operator, set_trace_id

api_logger = logging.getLogger("api")
business_logger = logging.getLogger("business")
exception_logger = logging.getLogger("exception")

API_PREFIX = "/api/"


class TraceIdMiddleware:
    """为每个请求生成/透传 trace_id，写入上下文与响应头 X-Trace-Id。"""

    def __init__(self, get_response: Callable) -> None:
        self.get_response = get_response

    def __call__(self, request: Any) -> Any:
        trace_id = (request.headers.get("X-Trace-Id") or "").strip() or uuid.uuid4().hex
        set_trace_id(trace_id)
        request.trace_id = trace_id
        response = self.get_response(request)
        response["X-Trace-Id"] = trace_id
        return response


class RequestContextMiddleware:
    """把当前请求与操作人快照放进 contextvar，供 Service 写操作日志。"""

    def __init__(self, get_response: Callable) -> None:
        self.get_response = get_response

    def __call__(self, request: Any) -> Any:
        set_current_request(request)
        user = getattr(request, "user", None)
        if user is not None and getattr(user, "is_authenticated", False):
            set_operator(
                {
                    "id": getattr(user, "pk", None),
                    "username": getattr(user, "username", ""),
                    "role": getattr(user, "role", None),
                }
            )
        else:
            set_operator({})
        try:
            return self.get_response(request)
        finally:
            set_current_request(None)
            set_operator({})


class ApiLogMiddleware:
    """接口访问日志（api 通道）；耗时超过 1000ms 额外记 business 慢接口告警。"""

    def __init__(self, get_response: Callable) -> None:
        self.get_response = get_response

    def __call__(self, request: Any) -> Any:
        started = time.perf_counter()
        response = self.get_response(request)
        duration_ms = int((time.perf_counter() - started) * 1000)
        user = getattr(request, "user", None)
        user_id = getattr(user, "pk", None) if user is not None else None
        status = getattr(response, "status_code", 0)
        api_logger.info(
            "%s %s %s %sms user=%s",
            request.method,
            request.get_full_path()[:255],
            status,
            duration_ms,
            user_id or "-",
        )
        if duration_ms > 1000:
            business_logger.warning(
                "慢接口 %s %s %sms",
                request.method,
                request.get_full_path()[:255],
                duration_ms,
            )
        return response


class ExceptionMiddleware:
    """统一异常映射（PLAN 5.5）：业务异常携带自身 code，未知异常 90001。"""

    def __init__(self, get_response: Callable) -> None:
        self.get_response = get_response

    def __call__(self, request: Any) -> Any:
        response = self.get_response(request)
        status = getattr(response, "status_code", 200)
        if not request.path.startswith(API_PREFIX):
            return response
        if status == 404:
            return error(ResponseCode.DATA_NOT_FOUND, "接口不存在")
        if status == 403:
            return error(ResponseCode.FORBIDDEN)
        if status == 400:
            return error(ResponseCode.PARAM_ERROR)
        if status >= 500:
            return error(ResponseCode.DATABASE_ERROR if status == 503 else ResponseCode.SYSTEM_ERROR)
        return response

    def process_exception(self, request: Any, exception: Exception) -> Optional[Any]:
        """在 Django 把异常转成响应之前接管，保证业务码不丢失。"""
        mapped = _classify(exception)
        if mapped is None:
            return None
        code, msg = mapped
        return _failure(request, code, msg)


def _classify(exception: Exception) -> Optional[Tuple[ResponseCode, Optional[str]]]:
    """异常 → (响应码, 消息)；未知异常记录堆栈后归为 90001。"""
    if isinstance(exception, RequestValidationError):
        return ResponseCode.PARAM_ERROR, getattr(exception, "msg", None)
    if isinstance(exception, BusinessException):
        return exception.code, exception.msg
    if isinstance(exception, PermissionDenied):
        return ResponseCode.FORBIDDEN, None
    if isinstance(exception, ObjectDoesNotExist):
        return ResponseCode.DATA_NOT_FOUND, None
    if isinstance(exception, IntegrityError):
        return ResponseCode.DATA_EXISTS, None
    if isinstance(exception, (OperationalError, DatabaseError)):
        exception_logger.exception("数据库异常")
        return ResponseCode.DATABASE_ERROR, None
    if isinstance(exception, Http404):
        return ResponseCode.DATA_NOT_FOUND, "接口不存在"
    exception_logger.exception("系统异常")
    return ResponseCode.SYSTEM_ERROR, None


def _failure(request: Any, code: ResponseCode, msg: Optional[str] = None) -> Any:
    """纯 API 服务：所有错误一律返回统一 Result JSON，不渲染任何页面。"""
    return error(code, msg)
