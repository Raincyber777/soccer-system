# -*- coding: utf-8 -*-
"""accounts 请求参数（PLAN 8.2）。"""
from __future__ import annotations

from common.request import BaseRequest, CharField


class LoginRequest(BaseRequest):
    username = CharField(required=True, max_length=64, label="账号")
    password = CharField(required=True, max_length=128, label="密码")
