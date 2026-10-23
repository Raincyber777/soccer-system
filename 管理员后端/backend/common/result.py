# -*- coding: utf-8 -*-
"""统一响应结构（PLAN 8.1）：{code, msg, data, success, trace_id}。"""
from __future__ import annotations

from typing import Any

from django.http import JsonResponse

from common.codes import ResponseCode
from common.trace import get_trace_id


def _body(code: int, msg: str, data: Any, success: bool) -> dict:
    return {
        "code": int(code),
        "msg": msg,
        "data": data,
        "success": success,
        "trace_id": get_trace_id() or "",
    }


def result(code: ResponseCode, msg: str | None = None, data: Any = None) -> JsonResponse:
    ok = int(code) == int(ResponseCode.SUCCESS)
    return JsonResponse(
        _body(int(code), msg or code.msg, data, ok),
        json_dumps_params={"ensure_ascii": False},
    )


def success(msg: str = "成功", data: Any = None) -> JsonResponse:
    return JsonResponse(
        _body(ResponseCode.SUCCESS, msg, data, True),
        json_dumps_params={"ensure_ascii": False},
    )


def error(code: ResponseCode, msg: str | None = None, data: Any = None) -> JsonResponse:
    return JsonResponse(
        _body(int(code), msg or code.msg, data, False),
        json_dumps_params={"ensure_ascii": False},
    )
