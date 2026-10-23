# -*- coding: utf-8 -*-
"""自定义数据库字段类型（PLAN 4.1：TINYINT / 微整数）。"""
from __future__ import annotations

from django.db import models


class TinyIntegerField(models.SmallIntegerField):
    """映射到 MySQL TINYINT，用于状态/类别等小整数列。"""

    def db_type(self, connection) -> str:  # pragma: no cover - 由建表语句触发
        return "tinyint"

    def rel_db_type(self, connection) -> str:  # pragma: no cover
        return "tinyint"
