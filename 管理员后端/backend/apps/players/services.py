# -*- coding: utf-8 -*-
"""players 服务：档案列表 / 详情（PLAN 6.3 / 9.1：均分一次聚合，禁止 N+1）。"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from django.db.models import Avg

from apps.players.models import Player
from apps.players.serializers import player_detail_row, player_row
from apps.selection.models import SelectionScore
from common.codes import ResponseCode
from common.crypto import id_card_hash
from common.exceptions import BusinessException
from common.pagination import paginate
from common.serializers import page_payload


def _avg_map(player_ids: List[int]) -> Dict[int, Dict[int, float]]:
    """一次聚合取当前页球员的初选/复选均分：{player_id: {stage: avg}}。"""
    if not player_ids:
        return {}
    rows = (
        SelectionScore.objects.filter(player_id__in=player_ids)
        .values("player_id", "stage")
        .annotate(avg_score=Avg("total_score"))
    )
    result: Dict[int, Dict[int, float]] = {}
    for row in rows:
        result.setdefault(row["player_id"], {})[row["stage"]] = float(row["avg_score"])
    return result


def list_players(filters: Dict[str, Any], page_num: int, page_size: int) -> Dict[str, Any]:
    queryset = Player.objects.select_related("team")
    keyword = (filters.get("keyword") or "").strip()
    raw_id_card = (filters.get("id_card") or "").strip()
    if keyword:
        queryset = queryset.filter(name__istartswith=keyword)
    if raw_id_card:
        # 身份证只做 18 位精确匹配（后端哈希比对），不支持模糊
        queryset = queryset.filter(id_card_hash=id_card_hash(raw_id_card))
    if filters.get("team_id"):
        queryset = queryset.filter(team_id=filters["team_id"])
    if filters.get("category"):
        queryset = queryset.filter(category=filters["category"])

    rows, total = paginate(queryset.order_by("id"), page_num, page_size)
    averages = _avg_map([item.id for item in rows])

    payload_rows = [
        player_row(
            item,
            averages.get(item.id, {}).get(1),
            averages.get(item.id, {}).get(2),
        )
        for item in rows
    ]
    return page_payload(payload_rows, total, page_num, page_size)


def get_player_detail(player_id: int) -> Dict[str, Any]:
    player = Player.objects.select_related("team").filter(pk=player_id).first()
    if player is None:
        raise BusinessException(ResponseCode.DATA_NOT_FOUND, "球员档案不存在")

    scores: Dict[str, List[Dict[str, Any]]] = {"initial": [], "final": []}
    averages = _avg_map([player.id]).get(player.id, {})
    rows = (
        SelectionScore.objects.filter(player_id=player.id)
        .order_by("stage", "-created_at", "-id")
        .values("stage", "judge_name", "total_score", "created_at")
    )
    for row in rows:
        key = "initial" if row["stage"] == 1 else "final"
        scores[key].append(dict(row))
    return player_detail_row(player, averages.get(1), averages.get(2), scores)
