# -*- coding: utf-8 -*-
"""Phase 3 球员档案测试：身份证精确检索、队伍筛选、均分回填、详情、权限。"""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.core.cache import cache
from django.test import Client, TestCase

from apps.accounts.models import User
from apps.core.models import Region
from apps.players.models import Player
from apps.selection.models import Event, SelectionScore
from apps.teams.models import Team
from common import crypto

TARGET_ID_CARD = "510101200903121234"


class PlayerFixture(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.region = Region.objects.create(name="成都市", level=2, code="510100", sort=1)
        self.team_a = Team.objects.create(name="成都七中", region=self.region, category=2)
        self.team_b = Team.objects.create(name="绵阳南山中学", region=self.region, category=2)
        self.event = Event.objects.create(name="2026 中学组", year=2026, category=2)

        self.player_a = Player.objects.create(
            name="王强", gender=1, team=self.team_a, category=2, region_id=self.region.id,
            school_name="成都七中", publicity_status=1,
            id_card=crypto.encrypt_text(TARGET_ID_CARD),
            id_card_hash=crypto.id_card_hash(TARGET_ID_CARD),
            birth_date=date(2009, 3, 12),
        )
        self.player_b = Player.objects.create(
            name="李昊", gender=1, team=self.team_a, category=2, school_name="成都七中",
            id_card=crypto.encrypt_text("510101200903125678"),
            id_card_hash=crypto.id_card_hash("510101200903125678"),
        )
        self.player_c = Player.objects.create(
            name="赵梓轩", gender=1, team=self.team_b, category=2, school_name="绵阳南山中学",
        )

        self.admin = User.objects.create_user("admin", "admin123", role=9, status=1, real_name="系统管理员")
        for judge_index, total in ((0, Decimal("88.50")), (1, Decimal("90.50"))):
            SelectionScore.objects.create(
                event=self.event, player=self.player_a, team=self.team_a, category=2, stage=1,
                judge=self.admin, judge_name="系统管理员",
                physical_score=Decimal("18.0"), technical_score=Decimal("17.5"),
                tactical_score=Decimal("17.0"), mental_score=Decimal("18.0"),
                potential_score=Decimal("18.0"), total_score=total,
            )
            break
        SelectionScore.objects.create(
            event=self.event, player=self.player_a, team=self.team_a, category=2, stage=2,
            judge=self.admin, judge_name="系统管理员",
            physical_score=Decimal("19.0"), technical_score=Decimal("18.5"),
            tactical_score=Decimal("18.0"), mental_score=Decimal("19.0"),
            potential_score=Decimal("18.5"), total_score=Decimal("93.00"),
        )
        self.client = Client()
        self.client.post("/api/v1/auth/login", data={"username": "admin", "password": "admin123"}, content_type="application/json")


class PlayerListTests(PlayerFixture):
    def test_list_shape(self) -> None:
        body = self.client.get("/api/v1/players").json()
        self.assertEqual(body["code"], 0)
        self.assertEqual(body["data"]["total"], 3)
        row = [item for item in body["data"]["list"] if item["id"] == self.player_a.id][0]
        self.assertIn("*", row["id_card_masked"])
        self.assertEqual(row["team_name"], "成都七中")
        self.assertEqual(row["category_text"], "中学组")
        self.assertEqual(row["publicity_status_text"], "公示中")

    def test_id_card_exact_hit(self) -> None:
        body = self.client.get(f"/api/v1/players?id_card={TARGET_ID_CARD}").json()
        self.assertEqual(body["data"]["total"], 1)
        self.assertEqual(body["data"]["list"][0]["name"], "王强")
        self.assertNotIn(TARGET_ID_CARD, str(body))

    def test_id_card_miss(self) -> None:
        body = self.client.get("/api/v1/players?id_card=510101200903129999").json()
        self.assertEqual(body["data"]["total"], 0)

    def test_id_card_bad_format(self) -> None:
        body = self.client.get("/api/v1/players?id_card=123").json()
        self.assertEqual(body["code"], 10001)

    def test_filter_by_team(self) -> None:
        body = self.client.get(f"/api/v1/players?team_id={self.team_b.id}").json()
        self.assertEqual(body["data"]["total"], 1)
        self.assertEqual(body["data"]["list"][0]["name"], "赵梓轩")

    def test_filter_by_keyword(self) -> None:
        body = self.client.get("/api/v1/players?keyword=王").json()
        self.assertEqual(body["data"]["total"], 1)

    def test_average_scores_filled(self) -> None:
        body = self.client.get("/api/v1/players").json()
        row = [item for item in body["data"]["list"] if item["id"] == self.player_a.id][0]
        self.assertEqual(row["initial_avg_score"], 88.5)
        self.assertEqual(row["final_avg_score"], 93.0)
        other = [item for item in body["data"]["list"] if item["id"] == self.player_c.id][0]
        self.assertIsNone(other["initial_avg_score"])
        self.assertIsNone(other["final_avg_score"])


class PlayerDetailTests(PlayerFixture):
    def test_detail_groups_scores(self) -> None:
        body = self.client.get(f"/api/v1/players/{self.player_a.id}").json()
        self.assertEqual(body["code"], 0)
        data = body["data"]
        self.assertEqual(len(data["scores"]["initial"]), 1)
        self.assertEqual(len(data["scores"]["final"]), 1)
        self.assertEqual(data["scores"]["final"][0]["total_score"], 93.0)
        self.assertEqual(data["scores"]["initial"][0]["judge_name"], "系统管理员")

    def test_detail_not_found(self) -> None:
        self.assertEqual(self.client.get("/api/v1/players/999999").json()["code"], 30001)

class PlayerPermissionTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        User.objects.create_user("admin", "admin123", role=9, status=1)
        User.objects.create_user("team_user", "team123", role=3, status=1)

    def test_anonymous(self) -> None:
        self.assertEqual(Client().get("/api/v1/players").json()["code"], 20001)

    def test_non_admin(self) -> None:
        client = Client()
        client.post("/api/v1/auth/login", data={"username": "team_user", "password": "team123"}, content_type="application/json")
        self.assertEqual(client.get("/api/v1/players").json()["code"], 20005)
