# -*- coding: utf-8 -*-
"""teams 输出序列化（PLAN 5.4.1–5.4.3）：只返回页面必要字段。"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from apps.teams.models import Match, Team, TeamCoach, TeamMember
from common.crypto import mask_stored_id_card, mask_stored_phone
from common.dicts import (
    AUDIT_STATUS_TEXT,
    CATEGORY_TEXT,
    CERT_LEVEL_TEXT,
    COACH_STATUS_TEXT,
    GENDER_TEXT,
    MATCH_STATUS_TEXT,
    MEMBER_STATUS_TEXT,
    TEAM_STATUS_TEXT,
    text_of,
)
from common.time import fmt_date, fmt_dt


def _region_name(team: Any) -> str:
    try:
        region = team.region
    except Exception:  # 逻辑外键可能悬空
        return ""
    return getattr(region, "name", "") or ""


def team_row(team: Team) -> Dict[str, Any]:
    return {
        "id": team.id,
        "name": team.name,
        "org_name": team.org_name or "",
        "region_id": team.region_id,
        "region_name": _region_name(team),
        "category": team.category,
        "category_text": text_of(CATEGORY_TEXT, team.category),
        "logo_url": team.logo_url or "",
        "member_count": getattr(team, "member_count", 0) or 0,
        "coach_count": getattr(team, "coach_count", 0) or 0,
        "status": team.status,
        "status_text": text_of(TEAM_STATUS_TEXT, team.status),
        "created_at": fmt_dt(team.created_at),
    }


def team_detail_row(team: Team, recent_matches: List[Match], match_count: int) -> Dict[str, Any]:
    payload = team_row(team)
    payload.update(
        {
            "intro": team.intro or "",
            "flag_url": team.flag_url or "",
            "photo_url": team.photo_url or "",
            "match_count": int(match_count),
            "recent_matches": [match_row(item, team.id) for item in recent_matches],
        }
    )
    return payload


def member_row(member: TeamMember) -> Dict[str, Any]:
    return {
        "id": member.id,
        "name": member.name,
        "gender": member.gender,
        "gender_text": text_of(GENDER_TEXT, member.gender),
        "id_card_masked": mask_stored_id_card(member.id_card),
        "birth_date": fmt_date(member.birth_date),
        "jersey_no": member.jersey_no,
        "position": member.position or "",
        "photo_url": member.photo_url or "",
        "status": member.status,
        "status_text": text_of(MEMBER_STATUS_TEXT, member.status),
    }


def coach_row(coach: TeamCoach) -> Dict[str, Any]:
    return {
        "id": coach.id,
        "name": coach.name,
        "gender": coach.gender,
        "gender_text": text_of(GENDER_TEXT, coach.gender),
        "phone_masked": mask_stored_phone(coach.phone),
        "id_card_masked": mask_stored_id_card(coach.id_card),
        "cert_level": coach.cert_level,
        "cert_level_text": text_of(CERT_LEVEL_TEXT, coach.cert_level),
        "audit_status": coach.audit_status,
        "audit_status_text": text_of(AUDIT_STATUS_TEXT, coach.audit_status),
        "status": coach.status,
        "status_text": text_of(COACH_STATUS_TEXT, coach.status),
    }


def _result_text(match: Match, team_id: int) -> str:
    if match.status != 3 or match.home_score is None or match.away_score is None:
        return ""
    is_home = match.home_team_id == team_id
    own = match.home_score if is_home else match.away_score
    other = match.away_score if is_home else match.home_score
    if own > other:
        return "胜"
    if own == other:
        return "平"
    return "负"


def match_row(match: Match, team_id: Optional[int] = None) -> Dict[str, Any]:
    payload = {
        "id": match.id,
        "round": match.round or "",
        "home_team": {"id": match.home_team_id, "name": getattr(match.home_team, "name", "") if match.home_team_id else ""},
        "away_team": {"id": match.away_team_id, "name": getattr(match.away_team, "name", "") if match.away_team_id else ""},
        "home_score": match.home_score,
        "away_score": match.away_score,
        "status": match.status,
        "status_text": text_of(MATCH_STATUS_TEXT, match.status),
        "match_time": fmt_dt(match.match_time),
    }
    if team_id is not None:
        payload["is_home"] = match.home_team_id == team_id
        payload["result_text"] = _result_text(match, team_id)
    return payload
