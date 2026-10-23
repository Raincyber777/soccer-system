# -*- coding: utf-8 -*-
"""teams 服务：球队查询/维护、密码重置、成员/教练/比赛（PLAN 6.1 / 6.2）。"""
from __future__ import annotations

import secrets
import string
from typing import Any, Dict, Optional, Tuple

from django.db import transaction
from django.db.models import Count, Q

from apps.core.models import Region
from apps.oplogs.services import log_operation
from apps.teams.models import Match, Team, TeamCoach, TeamMember
from apps.teams.serializers import coach_row, match_row, member_row, team_detail_row, team_row
from common.codes import ResponseCode
from common.dicts import ACTION_TEAM_RESET_PASSWORD, ACTION_TEAM_UPDATE, MODULE_TEAM
from common.exceptions import BusinessException
from common.pagination import paginate
from common.serializers import page_payload

TEAM_UPDATE_FIELDS = ("name", "region_id", "category", "org_name", "intro", "status")


def _annotated_queryset():
    """球队统计列：成员数/教练数一次聚合，禁止逐行查询（PLAN 9.1）。"""
    return Team.objects.select_related("region").annotate(
        member_count=Count("members", filter=Q(members__deleted_at__isnull=True), distinct=True),
        coach_count=Count("coaches", filter=Q(coaches__deleted_at__isnull=True), distinct=True),
    )


def get_team_or_raise(team_id: int) -> Team:
    team = _annotated_queryset().filter(pk=team_id).first()
    if team is None:
        raise BusinessException(ResponseCode.DATA_NOT_FOUND, "球队不存在")
    return team


def list_teams(filters: Dict[str, Any], page_num: int, page_size: int) -> Dict[str, Any]:
    queryset = _annotated_queryset()
    region_id = filters.get("region_id")
    category = filters.get("category")
    keyword = (filters.get("keyword") or "").strip()
    if region_id:
        queryset = queryset.filter(region_id=region_id)
    if category:
        queryset = queryset.filter(category=category)
    if keyword:
        queryset = queryset.filter(name__istartswith=keyword)  # 禁止前置 %（PLAN 4.1）
    rows, total = paginate(queryset.order_by("-created_at", "-id"), page_num, page_size)
    return page_payload([team_row(team) for team in rows], total, page_num, page_size)


def get_team_detail(team_id: int) -> Dict[str, Any]:
    team = get_team_or_raise(team_id)
    matches = Match.objects.filter(Q(home_team_id=team_id) | Q(away_team_id=team_id))
    match_count = matches.count()
    recent = list(
        matches.select_related("home_team", "away_team").order_by("-match_time", "-id")[:3]
    )
    return team_detail_row(team, recent, match_count)


def update_team(team_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    """维护球队基础信息：只允许 name/region_id/category/org_name/intro/status。"""
    changes = {key: value for key, value in payload.items() if key in TEAM_UPDATE_FIELDS and value is not None}
    if not changes:
        raise BusinessException(ResponseCode.PARAM_ERROR, "至少需要修改一个字段")

    team = Team.objects.filter(pk=team_id).first()
    if team is None:
        raise BusinessException(ResponseCode.DATA_NOT_FOUND, "球队不存在")

    if "region_id" in changes:
        if not Region.objects.filter(pk=changes["region_id"], level=2, status=1).exists():
            raise BusinessException(ResponseCode.PARAM_ERROR, "市州不存在")

    before = {key: getattr(team, key) for key in changes}

    with transaction.atomic():
        for key, value in changes.items():
            setattr(team, key, value)
        team.save(update_fields=list(changes.keys()) + ["updated_at"])
        log_operation(
            MODULE_TEAM,
            ACTION_TEAM_UPDATE,
            {"team_id": team.id, "before": before, "after": changes},
        )

    return get_team_detail(team_id)


def generate_temp_password(length: int = 12) -> str:
    """生成含大小写、数字、符号的临时密码。"""
    digits = secrets.choice(string.digits)
    upper = secrets.choice(string.ascii_uppercase)
    lower = secrets.choice(string.ascii_lowercase)
    symbol = secrets.choice("#$%&*@!")
    alphabet = string.ascii_letters + string.digits + "#$%&*@!"
    rest = [secrets.choice(alphabet) for _ in range(max(0, length - 4))]
    chars = [digits, upper, lower, symbol] + rest
    secrets.SystemRandom().shuffle(chars)
    return "".join(chars)


def reset_team_password(team_id: int, password: Optional[str] = None) -> Dict[str, Any]:
    """重置球队账号密码：临时密码只返回一次（PLAN 5.4.2）。"""
    from apps.accounts.models import User

    team = Team.objects.filter(pk=team_id).first()
    if team is None:
        raise BusinessException(ResponseCode.DATA_NOT_FOUND, "球队不存在")

    account = User.objects.filter(role=3, org_id=team.id).first()
    if account is None:
        raise BusinessException(ResponseCode.DATA_NOT_FOUND, "球队账号不存在")

    temp_password = (password or "").strip() or generate_temp_password()

    with transaction.atomic():
        account.set_password(temp_password)
        account.save(update_fields=["password", "updated_at"])
        log_operation(
            MODULE_TEAM,
            ACTION_TEAM_RESET_PASSWORD,
            {"team_id": team.id, "username": account.username, "password": temp_password},
        )

    return {
        "team_id": team.id,
        "username": account.username,
        "temp_password": temp_password,
    }


def _ensure_team_exists(team_id: int) -> None:
    if not Team.objects.filter(pk=team_id).exists():
        raise BusinessException(ResponseCode.DATA_NOT_FOUND, "球队不存在")


def list_members(team_id: int, page_num: int, page_size: int) -> Dict[str, Any]:
    _ensure_team_exists(team_id)
    queryset = TeamMember.objects.filter(team_id=team_id).order_by("id")
    rows, total = paginate(queryset, page_num, page_size)
    return page_payload([member_row(item) for item in rows], total, page_num, page_size)


def list_coaches(team_id: int, page_num: int, page_size: int) -> Dict[str, Any]:
    _ensure_team_exists(team_id)
    queryset = TeamCoach.objects.filter(team_id=team_id).order_by("id")
    rows, total = paginate(queryset, page_num, page_size)
    return page_payload([coach_row(item) for item in rows], total, page_num, page_size)


def list_team_matches(team_id: int, page_num: int, page_size: int) -> Dict[str, Any]:
    _ensure_team_exists(team_id)
    queryset = (
        Match.objects.filter(Q(home_team_id=team_id) | Q(away_team_id=team_id))
        .select_related("home_team", "away_team")
        .order_by("-match_time", "-id")
    )
    rows, total = paginate(queryset, page_num, page_size)
    return page_payload([match_row(item, team_id) for item in rows], total, page_num, page_size)
