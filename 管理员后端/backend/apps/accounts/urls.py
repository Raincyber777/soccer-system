# -*- coding: utf-8 -*-
"""accounts 路由：认证 API（无页面）。"""
from django.urls import path

from apps.accounts import views

app_name = "accounts"

urlpatterns = [
    path("api/v1/auth/csrf", views.csrf_token, name="api_csrf"),
    path("api/v1/auth/login", views.login_api, name="api_login"),
    path("api/v1/auth/me", views.me, name="api_me"),
    path("api/v1/auth/logout", views.logout_api, name="api_logout"),
]
