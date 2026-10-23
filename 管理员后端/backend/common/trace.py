# -*- coding: utf-8 -*-
"""trace_id 上下文（PLAN 8.3）。

每个请求由 TraceIdMiddleware 写入，Service / 日志 / 响应共用同一值。
"""
from contextvars import ContextVar

_trace_id: ContextVar[str] = ContextVar("trace_id", default="")
_operator: ContextVar[dict] = ContextVar("operator", default={})


def set_trace_id(value: str) -> None:
    _trace_id.set(value or "")


def get_trace_id() -> str:
    return _trace_id.get()


def set_operator(operator: dict) -> None:
    """记录当前操作人快照（id / username / role），供日志使用。"""
    _operator.set(operator or {})


def get_operator() -> dict:
    return _operator.get()
