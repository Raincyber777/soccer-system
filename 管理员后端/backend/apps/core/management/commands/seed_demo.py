# -*- coding: utf-8 -*-
"""演示数据种子命令（PLAN 4.4）：幂等，可重复执行不重复插入。

用法：python manage.py seed_demo
"""
from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db.models import Avg

from apps.accounts.models import User
from apps.core.models import Dict, Region
from apps.core.services import refresh_cache
from apps.oplogs.models import OperationLog
from apps.players.models import Player
from apps.selection.models import Event, SelectionResult, SelectionScore
from apps.teams.models import Match, Team, TeamCoach, TeamMember
from common import crypto
from common.dicts import CATEGORY_TEXT, MODULE_AUTH, MODULE_LOG, MODULE_SELECTION, MODULE_TEAM

ADMIN_PASSWORD = "admin123"
TEAM_PASSWORD = "team123"

REGION_ROWS = [
    ("510000", "四川省", 1, None, 1),
    ("510100", "成都市", 2, "510000", 2),
    ("510700", "绵阳市", 2, "510000", 3),
    ("510600", "德阳市", 2, "510000", 4),
    ("511500", "宜宾市", 2, "510000", 5),
    ("511300", "南充市", 2, "510000", 6),
]

DICT_ROWS = [
    ("category", "高校组", "1", 1), ("category", "中学组", "2", 2), ("category", "小学组", "3", 3),
    ("stage", "初选", "1", 1), ("stage", "复选", "2", 2),
    ("publicity_status", "未公示", "0", 1), ("publicity_status", "公示中", "1", 2),
    ("publicity_status", "取消公示", "2", 3),
    ("audit_status", "待审核", "0", 1), ("audit_status", "通过", "1", 2), ("audit_status", "驳回", "2", 3),
    ("match_status", "未开始", "1", 1), ("match_status", "进行中", "2", 2), ("match_status", "已结束", "3", 3),
    ("event_status", "未开始", "1", 1), ("event_status", "报名中", "2", 2),
    ("event_status", "比赛中", "3", 3), ("event_status", "已结束", "4", 4),
    ("cert_level", "A 级", "1", 1), ("cert_level", "B 级", "2", 2),
    ("cert_level", "C 级", "3", 3), ("cert_level", "D 级", "4", 4),
    ("gender", "男", "1", 1), ("gender", "女", "2", 2),
    ("team_status", "启用", "1", 1), ("team_status", "禁用", "0", 2),
    ("module", "认证", "认证", 1), ("module", "参赛管理", "参赛管理", 2),
    ("module", "遴选管理", "遴选管理", 3), ("module", "日志管理", "日志管理", 4),
]

TEAM_ROWS = [
    ("成都七中", "510100", 2, "成都七中"),
    ("绵阳南山中学", "510700", 2, "绵阳南山中学"),
    ("四川大学", "510100", 1, "四川大学"),
    ("电子科技大学", "510100", 1, "电子科技大学"),
    ("德阳实验小学", "510600", 3, "德阳实验小学"),
    ("宜宾中山街小学", "511500", 3, "宜宾中山街小学"),
]

TEAM_ACCOUNT_ROWS = [
    ("team_cd7", "成都七中"),
    ("team_mysc", "绵阳南山中学"),
    ("team_scu", "四川大学"),
    ("team_uestc", "电子科技大学"),
    ("team_dysy", "德阳实验小学"),
    ("team_ybzs", "宜宾中山街小学"),
]

MEMBER_NAMES = [
    "张伟", "李强", "王磊", "刘洋", "陈浩",
    "杨帆", "赵俊", "黄鑫", "周鹏", "吴迪",
    "徐亮", "孙杰", "马超", "朱峰", "胡斌",
    "郭明", "何伟", "高翔", "林涛", "罗宇",
    "梁晨", "宋阳", "郑凯", "谢东", "唐磊",
    "韩冰", "曹阳", "邓超", "冯磊", "蒋涛",
]

COACH_ROWS = [
    ("成都七中", "王建国", 1, 1, 2),
    ("成都七中", "李海峰", 1, 2, 1),
    ("绵阳南山中学", "张明远", 1, 1, 2),
    ("四川大学", "陈志强", 1, 1, 1),
    ("电子科技大学", "刘军", 1, 2, 0),
    ("德阳实验小学", "赵德海", 1, 3, 1),
    ("宜宾中山街小学", "孙立新", 1, 4, 2),
    ("绵阳南山中学", "周文彬", 1, 3, 1),
]

