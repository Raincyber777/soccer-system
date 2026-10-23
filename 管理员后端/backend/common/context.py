# -*- coding: utf-8 -*-
"""请求上下文（PLAN 8 / 8.9）：当前请求与操作人快照，供 Service 写日志使用。"""
from __future__ import annotations

from contextvars import ContextVar
from typing import Any, Optional

_current_request: ContextVar[Optional[Any]] = ContextVar("current_request", default=None)


def set_current_request(request: Any) -> None:
    _current_request.set(request)


def get_current_request() -> Any:
    """返回当前请求；不在请求周期内（如脚本、命令行）返回 None。"""
    return _current_request.get()


def get_client_ip(request: Any) -> str:
    """取客户端 IP：优先反向代理头，其次 REMOTE_ADDR。"""
    if request is None:
        return ""
    forwarded = (request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip()
    return forwarded or request.META.get("REMOTE_ADDR", "") or ""
