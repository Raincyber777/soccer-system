# -*- coding: utf-8 -*-
"""通用输出函数（PLAN 5.6）：分页壳统一由此生成，保证字段名一致。"""
from __future__ import annotations

from typing import Any, Dict, List


def page_payload(rows: List[Any], total: int, page_num: int, page_size: int) -> Dict[str, Any]:
    return {
        "list": rows,
        "total": int(total),
        "pageNum": int(page_num),
        "pageSize": int(page_size),
    }
