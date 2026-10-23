# -*- coding: utf-8 -*-
"""players API 视图（PLAN 5.3 #8–#9）。"""
from __future__ import annotations

from django.views.decorators.http import require_GET

from apps.players import services
from apps.players.requests import PlayerListRequest
from common.pagination import normalize_page
from common.permissions import api_admin_required
from common.result import success


@require_GET
@api_admin_required
def players_list(request):
    """球员遴选档案列表：keyword / id_card / team_id / category。"""
    payload = PlayerListRequest.from_request(request).validate()
    page_num, page_size = normalize_page(payload.get("pageNum"), payload.get("pageSize"))
    return success("获取成功", services.list_players(payload, page_num, page_size))


@require_GET
@api_admin_required
def player_detail(request, player_id: int):
    """球员档案详情 + 初选/复选评分。"""
    return success("获取成功", services.get_player_detail(player_id))
