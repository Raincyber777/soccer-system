# -*- coding: utf-8 -*-
"""oplogs 服务：操作日志写入 + 只读查询（PLAN 5.4.9 / 6.8 / 8.9）。

写入约定（契约）：
- 只由 Service 调用，Controller 不直接写日志；
- 业务写操作中与业务数据同一事务；
- params 递归脱敏后入库，密码/身份证等不落明文。

查询约定：
- 只提供列表与详情，不提供新增/修改/删除接口；
- 关键字命中 trace_id 时精确匹配，其余字段 icontains（仅日志表允许）。
"""
from __future__ import annotations

import re
from datetime import datetime, time
from typing import Any, Dict, Optional

from django.db.models import Q

from apps.oplogs.models import OperationLog
from apps.oplogs.serializers import log_detail_row, log_row
from common.codes import ResponseCode
from common.context import get_client_ip, get_current_request
from common.exceptions import BusinessException
from common.logging import sanitize_params
from common.pagination import paginate
from common.serializers import page_payload
from common.trace import get_operator, get_trace_id

TRACE_ID_RE = re.compile(r"^[0-9a-f]{32}$")


# ---------------------------------------------------------------------------
# 写入
# ---------------------------------------------------------------------------
def _resolve_user(user: Any) -> Any:
    """优先使用显式传入的 user，其次取当前请求的登录用户。"""
    if user is not None:
        return user
    request = get_current_request()
    if request is None:
        return None
    candidate = getattr(request, "user", None)
    if candidate is not None and getattr(candidate, "is_authenticated", False):
        return candidate
    return None


def log_operation(
    module: str,
    action: str,
    params: Optional[Dict[str, Any]] = None,
    result_code: int = 0,
    duration_ms: Optional[int] = None,
    user: Any = None,
) -> OperationLog:
    """写一条操作日志并返回记录。"""
    request = get_current_request()
    operator = _resolve_user(user)
    if operator is not None:
        user_id = getattr(operator, "pk", None)
        username = getattr(operator, "username", "") or ""
        role = getattr(operator, "role", None)
    else:
        snapshot = get_operator()
        user_id = snapshot.get("id")
        username = snapshot.get("username", "")
        role = snapshot.get("role")

    method = getattr(request, "method", None) if request is not None else None
    path = getattr(request, "path", None) if request is not None else None
    ip = get_client_ip(request) if request is not None else ""

    return OperationLog.objects.create(
        user_id=user_id,
        username=(username or "")[:64] or None,
        role=role,
        module=module,
        action=action,
        method=method,
        path=(path or "")[:255] or None,
        ip=(ip or "")[:64] or None,
        params=sanitize_params(params or {}),
        result_code=int(result_code),
        duration_ms=duration_ms,
        trace_id=(get_trace_id() or "")[:32] or None,
    )


# ---------------------------------------------------------------------------
# 查询
# ---------------------------------------------------------------------------
def list_logs(filters: Dict[str, Any], page_num: int, page_size: int) -> Dict[str, Any]:
    queryset = OperationLog.objects.all()

    module = (filters.get("module") or "").strip()
    action = (filters.get("action") or "").strip()
    keyword = (filters.get("keyword") or "").strip()

    if module:
        queryset = queryset.filter(module=module)
    if action:
        queryset = queryset.filter(action=action)
    if filters.get("user_id"):
        queryset = queryset.filter(user_id=filters["user_id"])
    if filters.get("start_date"):
        start = datetime.combine(filters["start_date"], time.min)
        queryset = queryset.filter(created_at__gte=start)
    if filters.get("end_date"):
        end = datetime.combine(filters["end_date"], time.max)
        queryset = queryset.filter(created_at__lte=end)
    if keyword:
        if TRACE_ID_RE.match(keyword.lower()):
            queryset = queryset.filter(trace_id__iexact=keyword)
        else:
            queryset = queryset.filter(
                Q(username__icontains=keyword)
                | Q(action__icontains=keyword)
                | Q(path__icontains=keyword)
            )

    rows, total = paginate(queryset.order_by("-created_at", "-id"), page_num, page_size)
    return page_payload([log_row(item) for item in rows], total, page_num, page_size)


def get_log(log_id: int) -> Dict[str, Any]:
    item = OperationLog.objects.filter(pk=log_id).first()
    if item is None:
        raise BusinessException(ResponseCode.DATA_NOT_FOUND, "日志不存在")
    return log_detail_row(item)