# (姓名, 球队, 出生日期年, 公示状态)
PLAYER_ROWS = [
    ("王强", "成都七中", 2009, 1), ("李昊", "成都七中", 2009, 0),
    ("张子豪", "成都七中", 2009, 0), ("陈奕辰", "成都七中", 2009, 1),
    ("赵梓轩", "绵阳南山中学", 2009, 0), ("刘一鸣", "绵阳南山中学", 2009, 1),
    ("孙浩然", "绵阳南山中学", 2009, 0), ("周子墨", "绵阳南山中学", 2009, 0),
    ("吴俊杰", "四川大学", 2006, 1), ("郑博文", "四川大学", 2006, 0),
    ("冯子健", "四川大学", 2006, 0), ("何嘉豪", "四川大学", 2006, 1),
    ("徐天宇", "电子科技大学", 2006, 0), ("马晨曦", "电子科技大学", 2006, 0),
    ("朱昱辰", "电子科技大学", 2006, 0), ("胡书豪", "电子科技大学", 2006, 0),
    ("郭沐阳", "德阳实验小学", 2014, 0), ("罗一诺", "德阳实验小学", 2014, 0),
    ("高子轩", "德阳实验小学", 2014, 1), ("林辰逸", "德阳实验小学", 2014, 0),
    ("黄子骞", "宜宾中山街小学", 2014, 0), ("谢明轩", "宜宾中山街小学", 2014, 0),
    ("唐雨泽", "宜宾中山街小学", 2014, 0), ("韩宇辰", "宜宾中山街小学", 2014, 0),
]

SEED_ACTIONS = [
    (MODULE_AUTH, "登录", "admin", "POST", "/login"),
    (MODULE_TEAM, "修改球队信息", "admin", "PUT", "/api/v1/teams/1"),
    (MODULE_TEAM, "重置球队密码", "admin", "PUT", "/api/v1/teams/1/reset-password"),
    (MODULE_SELECTION, "新增评分", "judge_a", "POST", "/api/v1/selection-scores"),
    (MODULE_SELECTION, "新增评分", "judge_b", "POST", "/api/v1/selection-scores"),
    (MODULE_SELECTION, "修改评分", "admin", "PUT", "/api/v1/selection-scores/1"),
    (MODULE_SELECTION, "导出评分", "admin", "GET", "/api/v1/selection-scores/export"),
    (MODULE_SELECTION, "生成最佳球员结果", "admin", "POST", "/api/v1/selection-results/generate"),
    (MODULE_LOG, "查询操作日志", "admin", "GET", "/api/v1/operation-logs"),
    (MODULE_AUTH, "退出登录", "admin", "POST", "/api/v1/auth/logout"),
    (MODULE_TEAM, "查看球队成员", "admin", "GET", "/api/v1/teams/1/members"),
    (MODULE_SELECTION, "查询评分汇总", "judge_a", "GET", "/api/v1/selection-scores/summary"),
]


def fake_id_card(seq: int, birth: str = "20090312") -> str:
    """生成 18 位格式合法的演示身份证号（非真实号码）。"""
    body = f"510101{birth}{seq:03d}"
    return body + "0123456789X"[seq % 11]


def fake_phone(seq: int) -> str:
    return f"138{seq:08d}"[:11]


