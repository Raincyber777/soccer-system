# -*- coding: utf-8 -*-
"""accounts API 视图：只做解析 → Service → Result（无页面）。"""
from __future__ import annotations

from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from apps.accounts import services
from apps.accounts.requests import LoginRequest
from common.context import get_client_ip
from common.permissions import api_admin_required
from common.result import success


@require_GET
@ensure_csrf_cookie
def csrf_token(request):
    """获取 CSRF Token（同时下发 csrftoken Cookie），供纯 API 客户端使用。"""
    return success("ok", {"csrf_token": get_token(request)})


@require_POST
def login_api(request):
    """账号密码登录（JSON）。成功后建立会话，后续请求带 Cookie 即可。"""
    payload = LoginRequest.from_request(request).validate()
    user = services.login(request, payload["username"], payload["password"], get_client_ip(request))
    return success("登录成功", services.user_payload(user))


@require_GET
@api_admin_required
def me(request):
    """当前登录用户。"""
    return success("获取成功", services.user_payload(request.user))


@require_POST
@api_admin_required
def logout_api(request):
    """退出登录。"""
    services.logout(request)
    return success("已退出登录", None)
