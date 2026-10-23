# -*- coding: utf-8 -*-
"""oplogs API 视图（PLAN 5.3 #17–#18）：只读。"""
from __future__ import annotations

from django.views.decorators.http import require_GET

from apps.oplogs import services
from apps.oplogs.requests import LogListRequest
from common.pagination import normalize_page
from common.permissions import api_admin_required
from common.result import success


@require_GET
@api_admin_required
def logs_list(request):
    payload = LogListRequest.from_request(request).validate()
    page_num, page_size = normalize_page(payload.get("pageNum"), payload.get("pageSize"))
    return success("获取成功", services.list_logs(payload, page_num, page_size))


@require_GET
@api_admin_required
def log_detail(request, log_id: int):
    return success("获取成功", services.get_log(log_id))
