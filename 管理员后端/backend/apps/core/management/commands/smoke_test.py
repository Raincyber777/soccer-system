# -*- coding: utf-8 -*-
"""冒烟测试命令（纯 API）：使用 Django test Client 串行验证 21 个接口。

用法：
    python manage.py smoke_test               # 全部
    python manage.py smoke_test --scope auth  # 指定域：auth/teams/players/selection/logs
"""
from __future__ import annotations

import json
from typing import Any, List

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.test import Client
from django.test.utils import override_settings

LOGIN_URL = "/api/v1/auth/login"


class Command(BaseCommand):
    help = "端到端冒烟测试（登录 → 各域 JSON 接口），输出 PASS/FAIL"

    def add_arguments(self, parser) -> None:
        parser.add_argument("--scope", default="all", help="auth/teams/players/selection/logs/all")

    def handle(self, *args: Any, **options: Any) -> None:
        # 管理命令里的 Client 请求 Host 为 testserver，需临时放行
        allowed_hosts = list(settings.ALLOWED_HOSTS) + ["testserver"]
        with override_settings(ALLOWED_HOSTS=allowed_hosts):
            self._execute(options)

    def _execute(self, options: Any) -> None:
        self.client = Client()
        self.passed = 0
        self.failed = 0
        self.lines: List[str] = []

        scope = (options.get("scope") or "all").strip()
        runners = {
            "auth": self._scope_auth,
            "teams": self._scope_teams,
            "players": self._scope_players,
            "selection": self._scope_selection,
            "logs": self._scope_logs,
        }
        if scope != "all" and scope not in runners:
            raise CommandError(f"未知 scope: {scope}")

        order = ["auth", "teams", "players", "selection", "logs"] if scope == "all" else [scope]
        for name in order:
            runner = runners.get(name)
            if runner is None:
                continue
            self.stdout.write(self.style.MIGRATE_HEADING(f"== scope: {name} =="))
            runner()

        summary = f"PASS {self.passed} / FAIL {self.failed}"
        self.stdout.write("")
        if self.failed:
            self.stdout.write(self.style.ERROR(summary))
            raise CommandError(f"冒烟测试失败：{summary}")
        self.stdout.write(self.style.SUCCESS(summary))

    # -- 断言工具 ---------------------------------------------------------
    def _record(self, ok: bool, label: str, detail: str = "") -> None:
        if ok:
            self.passed += 1
            self.stdout.write(self.style.SUCCESS(f"  PASS  {label}"))
        else:
            self.failed += 1
            self.stdout.write(self.style.ERROR(f"  FAIL  {label}  {detail}"))

    def _json(self, response) -> dict:
        try:
            return json.loads(response.content.decode("utf-8"))
        except Exception:
            return {}

    def expect_code(self, response, code: int, label: str) -> None:
        body = self._json(response)
        self._record(body.get("code") == code, label, f"实际 code={body.get('code')} body={body}")

    def expect_true(self, value: bool, label: str, detail: str = "") -> None:
        self._record(bool(value), label, detail)

    def login(self, username: str = "admin", password: str = "admin123") -> bool:
        response = self.client.post(
            LOGIN_URL,
            data=json.dumps({"username": username, "password": password}),
            content_type="application/json",
        )
        return self._json(response).get("code") == 0

    def logout(self) -> None:
        self.client.post("/api/v1/auth/logout")

    def _login_or_skip(self, scope: str) -> bool:
        if self.login():
            self._record(True, "管理员登录成功")
            return True
        self._record(False, "管理员登录成功")
        self.logout()
        return False

    # -- 各域检查 ---------------------------------------------------------
    def _scope_auth(self) -> None:
        body = self._json(self.client.get("/api/v1/health"))
        self._record(body.get("code") == 0 and body["data"]["status"] == "ok", "GET /api/v1/health 返回 code=0")

        body = self._json(self.client.get("/api/v1/auth/csrf"))
        self._record(body.get("code") == 0 and bool(body["data"].get("csrf_token")), "GET /api/v1/auth/csrf 下发 token")

        self.expect_code(self.client.get("/api/v1/auth/me"), 20001, "未登录访问 /api/v1/auth/me 返回 20001")

        body = self._json(
            self.client.post(
                LOGIN_URL,
                data=json.dumps({"username": "admin", "password": "wrong-password"}),
                content_type="application/json",
            )
        )
        self._record(body.get("code") == 20008, "错误密码返回 20008", str(body)[:160])

        self.expect_true(self.login(), "admin/admin123 登录成功")
        body = self._json(self.client.get("/api/v1/auth/me"))
        self._record(body.get("code") == 0 and body.get("data", {}).get("role") == 9,
                     "登录后 /api/v1/auth/me 返回管理员信息", str(body)[:200])

        self.expect_code(self.client.post("/api/v1/auth/logout"), 0, "退出登录返回 code=0")
        self.expect_code(self.client.get("/api/v1/auth/me"), 20001, "退出后再次访问返回 20001")

    def _scope_teams(self) -> None:
        if not self._login_or_skip("teams"):
            return

        body = self._json(self.client.get("/api/v1/teams?pageSize=100"))
        self._record(body.get("code") == 0 and body.get("data", {}).get("total", 0) >= 6,
                     "球队列表 code=0 且总数 >= 6", str(body)[:200])
        teams = body.get("data", {}).get("list", [])
        team_id = teams[0]["id"] if teams else 0

        body = self._json(self.client.get("/api/v1/teams?category=2"))
        self._record(body.get("code") == 0 and all(r["category"] == 2 for r in body["data"]["list"]),
                     "球队按组别筛选")

        body = self._json(self.client.get("/api/v1/teams?keyword=成都"))
        self._record(body.get("code") == 0 and body["data"]["total"] >= 1, "球队按名称前缀搜索")

        body = self._json(self.client.get(f"/api/v1/teams/{team_id}"))
        self._record(body.get("code") == 0 and "recent_matches" in body["data"], "球队详情含最近比赛")

        self.expect_code(self.client.get(f"/api/v1/teams/{team_id}/members"), 0, "球队成员列表")
        self.expect_code(self.client.get(f"/api/v1/teams/{team_id}/coaches"), 0, "球队教练列表")
        self.expect_code(self.client.get(f"/api/v1/teams/{team_id}/matches"), 0, "球队比赛记录")

        body = self._json(
            self.client.put(
                f"/api/v1/teams/{team_id}",
                data=json.dumps({"intro": "冒烟测试写入"}),
                content_type="application/json",
            )
        )
        self._record(body.get("code") == 0, "PUT /api/v1/teams/{id} 维护基础信息")

        self.logout()

    def _scope_players(self) -> None:
        if not self._login_or_skip("players"):
            return

        body = self._json(self.client.get("/api/v1/players?pageSize=100"))
        players = body.get("data", {}).get("list", [])
        self._record(body.get("code") == 0 and len(players) >= 20, "球员档案列表 code=0 且 >= 20 条")
        self._record(any(row.get("initial_avg_score") is not None for row in players), "球员初选均分已回填")
        self._record(all("*" in row.get("id_card_masked", "") for row in players if row.get("id_card_masked")),
                     "身份证输出为掩码")

        if players:
            first = players[0]
            self.expect_code(self.client.get(f"/api/v1/players?team_id={first['team_id']}"), 0, "球员按队伍筛选")
            self.expect_code(self.client.get("/api/v1/players?keyword=" + first["name"][:1]), 0, "球员按姓名前缀搜索")
            self.expect_code(self.client.get(f"/api/v1/players/{first['id']}"), 0, f"球员详情 /players/{first['id']}")

        self.expect_code(self.client.get("/api/v1/players?id_card=123"), 10001, "身份证格式错误返回 10001")

        self.logout()

    def _scope_selection(self) -> None:
        if not self._login_or_skip("selection"):
            return

        events = []
        try:
            from apps.selection.models import Event

            events = list(Event.objects.all().order_by("category"))
        except Exception:
            pass
        self._record(bool(events), "存在赛事数据")
        if not events:
            self.logout()
            return

        middle = next((event for event in events if event.category == 2), events[0])
        event_id = middle.id

        body = self._json(self.client.get(f"/api/v1/selection-scores?event_id={event_id}&stage=1&pageSize=100"))
        scores = body.get("data", {}).get("list", [])
        self._record(body.get("code") == 0 and len(scores) >= 1, "评分列表 code=0")

        body = self._json(self.client.get(f"/api/v1/selection-scores/summary?event_id={event_id}&stage=2"))
        data = body.get("data", {})
        self._record(body.get("code") == 0 and data.get("total", 0) >= 1, "评分汇总 code=0 且有排名")
        ranks = [row["rank"] for row in data.get("list", [])]
        self._record(ranks == sorted(ranks) and (not ranks or ranks[0] == 1), "汇总名次从 1 开始且递增")

        response = self.client.get(f"/api/v1/selection-scores/export?event_id={event_id}&stage=2&format=xlsx")
        self._record(
            response.status_code == 200 and "spreadsheetml" in response.get("Content-Type", ""),
            "导出 xlsx 返回文件流",
            f"HTTP {response.status_code}",
        )

        self.expect_code(self.client.get(f"/api/v1/selection-results?event_id={event_id}&stage=2"), 0, "最佳球员结果列表")

        body = self._json(
            self.client.post(
                "/api/v1/selection-results/generate",
                data=json.dumps({"event_id": event_id, "stage": 2, "category": 2, "top_n": 5}),
                content_type="application/json",
            )
        )
        self._record(body.get("code") == 0 and body.get("data", {}).get("count") == 5,
                     "生成中学组 Top5 成功", str(body)[:200])

        body = self._json(self.client.get(f"/api/v1/selection-results?event_id={event_id}&stage=2&category=2"))
        self._record(body.get("code") == 0 and body.get("data", {}).get("total") == 5, "生成后结果列表为 5 条")

        # 乐观锁冲突：用过期 version 改一条评分
        if scores:
            target = scores[0]
            body = self._json(
                self.client.put(
                    f"/api/v1/selection-scores/{target['id']}",
                    data=json.dumps({
                        "physical_score": 10, "technical_score": 10, "tactical_score": 10,
                        "mental_score": 10, "potential_score": 10, "version": 999,
                    }),
                    content_type="application/json",
                )
            )
            self._record(body.get("code") == 30008, "旧 version 修改评分返回 30008", str(body)[:160])

        self.logout()

    def _scope_logs(self) -> None:
        if not self._login_or_skip("logs"):
            return

        body = self._json(self.client.get("/api/v1/operation-logs?pageSize=100"))
        logs = body.get("data", {}).get("list", [])
        self._record(body.get("code") == 0 and len(logs) >= 1, "操作日志列表 code=0")
        self._record(all("params" not in row for row in logs), "日志列表不返回 params 大字段")

        if logs:
            log_id = logs[0]["id"]
            body = self._json(self.client.get(f"/api/v1/operation-logs/{log_id}"))
            params = body.get("data", {}).get("params", {})
            self._record(body.get("code") == 0 and isinstance(params, dict), "日志详情包含 params")
            masked = all(
                value == "***"
                for key, value in params.items()
                if any(word in key.lower() for word in ("password", "id_card", "phone"))
            )
            self._record(masked, "日志详情敏感字段已脱敏")

        body = self._json(self.client.get("/api/v1/operation-logs?module=认证"))
        self._record(body.get("code") == 0 and body["data"]["total"] >= 1, "日志按模块筛选")

        self.logout()
