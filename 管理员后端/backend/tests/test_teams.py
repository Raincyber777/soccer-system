# -*- coding: utf-8 -*-
"""Phase 3 球队域测试：筛选组合、统计、脱敏、重置密码、修改、权限、N+1。"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from django.core.cache import cache
from django.db import connection
from django.test import Client, TestCase
from django.test.utils import CaptureQueriesContext

from apps.accounts.models import User
from apps.core.models import Region
from apps.oplogs.models import OperationLog
from apps.teams.models import Match, Team, TeamCoach, TeamMember
from common import crypto


class TeamFixture(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.chengdu = Region.objects.create(name="成都市", level=2, code="510100", sort=1)
        self.mianyang = Region.objects.create(name="绵阳市", level=2, code="510700", sort=2)
        self.team_a = Team.objects.create(name="成都七中", region=self.chengdu, category=2, org_name="成都七中")
        self.team_b = Team.objects.create(name="绵阳南山中学", region=self.mianyang, category=2)
        self.team_c = Team.objects.create(name="四川大学", region=self.chengdu, category=1)

        for index in range(3):
            id_card = f"51010120090312{index:03d}0"
            TeamMember.objects.create(
                team=self.team_a, name=f"成员{index}", gender=1,
                id_card=crypto.encrypt_text(id_card),
                id_card_hash=crypto.id_card_hash(id_card),
                birth_date=date(2009, 3, 12), jersey_no=index + 1, position="前锋",
                phone=crypto.encrypt_text("13800001111"),
            )
        TeamCoach.objects.create(
            team=self.team_a, name="王教练", gender=1, cert_level=2, audit_status=1,
            phone=crypto.encrypt_text("13900002222"),
            id_card=crypto.encrypt_text("510101198503121234"),
        )
        Match.objects.create(
            event_id=1, round="小组赛第 1 轮", home_team=self.team_a, away_team=self.team_b,
            home_score=2, away_score=1, status=3, match_time=datetime(2026, 10, 12, 15, 30),
        )
        Match.objects.create(
            event_id=1, round="小组赛第 2 轮", home_team=self.team_b, away_team=self.team_a,
            home_score=None, away_score=None, status=1, match_time=datetime(2026, 10, 30, 10, 0),
        )

        self.admin = User.objects.create_user("admin", "admin123", role=9, status=1, real_name="系统管理员")
        User.objects.create_user("team_cd7", "team123", role=3, status=1, org_id=self.team_a.id)
        self.client = Client()
        self.client.post("/api/v1/auth/login", data={"username": "admin", "password": "admin123"}, content_type="application/json")


class TeamListTests(TeamFixture):
    def test_list_all(self) -> None:
        body = self.client.get("/api/v1/teams").json()
        self.assertEqual(body["code"], 0)
        self.assertEqual(body["data"]["total"], 3)
        self.assertEqual(set(body["data"].keys()), {"list", "total", "pageNum", "pageSize"})

    def test_filter_by_region(self) -> None:
        body = self.client.get(f"/api/v1/teams?region_id={self.chengdu.id}").json()
        self.assertEqual(body["data"]["total"], 2)

    def test_filter_by_category(self) -> None:
        body = self.client.get("/api/v1/teams?category=2").json()
        self.assertEqual(body["data"]["total"], 2)
        self.assertTrue(all(row["category"] == 2 for row in body["data"]["list"]))

    def test_filter_by_keyword_prefix(self) -> None:
        body = self.client.get("/api/v1/teams?keyword=成都").json()
        self.assertEqual(body["data"]["total"], 1)
        self.assertEqual(body["data"]["list"][0]["name"], "成都七中")

    def test_combined_filters(self) -> None:
        body = self.client.get(
            f"/api/v1/teams?region_id={self.chengdu.id}&category=2&keyword=成都"
        ).json()
        self.assertEqual(body["data"]["total"], 1)

    def test_counts_and_text(self) -> None:
        row = self.client.get("/api/v1/teams?keyword=成都").json()["data"]["list"][0]
        self.assertEqual(row["member_count"], 3)
        self.assertEqual(row["coach_count"], 1)
        self.assertEqual(row["region_name"], "成都市")
        self.assertEqual(row["category_text"], "中学组")
        self.assertEqual(row["status_text"], "启用")
        self.assertEqual(row["created_at"][:2], "20")

    def test_no_n_plus_one(self) -> None:
        with CaptureQueriesContext(connection) as one:
            self.client.get("/api/v1/teams?pageSize=1")
        with CaptureQueriesContext(connection) as many:
            self.client.get("/api/v1/teams?pageSize=10")
        self.assertEqual(len(one), len(many), "列表查询次数不应随行数增长")

    def test_soft_deleted_team_excluded(self) -> None:
        from django.utils import timezone

        self.team_c.deleted_at = timezone.now()
        self.team_c.save(update_fields=["deleted_at"])
        body = self.client.get("/api/v1/teams").json()
        self.assertEqual(body["data"]["total"], 2)


class TeamDetailTests(TeamFixture):
    def test_detail_with_recent_matches(self) -> None:
        body = self.client.get(f"/api/v1/teams/{self.team_a.id}").json()
        self.assertEqual(body["code"], 0)
        data = body["data"]
        self.assertEqual(data["name"], "成都七中")
        self.assertEqual(data["match_count"], 2)
        self.assertEqual(len(data["recent_matches"]), 2)
        self.assertTrue(any(item["is_home"] for item in data["recent_matches"]))

    def test_detail_not_found(self) -> None:
        body = self.client.get("/api/v1/teams/999999").json()
        self.assertEqual(body["code"], 30001)

    def test_update_team_and_log(self) -> None:
        response = self.client.put(
            f"/api/v1/teams/{self.team_a.id}",
            data={"org_name": "成都市第七中学", "intro": "省级示范高中", "status": 1},
            content_type="application/json",
        )
        body = response.json()
        self.assertEqual(body["code"], 0)
        self.assertEqual(body["data"]["org_name"], "成都市第七中学")
        log = OperationLog.objects.filter(action="修改球队信息").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.params["team_id"], self.team_a.id)
        self.assertIn("before", log.params)

    def test_update_rejects_bad_region(self) -> None:
        province = Region.objects.create(name="四川省", level=1, code="510000", sort=0)
        response = self.client.put(
            f"/api/v1/teams/{self.team_a.id}",
            data={"region_id": province.id},
            content_type="application/json",
        )
        self.assertEqual(response.json()["code"], 10001)

    def test_update_requires_at_least_one_field(self) -> None:
        response = self.client.put(
            f"/api/v1/teams/{self.team_a.id}", data={}, content_type="application/json"
        )
        self.assertEqual(response.json()["code"], 10001)


class TeamPasswordTests(TeamFixture):
    def test_reset_password_returns_once_and_works(self) -> None:
        response = self.client.put(
            f"/api/v1/teams/{self.team_a.id}/reset-password",
            data={"password": ""},
            content_type="application/json",
        )
        body = response.json()
        self.assertEqual(body["code"], 0)
        temp = body["data"]["temp_password"]
        self.assertEqual(len(temp), 12)
        self.assertEqual(body["data"]["username"], "team_cd7")
        self.assertRegex(temp, r"[A-Z]")
        self.assertRegex(temp, r"[a-z]")
        self.assertRegex(temp, r"[0-9]")
        self.assertRegex(temp, r"[#$%&*@!]")

        fresh = Client()
        self.assertEqual(fresh.post("/api/v1/auth/login", data={"username": "team_cd7", "password": temp}, content_type="application/json").json()["code"], 0)

    def test_reset_password_log_is_masked(self) -> None:
        self.client.put(
            f"/api/v1/teams/{self.team_a.id}/reset-password",
            data={"password": ""},
            content_type="application/json",
        )
        log = OperationLog.objects.filter(action="重置球队密码").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.params["password"], "***")
        self.assertNotIn("team123", str(log.params))

    def test_reset_password_team_without_account(self) -> None:
        response = self.client.put(
            f"/api/v1/teams/{self.team_c.id}/reset-password",
            data={"password": ""},
            content_type="application/json",
        )
        self.assertEqual(response.json()["code"], 30001)


class TeamSubResourceTests(TeamFixture):
    def test_members_masked(self) -> None:
        body = self.client.get(f"/api/v1/teams/{self.team_a.id}/members").json()
        self.assertEqual(body["data"]["total"], 3)
        row = body["data"]["list"][0]
        self.assertIn("*", row["id_card_masked"])
        self.assertNotIn("510101200903120", str(body))

    def test_coaches_masked(self) -> None:
        body = self.client.get(f"/api/v1/teams/{self.team_a.id}/coaches").json()
        self.assertEqual(body["data"]["total"], 1)
        row = body["data"]["list"][0]
        self.assertEqual(row["phone_masked"], "139****2222")
        self.assertIn("*", row["id_card_masked"])
        self.assertEqual(row["cert_level_text"], "B 级")

    def test_matches_for_away_team(self) -> None:
        body = self.client.get(f"/api/v1/teams/{self.team_b.id}/matches").json()
        rows = body["data"]["list"]
        self.assertEqual(len(rows), 2)
        finished = [item for item in rows if item["status"] == 3][0]
        self.assertFalse(finished["is_home"])
        self.assertEqual(finished["result_text"], "负")
        upcoming = [item for item in rows if item["status"] == 1][0]
        self.assertEqual(upcoming["result_text"], "")

    def test_sub_resource_of_missing_team(self) -> None:
        self.assertEqual(self.client.get("/api/v1/teams/999999/members").json()["code"], 30001)


class TeamPermissionTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.region = Region.objects.create(name="成都市", level=2, code="510100", sort=1)
        self.team = Team.objects.create(name="成都七中", region=self.region, category=2)
        User.objects.create_user("admin", "admin123", role=9, status=1)
        User.objects.create_user("team_user", "team123", role=3, status=1)

    def test_anonymous_401(self) -> None:
        self.assertEqual(Client().get("/api/v1/teams").json()["code"], 20001)

    def test_non_admin_forbidden(self) -> None:
        client = Client()
        client.post("/api/v1/auth/login", data={"username": "team_user", "password": "team123"}, content_type="application/json")
        self.assertEqual(client.get("/api/v1/teams").json()["code"], 20005)


