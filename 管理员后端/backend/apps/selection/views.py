# -*- coding: utf-8 -*-
"""selection API 视图（PLAN 5.3 #10–#16）。"""
from __future__ import annotations

from django.views.decorators.http import require_GET, require_POST, require_http_methods

from apps.selection import services
from apps.selection.requests import (
    ExportRequest,
    GenerateRequest,
    ResultListRequest,
    ScoreCreateRequest,
    ScoreListRequest,
    ScoreUpdateRequest,
    SummaryRequest,
)
from common.pagination import normalize_page
from common.permissions import api_admin_required
from common.result import success


@require_http_methods(["GET", "POST"])
@api_admin_required
def scores_collection(request):
    """GET：评分列表；POST：新增评分（同一路径两种方法，PLAN 5.3 #10–#11）。"""
    if request.method == "GET":
        payload = ScoreListRequest.from_request(request).validate()
        page_num, page_size = normalize_page(payload.get("pageNum"), payload.get("pageSize"))
        return success("获取成功", services.list_scores(payload, page_num, page_size))

    payload = ScoreCreateRequest.from_request(request).validate()
    return success("新增成功", services.create_score(payload, request.user))


@require_http_methods(["PUT"])
@api_admin_required
def score_update(request, score_id: int):
    payload = ScoreUpdateRequest.from_request(request).validate()
    return success("修改成功", services.update_score(score_id, payload))


@require_GET
@api_admin_required
def score_summary(request):
    payload = SummaryRequest.from_request(request).validate()
    page_num, page_size = normalize_page(payload.get("pageNum"), payload.get("pageSize"))
    return success("获取成功", services.summary(payload, page_num, page_size))


@require_GET
@api_admin_required
def score_export(request):
    payload = ExportRequest.from_request(request).validate()
    return services.export_scores(payload)


@require_GET
@api_admin_required
def results_list(request):
    payload = ResultListRequest.from_request(request).validate()
    page_num, page_size = normalize_page(payload.get("pageNum"), payload.get("pageSize"))
    return success("获取成功", services.list_results(payload, page_num, page_size))


@require_POST
@api_admin_required
def results_generate(request):
    payload = GenerateRequest.from_request(request).validate()
    return success("生成成功", services.generate_results(payload, request.user))
