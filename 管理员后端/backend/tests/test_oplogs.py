# -*- coding: utf-8 -*-
"""Phase 5 日志域测试：列表筛选、详情脱敏、只读、权限。"""
from __future__ import annotations

from datetime import datetime, timedelta

from django.core.cache import cache
from django.test import Client, TestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.oplogs.models import OperationLog
from apps.oplogs.services import log_operation
from common.trace import set_trace_id

TRACE_A = "a" * 32
TRACE_B = "b" * 32


class LogFixture(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.admin = User.objects.create_user("admin", "admin123", role=9, status=1, real_name="系统管理员")
        User.objects.create_user("team_user", "team123", role=3, status=1)

        self.log_a = OperationLog.objects.create(
            user_id=self.admin.id, username="admin", role=9, module="认证", action="登录",
            method="POST", path="/login", ip="127.0.0.1", params={"username": "admin"},
            result_code=0, duration_ms=190, trace_id=TRACE_A,
        )
        self.log_b = OperationLog.objects.create(
            user_id=self.admin.id, username="admin", role=9, module="遴选管理", action="新增评分",
            method="POST", path="/api/v1/selection-scores",
            params={"player_id": 1, "password": "***"}, result_code=0, duration_ms=12, trace_id=TRACE_B,
        )
        self.log_c = OperationLog.objects.create(
            user_id=999, username="judge_a", role=9, module="参赛管理", action="重置球队密码",
            method="PUT", path="/api/v1/teams/1/reset-password",
            params={"username": "team_cd7", "password": "***"}, result_code=0, duration_ms=30,
        )
        # 拉开时间，便于日期筛选
        OperationLog.objects.filter(pk=self.log_a.pk).update(created_at=timezone.now() - timedelta(days=10))
        OperationLog.objects.filter(pk=self.log_b.pk).update(created_at=timezone.now() - timedelta(days=2))
        OperationLog.objects.filter(pk=self.log_c.pk).update(created_at=timezone.now())

        self.client = Client()
        self.client.post("/api/v1/auth/login", data={"username": "admin", "password": "admin123"}, content_type="application/json")
        # 登录本身会写一条「认证/登录」日志，清掉以保证各用例计数确定
        OperationLog.objects.exclude(pk=self.log_a.pk).filter(action="登录").delete()


class LogListTests(LogFixture):
    def test_list_shape_and_no_params(self) -> None:
        body = self.client.get("/api/v1/operation-logs").json()
        self.assertEqual(body["code"], 0)
        self.assertGreaterEqual(body["data"]["total"], 3)
        row = body["data"]["list"][0]
        self.assertNotIn("params", row, "列表不返回 params 大字段")
        self.assertEqual(set(row.keys()), {
            "id", "created_at", "user_id", "username", "role", "role_text", "module",
            "action", "method", "path", "ip", "result_code", "duration_ms", "trace_id",
        })

    def test_ordering_desc(self) -> None:
        body = self.client.get("/api/v1/operation-logs?pageSize=100").json()
        times = [row["created_at"] for row in body["data"]["list"]]
        self.assertEqual(times, sorted(times, reverse=True))

    def test_filter_module(self) -> None:
        body = self.client.get("/api/v1/operation-logs?module=认证").json()
        self.assertEqual(body["data"]["total"], 1)
        self.assertEqual(body["data"]["list"][0]["action"], "登录")

    def test_filter_action(self) -> None:
        body = self.client.get("/api/v1/operation-logs?action=新增评分").json()
        self.assertEqual(body["data"]["total"], 1)

    def test_filter_user_id(self) -> None:
        body = self.client.get("/api/v1/operation-logs?user_id=999").json()
        self.assertEqual(body["data"]["total"], 1)
        self.assertEqual(body["data"]["list"][0]["username"], "judge_a")

    def test_keyword_username(self) -> None:
        body = self.client.get("/api/v1/operation-logs?keyword=judge").json()
        self.assertEqual(body["data"]["total"], 1)

    def test_keyword_trace_id_exact(self) -> None:
        body = self.client.get(f"/api/v1/operation-logs?keyword={TRACE_A}").json()
        self.assertEqual(body["data"]["total"], 1)
        self.assertEqual(body["data"]["list"][0]["trace_id"], TRACE_A)

    def test_date_range(self) -> None:
        today = timezone.now().date()
        start = (today - timedelta(days=3)).strftime("%Y-%m-%d")
        body = self.client.get(f"/api/v1/operation-logs?start_date={start}").json()
        self.assertEqual(body["data"]["total"], 2)

        end = (today - timedelta(days=5)).strftime("%Y-%m-%d")
        body = self.client.get(f"/api/v1/operation-logs?end_date={end}").json()
        self.assertEqual(body["data"]["total"], 1)

    def test_bad_date_format(self) -> None:
        body = self.client.get("/api/v1/operation-logs?start_date=not-a-date").json()
        self.assertEqual(body["code"], 10001)


class LogDetailTests(LogFixture):
    def test_detail_returns_params(self) -> None:
        body = self.client.get(f"/api/v1/operation-logs/{self.log_b.id}").json()
        self.assertEqual(body["code"], 0)
        self.assertIn("params", body["data"])
        self.assertEqual(body["data"]["params"]["password"], "***")

    def test_detail_not_found(self) -> None:
        body = self.client.get("/api/v1/operation-logs/999999").json()
        self.assertEqual(body["code"], 30001)

    def test_delete_not_allowed(self) -> None:
        response = self.client.delete(f"/api/v1/operation-logs/{self.log_b.id}")
        self.assertEqual(response.status_code, 405)
        self.assertTrue(OperationLog.objects.filter(pk=self.log_b.pk).exists())

    def test_post_not_allowed(self) -> None:
        response = self.client.post("/api/v1/operation-logs", data={}, content_type="application/json")
        self.assertEqual(response.status_code, 405)


class LogWriteSanitizeTests(TestCase):
    def test_log_operation_masks_sensitive(self) -> None:
        cache.clear()
        admin = User.objects.create_user("admin", "admin123", role=9, status=1)
        set_trace_id(TRACE_A)
        log = log_operation(
            "参赛管理", "重置球队密码",
            {"team_id": 3, "username": "team_cd7", "password": "Tmp#8f2Kq1z", "id_card": "510101200903121234"},
            user=admin,
        )
        self.assertEqual(log.params["password"], "***")
        self.assertEqual(log.params["id_card"], "***")
        self.assertEqual(log.params["username"], "team_cd7")
        self.assertEqual(log.trace_id, TRACE_A)
        self.assertNotIn("Tmp#8f2Kq1z", str(log.params))


class LogPermissionTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        User.objects.create_user("admin", "admin123", role=9, status=1)
        User.objects.create_user("team_user", "team123", role=3, status=1)

    def test_anonymous(self) -> None:
        self.assertEqual(Client().get("/api/v1/operation-logs").json()["code"], 20001)

    def test_non_admin(self) -> None:
        client = Client()
        client.post("/api/v1/auth/login", data={"username": "team_user", "password": "team123"}, content_type="application/json")
        self.assertEqual(client.get("/api/v1/operation-logs").json()["code"], 20005)


