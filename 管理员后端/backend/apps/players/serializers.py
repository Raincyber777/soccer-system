# -*- coding: utf-8 -*-
"""players 输出序列化（PLAN 5.4.4）：身份证只给掩码，均分缺失返回 null。"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from apps.players.models import Player
from common.crypto import mask_stored_id_card
from common.dicts import CATEGORY_TEXT, GENDER_TEXT, PUBLICITY_STATUS_TEXT, text_of
from common.time import fmt_date, fmt_dt


def _team_name(player: Player) -> str:
    try:
        return getattr(player.team, "name", "") or ""
    except Exception:  # 逻辑外键悬空时不影响列表
        return ""


def _avg(value: Optional[float]) -> Optional[float]:
    return None if value is None else round(float(value), 2)


def player_row(player: Player, initial_avg: Optional[float] = None, final_avg: Optional[float] = None) -> Dict[str, Any]:
    return {
        "id": player.id,
        "name": player.name,
        "gender": player.gender,
        "gender_text": text_of(GENDER_TEXT, player.gender),
        "id_card_masked": mask_stored_id_card(player.id_card),
        "birth_date": fmt_date(player.birth_date),
        "team_id": player.team_id,
        "team_name": _team_name(player),
        "category": player.category,
        "category_text": text_of(CATEGORY_TEXT, player.category),
        "school_name": player.school_name or "",
        "publicity_status": player.publicity_status,
        "publicity_status_text": text_of(PUBLICITY_STATUS_TEXT, player.publicity_status),
        "initial_avg_score": _avg(initial_avg),
        "final_avg_score": _avg(final_avg),
    }


def score_brief(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "judge_name": row.get("judge_name") or "",
        "total_score": float(row["total_score"]) if row.get("total_score") is not None else None,
        "created_at": fmt_dt(row.get("created_at")),
    }


def player_detail_row(
    player: Player,
    initial_avg: Optional[float],
    final_avg: Optional[float],
    scores: Dict[str, List[Dict[str, Any]]],
) -> Dict[str, Any]:
    payload = player_row(player, initial_avg, final_avg)
    payload.update(
        {
            "school_name": player.school_name or "",
            "status": player.status,
            "photo_url": player.photo_url or "",
            "scores": {
                "initial": [score_brief(item) for item in scores.get("initial", [])],
                "final": [score_brief(item) for item in scores.get("final", [])],
            },
        }
    )
    return payload
