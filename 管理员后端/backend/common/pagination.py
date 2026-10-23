# -*- coding: utf-8 -*-
"""统一分页（PLAN 8.5）：pageNum 从 1 开始，pageSize 默认 20、上限 100。"""
from __future__ import annotations

from typing import Iterable, List, Sequence, Tuple

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


def normalize_page(page_num: int | None, page_size: int | None) -> Tuple[int, int]:
    try:
        page_num = max(1, int(page_num or 1))
    except (TypeError, ValueError):
        page_num = 1
    try:
        page_size = int(page_size or DEFAULT_PAGE_SIZE)
    except (TypeError, ValueError):
        page_size = DEFAULT_PAGE_SIZE
    page_size = min(max(1, page_size), MAX_PAGE_SIZE)
    return page_num, page_size


def paginate(queryset: Iterable, page_num: int, page_size: int) -> Tuple[List, int]:
    """对 QuerySet 分页：先 count 再切片，禁止先加载全表。"""
    total = queryset.count()
    start = (page_num - 1) * page_size
    rows = list(queryset[start:start + page_size])
    return rows, total


def paginate_list(items: Sequence, page_num: int, page_size: int) -> Tuple[List, int]:
    """对内存列表分页（仅用于无法下推到数据库的小结果集）。"""
    total = len(items)
    start = (page_num - 1) * page_size
    return list(items[start:start + page_size]), total
