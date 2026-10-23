# -*- coding: utf-8 -*-
"""oplogs 输出序列化（PLAN 5.4.9）：列表不返回 params 大字段。"""
from __future__ import annotations

from typing import Any, Dict

from apps.oplogs.models import OperationLog
from common.dicts import ROLE_TEXT, text_of
from common.time import fmt_dt


def log_row(item: OperationLog) -> Dict[str, Any]:
    return {
        "id": item.id,
        "created_at": fmt_dt(item.created_at),
        "user_id": item.user_id,
        "username": item.username or "",
        "role": item.role,
        "role_text": text_of(ROLE_TEXT, item.role),
        "module": item.module,
        "action": item.action,
        "method": item.method or "",
        "path": item.path or "",
        "ip": item.ip or "",
        "result_code": item.result_code,
        "duration_ms": item.duration_ms,
        "trace_id": item.trace_id or "",
    }


def log_detail_row(item: OperationLog) -> Dict[str, Any]:
    payload = log_row(item)
    payload["params"] = item.params or {}
    return payload
