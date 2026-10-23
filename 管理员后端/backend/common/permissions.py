# -*- coding: utf-8 -*-
"""权限装饰器（PLAN 8.7）：纯 API，所有失败均返回统一 Result。"""
from __future__ import annotations

from functools import wraps
from typing import Any, Callable

from common.codes import ResponseCode
from common.result import error

ADMIN_ROLE = 9


def api_admin_required(view: Callable) -> Callable:
    """API 鉴权：未登录 20001 / 禁用 20006 / 非管理员 20005。"""

    @wraps(view)
    def wrapper(request: Any, *args: Any, **kwargs: Any) -> Any:
        user = getattr(request, "user", None)
        if user is None or not getattr(user, "is_authenticated", False):
            return error(ResponseCode.UNAUTHORIZED)
        if not getattr(user, "is_active", False):
            return error(ResponseCode.ACCOUNT_DISABLED)
        if getattr(user, "role", None) != ADMIN_ROLE:
            return error(ResponseCode.FORBIDDEN)
        return view(request, *args, **kwargs)

    return wrapper
