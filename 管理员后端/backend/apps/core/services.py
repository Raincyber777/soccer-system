# -*- coding: utf-8 -*-
"""core 服务：行政区划与字典缓存（PLAN 6.9 / 9.5）。"""
from __future__ import annotations

from typing import Any, Dict, List

from apps.core.models import Dict, Region
from common.cache import REGIONS_LEVEL2_KEY, dict_key, get_or_set


def list_level2_regions() -> List[Dict[str, Any]]:
    """市州列表（regions.level=2），缓存 3600s。"""

    def loader() -> List[Dict[str, Any]]:
        return list(
            Region.objects.filter(level=2, status=1)
            .order_by("sort", "id")
            .values("id", "name", "code")
        )

    return get_or_set(REGIONS_LEVEL2_KEY, loader)


def list_dict_items(dict_type: str) -> List[Dict[str, Any]]:
    """字典项列表：[{label, value}]，缓存 3600s。"""

    def loader() -> List[Dict[str, Any]]:
        return list(
            Dict.objects.filter(dict_type=dict_type, status=1)
            .order_by("sort", "id")
            .values("label", "value")
        )

    return get_or_set(dict_key(dict_type), loader)


def dict_options(dict_types: List[str]) -> Dict[str, List[Dict[str, Any]]]:
    """批量取多个字典，供页面初始化数据使用。"""
    return {dict_type: list_dict_items(dict_type) for dict_type in dict_types}


def region_map() -> Dict[int, str]:
    """{市州ID: 名称}，供序列化时补 region_name。"""
    return {item["id"]: item["name"] for item in list_level2_regions()}


def refresh_cache() -> None:
    """种子/维护后刷新缓存。"""
    from common.cache import invalidate_dict_cache

    invalidate_dict_cache()