class Command(BaseCommand):
    help = "生成演示数据（幂等：重复执行不会重复插入）"

    def handle(self, *args, **options):
        regions = self._seed_regions()
        self._seed_dicts()
        judges = self._seed_users()
        events = self._seed_events()
        teams = self._seed_teams(regions)
        self._seed_team_accounts(teams, regions)
        self._seed_members(teams)
        self._seed_coaches(teams)
        players = self._seed_players(teams, regions)
        self._seed_matches(teams, events)
        self._seed_scores(players, events, judges)
        self._seed_results(events, judges)
        self._seed_logs()
        refresh_cache()

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("演示数据生成完成（幂等）"))
        for model, label in (
            (Region, "行政区划"), (Dict, "字典"), (User, "账号"), (Event, "赛事"),
            (Team, "球队"), (TeamMember, "球队成员"), (TeamCoach, "教练员"),
            (Player, "球员档案"), (Match, "比赛"), (SelectionScore, "评分"),
            (SelectionResult, "最佳球员结果"), (OperationLog, "操作日志"),
        ):
            count = model.all_objects.count() if hasattr(model, "all_objects") else model.objects.count()
            self.stdout.write(f"  {label}: {count}")
        self.stdout.write("  演示账号：admin / admin123，judge_a、judge_b / admin123，球队账号 / team123")

    # -- 各域种子 ---------------------------------------------------------
    def _seed_regions(self):
        province = None
        regions = {}
        for code, name, level, parent_code, sort in REGION_ROWS:
            parent_id = regions[parent_code].id if parent_code else None
            region, _ = Region.objects.update_or_create(
                code=code,
                defaults={"name": name, "level": level, "parent_id": parent_id, "sort": sort, "status": 1},
            )
            regions[code] = region
            if level == 1:
                province = region
        self._province = province
        return regions

    def _seed_dicts(self):
        for dict_type, label, value, sort in DICT_ROWS:
            Dict.objects.update_or_create(
                dict_type=dict_type, value=value,
                defaults={"label": label, "sort": sort, "status": 1},
            )

    def _ensure_user(self, username, password, **fields):
        user, created = User.objects.get_or_create(username=username, defaults=fields)
        changed = created
        for key, value in fields.items():
            if getattr(user, key) != value:
                setattr(user, key, value)
                changed = True
        if not user.check_password(password):
            user.set_password(password)
            changed = True
        if changed:
            user.save()
        return user

    def _seed_users(self):
        admin = self._ensure_user(
            "admin", ADMIN_PASSWORD, real_name="系统管理员", role=9, status=1,
            phone=crypto.encrypt_text("13800000001"),
        )
        judge_a = self._ensure_user(
            "judge_a", ADMIN_PASSWORD, real_name="评委甲", role=9, status=1,
            phone=crypto.encrypt_text("13800000002"),
        )
        judge_b = self._ensure_user(
            "judge_b", ADMIN_PASSWORD, real_name="评委乙", role=9, status=1,
            phone=crypto.encrypt_text("13800000003"),
        )
        self._admin = admin
        return [admin, judge_a, judge_b]

    def _seed_events(self):
        events = {}
        status_map = {1: 3, 2: 3, 3: 2}
        for category in (1, 2, 3):
            event, _ = Event.objects.update_or_create(
                year=2026, category=category,
                defaults={
                    "name": f"2026 年四川省青少年校园足球联赛（{CATEGORY_TEXT[category]}）",
                    "status": status_map[category],
                    "register_start": datetime(2026, 9, 1, 9, 0, 0),
                    "register_end": datetime(2026, 9, 30, 18, 0, 0),
                },
            )
            events[category] = event
        return events

    def _seed_teams(self, regions):
        teams = {}
        for name, region_code, category, org_name in TEAM_ROWS:
            team, _ = Team.objects.update_or_create(
                name=name,
                defaults={
                    "region_id": regions[region_code].id,
                    "category": category,
                    "org_name": org_name,
                    "intro": f"{name}校园足球队",
                    "status": 1,
                    "created_by": 1,
                },
            )
            teams[name] = team
        return teams

    def _seed_team_accounts(self, teams, regions):
        for username, team_name in TEAM_ACCOUNT_ROWS:
            team = teams[team_name]
            self._ensure_user(
                username, TEAM_PASSWORD,
                real_name=f"{team_name}球队账号", role=3, status=1,
                org_id=team.id, region_id=team.region_id,
                phone=crypto.encrypt_text(fake_phone(team.id)),
            )

    def _seed_members(self, teams):
        team_names = [row[0] for row in TEAM_ROWS]
        for index, name in enumerate(MEMBER_NAMES):
            team = teams[team_names[index // 5]]
            id_card = fake_id_card(index + 1)
            TeamMember.objects.update_or_create(
                team=team, name=name,
                defaults={
                    "gender": 1 if index % 7 else 2,
                    "id_card": crypto.encrypt_text(id_card),
                    "id_card_hash": crypto.id_card_hash(id_card),
                    "birth_date": datetime(2009, (index % 12) + 1, (index % 28) + 1).date(),
                    "jersey_no": (index % 30) + 1,
                    "position": ["前锋", "中场", "后卫", "守门员"][index % 4],
                    "phone": crypto.encrypt_text(fake_phone(100 + index)),
                    "status": 1,
                },
            )

    def _seed_coaches(self, teams):
        for index, (team_name, name, gender, cert_level, audit_status) in enumerate(COACH_ROWS):
            id_card = fake_id_card(200 + index, birth="19850312")
            TeamCoach.objects.update_or_create(
                team=teams[team_name], name=name,
                defaults={
                    "gender": gender,
                    "id_card": crypto.encrypt_text(id_card),
                    "id_card_hash": crypto.id_card_hash(id_card),
                    "phone": crypto.encrypt_text(fake_phone(300 + index)),
                    "cert_level": cert_level,
                    "audit_status": audit_status,
                    "status": 1,
                },
            )

    def _seed_players(self, teams, regions):
        players = []
        for index, (name, team_name, birth_year, publicity) in enumerate(PLAYER_ROWS):
            team = teams[team_name]
            id_card = fake_id_card(500 + index, birth=f"{birth_year}0312")
            player, _ = Player.objects.update_or_create(
                team=team, name=name,
                defaults={
                    "gender": 1,
                    "id_card": crypto.encrypt_text(id_card),
                    "id_card_hash": crypto.id_card_hash(id_card),
                    "birth_date": datetime(birth_year, 3, 12).date(),
                    "region_id": team.region_id,
                    "school_name": team.org_name or team.name,
                    "category": team.category,
                    "publicity_status": publicity,
                    "status": 1,
                },
            )
            players.append(player)
        return players

    def _seed_matches(self, teams, events):
        now = datetime(2026, 10, 20, 15, 30, 0)
        rows = [
            ("成都七中", "绵阳南山中学", 2, "小组赛第 1 轮", 2, 1, 3, now - timedelta(days=10)),
            ("绵阳南山中学", "成都七中", 2, "小组赛第 2 轮", 1, 1, 3, now - timedelta(days=7)),
            ("成都七中", "绵阳南山中学", 2, "决赛", None, None, 1, now + timedelta(days=3)),
            ("四川大学", "电子科技大学", 1, "小组赛第 1 轮", 3, 2, 3, now - timedelta(days=9)),
            ("电子科技大学", "四川大学", 1, "小组赛第 2 轮", 0, 2, 3, now - timedelta(days=5)),
            ("四川大学", "电子科技大学", 1, "决赛", None, None, 1, now + timedelta(days=5)),
            ("德阳实验小学", "宜宾中山街小学", 3, "小组赛第 1 轮", 4, 1, 3, now - timedelta(days=8)),
            ("宜宾中山街小学", "德阳实验小学", 3, "小组赛第 2 轮", 2, 2, 3, now - timedelta(days=4)),
        ]
        for home, away, category, round_name, home_score, away_score, status, match_time in rows:
            Match.objects.update_or_create(
                event_id=events[category].id,
                home_team=teams[home],
                away_team=teams[away],
                round=round_name,
                defaults={
                    "home_score": home_score,
                    "away_score": away_score,
                    "status": status,
                    "match_time": match_time,
                    "referee_id": self._admin.id,
                },
            )

    def _score_values(self, player_index: int, stage: int, judge_index: int):
        base = Decimal("14.0") + Decimal((player_index * 3 + stage * 2 + judge_index) % 5)
        base += Decimal("1.0") * stage
        dims = [base + Decimal("0.5"), base, base - Decimal("0.5"), base + Decimal("1.0"), base]
        dims = [min(Decimal("20.0"), max(Decimal("0.0"), value)) for value in dims]
        return dims, sum(dims)

    def _seed_scores(self, players, events, judges):
        middle = [player for player in players if player.category == 2]
        university = [player for player in players if player.category == 1][:4]
        selected = middle + university
        for player_index, player in enumerate(selected):
            event = events[player.category]
            for stage in (1, 2):
                for judge_index, judge in enumerate(judges):
                    dims, total = self._score_values(player_index, stage, judge_index)
                    SelectionScore.objects.update_or_create(
                        event=event, player=player, stage=stage, judge=judge,
                        defaults={
                            "team_id": player.team_id,
                            "category": player.category,
                            "judge_name": judge.real_name or judge.username,
                            "physical_score": dims[0],
                            "technical_score": dims[1],
                            "tactical_score": dims[2],
                            "mental_score": dims[3],
                            "potential_score": dims[4],
                            "total_score": total,
                            "remark": "演示数据",
                            "version": 1,
                        },
                    )

    def _seed_results(self, events, judges):
        event = events[2]
        rows = list(
            SelectionScore.objects.filter(event=event, stage=2)
            .values("player_id", "team_id", "category")
            .annotate(avg_score=Avg("total_score"))
            .order_by("-avg_score", "player_id")[:5]
        )
        now = datetime(2026, 10, 22, 16, 0, 0)
        for index, row in enumerate(rows):
            SelectionResult.objects.update_or_create(
                event=event,
                player_id=row["player_id"],
                stage=2,
                category=row["category"],
                defaults={
                    "team_id": row["team_id"],
                    "total_score": round(row["avg_score"], 2),
                    "rank": index + 1,
                    "result": 1,
                    "result_type": 1,
                    "status": 1,
                    "generated_by": self._admin.id,
                    "generated_at": now,
                },
            )

    def _seed_logs(self):
        usernames = {user.username: user for user in User.objects.all()}
        base_time = datetime(2026, 10, 23, 9, 0, 0)
        for index, (module, action, username, method, path) in enumerate(SEED_ACTIONS):
            user = usernames.get(username) or self._admin
            OperationLog.objects.get_or_create(
                trace_id=f"seed{index:04d}" + "0" * 24,
                action=action,
                defaults={
                    "user_id": user.id,
                    "username": user.username,
                    "role": user.role,
                    "module": module,
                    "method": method,
                    "path": path,
                    "ip": "127.0.0.1",
                    "params": {"seed": True, "index": index, "password": "***"},
                    "result_code": 0,
                    "duration_ms": 20 + index,
                    "created_at": base_time + timedelta(minutes=index * 7),
                },
            )
