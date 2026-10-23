# -*- coding: utf-8 -*-
"""缓存（PLAN 6.9 / 9.5）：行政区划、字典 TTL 3600s，缓存不可用时自动回源。"""
from __future__ import annotations

from typing import Any, Callable, Iterable, Optional, Set

from django.conf import settings
from django.core.cache import cache

REGIONS_LEVEL2_KEY = "cache:regions:level2"

_used_keys: Set[str] = set()


def dict_key(dict_type: str) -> str:
    return f"cache:dict:{dict_type}"


def get_or_set(key: str, loader: Callable[[], Any], ttl: Optional[int] = None) -> Any:
    """读缓存，缺失则调用 loader 回源并写缓存；缓存异常不影响业务。"""
    _used_keys.add(key)
    try:
        cached = cache.get(key)
        if cached is not None:
            return cached
    except Exception:  # pragma: no cover - 缓存不可用时回源
        cached = None

    value = loader()
    try:
        cache.set(key, value, ttl if ttl is not None else getattr(settings, "CACHE_TTL_DICT", 3600))
    except Exception:  # pragma: no cover
        pass
    return value


def invalidate_dict_cache(dict_types: Optional[Iterable[str]] = None) -> None:
    """字典/行政区划缓存失效：不传参则清空本进程使用过的全部键。"""
    if dict_types:
        keys = [dict_key(item) for item in dict_types]
    else:
        keys = list(_used_keys) or [REGIONS_LEVEL2_KEY]
    try:
        cache.delete_many(keys)
    except Exception:  # pragma: no cover
        pass
