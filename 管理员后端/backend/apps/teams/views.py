# -*- coding: utf-8 -*-
"""teams API 视图（PLAN 5.3 #1–#7）：只做解析 → Service → Result。"""
from __future__ import annotations

from django.views.decorators.http import require_GET, require_http_methods

from apps.teams import services
from apps.teams.requests import PageRequest, ResetPasswordRequest, TeamListRequest, TeamUpdateRequest
from common.pagination import normalize_page
from common.permissions import api_admin_required
from common.result import success


@require_GET
@api_admin_required
def teams_list(request):
    """球队分页列表：支持 region_id / category / keyword。"""
    payload = TeamListRequest.from_request(request).validate()
    page_num, page_size = normalize_page(payload.get("pageNum"), payload.get("pageSize"))
    data = services.list_teams(payload, page_num, page_size)
    return success("获取成功", data)


@require_http_methods(["GET", "PUT"])
@api_admin_required
def team_detail(request, team_id: int):
    """球队详情 / 维护基础信息。"""
    if request.method == "GET":
        return success("获取成功", services.get_team_detail(team_id))
    payload = TeamUpdateRequest.from_request(request).validate()
    return success("修改成功", services.update_team(team_id, payload))


@require_http_methods(["PUT"])
@api_admin_required
def team_reset_password(request, team_id: int):
    """重置球队账号密码，临时密码仅返回一次。"""
    payload = ResetPasswordRequest.from_request(request).validate()
    data = services.reset_team_password(team_id, payload.get("password"))
    return success("密码已重置", data)


@require_GET
@api_admin_required
def team_members(request, team_id: int):
    payload = PageRequest.from_request(request).validate()
    page_num, page_size = normalize_page(payload.get("pageNum"), payload.get("pageSize"))
    return success("获取成功", services.list_members(team_id, page_num, page_size))


@require_GET
@api_admin_required
def team_coaches(request, team_id: int):
    payload = PageRequest.from_request(request).validate()
    page_num, page_size = normalize_page(payload.get("pageNum"), payload.get("pageSize"))
    return success("获取成功", services.list_coaches(team_id, page_num, page_size))


@require_GET
@api_admin_required
def team_matches(request, team_id: int):
    payload = PageRequest.from_request(request).validate()
    page_num, page_size = normalize_page(payload.get("pageNum"), payload.get("pageSize"))
    return success("获取成功", services.list_team_matches(team_id, page_num, page_size))
