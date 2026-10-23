# -*- coding: utf-8 -*-
"""selection 输出序列化（PLAN 5.4.5–5.4.8）：十进制统一转 float，避免 JSON 序列化失败。"""
from __future__ import annotations

from typing import Any, Dict, Optional

from common.dicts import (
    CATEGORY_TEXT,
    RESULT_TEXT,
    RESULT_TYPE_TEXT,
    STAGE_TEXT,
    text_of,
)
from common.time import fmt_dt


def _num(value: Any, digits: int = 2) -> Optional[float]:
    if value is None:
        return None
    return round(float(value), digits)


def score_row(score: Any) -> Dict[str, Any]:
    return {
        "id": score.id,
        "event_id": score.event_id,
        "event_name": getattr(score.event, "name", "") if score.event_id else "",
        "player_id": score.player_id,
        "player_name": getattr(score.player, "name", "") if score.player_id else "",
        "team_id": score.team_id,
        "team_name": getattr(score.team, "name", "") if score.team_id else "",
        "category": score.category,
        "category_text": text_of(CATEGORY_TEXT, score.category),
        "stage": score.stage,
        "stage_text": text_of(STAGE_TEXT, score.stage),
        "judge_id": score.judge_id,
        "judge_name": score.judge_name or "",
        "physical_score": _num(score.physical_score, 1),
        "technical_score": _num(score.technical_score, 1),
        "tactical_score": _num(score.tactical_score, 1),
        "mental_score": _num(score.mental_score, 1),
        "potential_score": _num(score.potential_score, 1),
        "total_score": _num(score.total_score),
        "remark": score.remark or "",
        "version": score.version,
        "created_at": fmt_dt(score.created_at),
        "updated_at": fmt_dt(score.updated_at),
    }


def summary_row(row: Dict[str, Any], player: Any = None) -> Dict[str, Any]:
    return {
        "rank": int(row["rank"]),
        "player_id": row["player_id"],
        "player_name": getattr(player, "name", "") if player is not None else "",
        "team_id": row["team_id"],
        "team_name": getattr(getattr(player, "team", None), "name", "") if player is not None else "",
        "category": row["category"],
        "category_text": text_of(CATEGORY_TEXT, row["category"]),
        "judge_count": int(row["judge_count"]),
        "avg_score": _num(row["avg_score"]),
        "dimension_avg": {
            "physical_score": _num(row["physical_avg"], 1),
            "technical_score": _num(row["technical_avg"], 1),
            "tactical_score": _num(row["tactical_avg"], 1),
            "mental_score": _num(row["mental_avg"], 1),
            "potential_score": _num(row["potential_avg"], 1),
        },
    }


def result_row(item: Any) -> Dict[str, Any]:
    return {
        "id": item.id,
        "event_id": item.event_id,
        "event_name": getattr(item.event, "name", "") if item.event_id else "",
        "player_id": item.player_id,
        "player_name": getattr(item.player, "name", "") if item.player_id else "",
        "team_id": item.team_id,
        "team_name": getattr(item.team, "name", "") if item.team_id else "",
        "category": item.category,
        "category_text": text_of(CATEGORY_TEXT, item.category),
        "stage": item.stage,
        "stage_text": text_of(STAGE_TEXT, item.stage),
        "total_score": _num(item.total_score),
        "rank": item.rank,
        "result": item.result,
        "result_text": text_of(RESULT_TEXT, item.result),
        "result_type_text": text_of(RESULT_TYPE_TEXT, item.result_type),
        "status": item.status,
        "generated_by_name": getattr(item, "generated_by_name", "") or "",
        "generated_at": fmt_dt(item.generated_at),
    }
