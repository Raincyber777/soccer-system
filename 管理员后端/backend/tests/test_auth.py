# -*- coding: utf-8 -*-
"""认证与模型测试（纯 API）：唯一键、软删除、登录成功/失败/禁用/限流、权限、CSRF。"""
from __future__ import annotations

import json

from django.core.cache import cache
from django.db import IntegrityError
from django.test import Client, TestCase

from apps.accounts.models import User
from apps.accounts.services import FAIL_KEY_TEMPLATE
from apps.oplogs.models import OperationLog

LOGIN_URL = "/api/v1/auth/login"


def api_login(client: Client, username: str = "admin", password: str = "admin123"):
    return client.post(
        LOGIN_URL,
        data=json.dumps({"username": username, "password": password}),
        content_type="application/json",
    )


def make_user(username: str, password: str = "admin123", **fields) -> User:
    return User.objects.create_user(username=username, password=password, **fields)


class UserModelTests(TestCase):
    def test_username_unique(self) -> None:
        make_user("dup_user")
        with self.assertRaises(IntegrityError):
            make_user("dup_user")

    def test_soft_delete_marks_inactive(self) -> None:
        user = make_user("soft_user", role=9)
        self.assertTrue(user.is_active)
        from django.utils import timezone

        user.deleted_at = timezone.now()
        user.save(update_fields=["deleted_at"])
        self.assertFalse(user.is_active)
        self.assertFalse(User.objects.filter(username="soft_user").exists())
        self.assertTrue(User.objects.with_deleted().filter(username="soft_user").exists())

    def test_disabled_user_inactive(self) -> None:
        self.assertFalse(make_user("disabled_user", role=9, status=0).is_active)

    def test_password_hashed_with_bcrypt(self) -> None:
        user = make_user("hash_user")
        self.assertTrue(user.password.startswith("bcrypt"))
        self.assertTrue(user.check_password("admin123"))


class LoginFlowTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.admin = make_user("admin", role=9, real_name="系统管理员", status=1)
        self.client = Client()

    def test_csrf_endpoint(self) -> None:
        response = self.client.get("/api/v1/auth/csrf")
        body = response.json()
        self.assertEqual(body["code"], 0)
        self.assertTrue(body["data"]["csrf_token"])
        self.assertIn("csrftoken", response.cookies)

    def test_login_success_and_me(self) -> None:
        body = api_login(self.client).json()
        self.assertEqual(body["code"], 0)
        self.assertEqual(body["data"]["username"], "admin")
        self.assertEqual(body["data"]["role"], 9)
        self.assertEqual(body["data"]["role_text"], "系统管理员")

        me = self.client.get("/api/v1/auth/me").json()
        self.assertEqual(me["code"], 0)
        self.assertEqual(me["data"]["username"], "admin")

    def test_login_wrong_password(self) -> None:
        body = api_login(self.client, password="bad").json()
        self.assertEqual(body["code"], 20008)
        self.assertEqual(body["msg"], "账号或密码错误")
        self.assertTrue(OperationLog.objects.filter(module="认证", action="登录失败").exists())

    def test_login_disabled_account(self) -> None:
        make_user("blocked", password="admin123", role=9, status=0)
        body = api_login(self.client, "blocked", "admin123").json()
        self.assertEqual(body["code"], 20006)

    def test_login_missing_field(self) -> None:
        response = self.client.post(
            LOGIN_URL, data=json.dumps({"username": "admin"}), content_type="application/json"
        )
        self.assertEqual(response.json()["code"], 10001)

    def test_login_rate_limited(self) -> None:
        for _ in range(5):
            api_login(self.client, password="bad")
        body = api_login(self.client).json()
        self.assertEqual(body["code"], 40001)
        self.assertIn("尝试次数过多", body["msg"])
        self.assertEqual(self.client.get("/api/v1/auth/me").json()["code"], 20001)

    def test_login_resets_failure_counter(self) -> None:
        key = FAIL_KEY_TEMPLATE.format(username="admin", ip="127.0.0.1")
        api_login(self.client, password="bad")
        self.assertEqual(cache.get(key), 1)
        api_login(self.client)
        self.assertIsNone(cache.get(key))

    def test_logout_api(self) -> None:
        api_login(self.client)
        body = self.client.post("/api/v1/auth/logout").json()
        self.assertEqual(body["code"], 0)
        self.assertEqual(self.client.get("/api/v1/auth/me").json()["code"], 20001)

    def test_non_admin_forbidden(self) -> None:
        make_user("team_user", password="team123", role=3)
        api_login(self.client, "team_user", "team123")
        self.assertEqual(self.client.get("/api/v1/auth/me").json()["code"], 20005)

    def test_login_log_params_masked(self) -> None:
        api_login(self.client, password="secret-pass")
        log = OperationLog.objects.filter(action="登录失败").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.params.get("password", "***"), "***")
        self.assertNotIn("secret-pass", str(log.params))

    def test_csrf_required_for_write_api(self) -> None:
        strict = Client(enforce_csrf_checks=True)
        response = strict.post(
            LOGIN_URL,
            data=json.dumps({"username": "admin", "password": "admin123"}),
            content_type="application/json",
        )
        self.assertEqual(response.json()["code"], 20005)
