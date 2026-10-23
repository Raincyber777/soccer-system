# -*- coding: utf-8 -*-
"""accounts 服务：登录 / 退出 / 登录限流 / 登录日志（PLAN 5.4.10 / 6.8 / 10）。"""
from __future__ import annotations

import time
from typing import Any, Dict

from django.conf import settings
from django.contrib.auth import login as auth_login
from django.contrib.auth import logout as auth_logout
from django.core.cache import cache

from apps.accounts.models import User
from apps.oplogs.services import log_operation
from common.codes import ResponseCode
from common.dicts import (
    ACTION_LOGIN,
    ACTION_LOGIN_FAIL,
    ACTION_LOGOUT,
    MODULE_AUTH,
    ROLE_TEXT,
    text_of,
)
from common.exceptions import BusinessException

FAIL_KEY_TEMPLATE = "login_fail:{username}:{ip}"


def _fail_key(username: str, ip: str) -> str:
    return FAIL_KEY_TEMPLATE.format(username=username or "-", ip=ip or "-")


def _failure_count(username: str, ip: str) -> int:
    return int(cache.get(_fail_key(username, ip)) or 0)


def ensure_not_locked(username: str, ip: str) -> None:
    """登录限流：5 次失败后锁定 5 分钟。"""
    limit = getattr(settings, "LOGIN_RATE_LIMIT_TIMES", 5)
    if _failure_count(username, ip) >= limit:
        raise BusinessException(ResponseCode.BUSINESS_ERROR, "尝试次数过多，请稍后再试")


def _record_failure(username: str, ip: str) -> None:
    key = _fail_key(username, ip)
    limit = getattr(settings, "LOGIN_RATE_LIMIT_TIMES", 5)
    count = min(_failure_count(username, ip) + 1, limit)
    ttl = getattr(settings, "LOGIN_RATE_LIMIT_SECONDS", 300)
    cache.set(key, count, ttl)


def clear_failures(username: str, ip: str) -> None:
    cache.delete(_fail_key(username, ip))


def login(request: Any, username: str, password: str, ip: str = "") -> User:
    """账号密码登录：校验限流 → 校验账号 → 建会话 → 写日志。"""
    started = time.perf_counter()
    ensure_not_locked(username, ip)

    user = User.objects.filter(username=username).first()
    if user is None or not user.check_password(password):
        _record_failure(username, ip)
        log_operation(
            MODULE_AUTH,
            ACTION_LOGIN_FAIL,
            {"username": username, "reason": "账号或密码错误"},
            result_code=int(ResponseCode.PASSWORD_ERROR),
            duration_ms=int((time.perf_counter() - started) * 1000),
        )
        raise BusinessException(ResponseCode.PASSWORD_ERROR)

    if user.status != 1:
        log_operation(
            MODULE_AUTH,
            ACTION_LOGIN_FAIL,
            {"username": username, "reason": "账号被禁用"},
            result_code=int(ResponseCode.ACCOUNT_DISABLED),
            duration_ms=int((time.perf_counter() - started) * 1000),
            user=user,
        )
        raise BusinessException(ResponseCode.ACCOUNT_DISABLED)

    clear_failures(username, ip)
    auth_login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    request.session.cycle_key()
    from django.utils import timezone

    user.last_login = timezone.now()
    user.save(update_fields=["last_login"])

    log_operation(
        MODULE_AUTH,
        ACTION_LOGIN,
        {"username": username},
        result_code=0,
        duration_ms=int((time.perf_counter() - started) * 1000),
        user=user,
    )
    return user


def logout(request: Any) -> None:
    """退出登录并清空 Session，写日志。"""
    user = getattr(request, "user", None)
    if user is not None and getattr(user, "is_authenticated", False):
        log_operation(MODULE_AUTH, ACTION_LOGOUT, {"username": getattr(user, "username", "")}, user=user)
    auth_logout(request)


def user_payload(user: User) -> Dict[str, Any]:
    """当前用户输出（PLAN 5.4.10）：{id, username, real_name, role, role_text}。"""
    return {
        "id": user.pk,
        "username": user.username,
        "real_name": user.real_name or "",
        "role": user.role,
        "role_text": text_of(ROLE_TEXT, user.role),
    }
