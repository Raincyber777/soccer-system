# -*- coding: utf-8 -*-
"""core 模型：行政区划、字典（PLAN 4.3.2 / 4.3.3）。"""
from __future__ import annotations

from django.db import models

from common.db_fields import TinyIntegerField


class Region(models.Model):
    """行政区划：level=1 省，level=2 市州。"""

    parent_id = models.BigIntegerField(null=True, blank=True, db_index=True, verbose_name="父级")
    name = models.CharField(max_length=64, verbose_name="名称")
    level = TinyIntegerField(db_index=True, verbose_name="层级")
    code = models.CharField(max_length=32, unique=True, verbose_name="行政区划码")
    sort = models.IntegerField(default=0, verbose_name="排序")
    status = TinyIntegerField(default=1, verbose_name="状态")

    class Meta:
        db_table = "regions"
        verbose_name = "行政区划"
        verbose_name_plural = "行政区划"
        ordering = ["sort", "id"]

    def __str__(self) -> str:
        return self.name


class Dict(models.Model):
    """字典：category / stage / publicity_status / audit_status / ..."""

    dict_type = models.CharField(max_length=32, db_index=True, verbose_name="字典类型")
    label = models.CharField(max_length=64, verbose_name="显示文案")
    value = models.CharField(max_length=32, verbose_name="值")
    sort = models.IntegerField(default=0, verbose_name="排序")
    status = TinyIntegerField(default=1, verbose_name="状态")
    remark = models.CharField(max_length=255, null=True, blank=True, verbose_name="备注")

    class Meta:
        db_table = "dicts"
        verbose_name = "字典"
        verbose_name_plural = "字典"
        ordering = ["dict_type", "sort", "id"]
        constraints = [
            models.UniqueConstraint(fields=["dict_type", "value"], name="uk_dict_type_value"),
        ]

    def __str__(self) -> str:
        return f"{self.dict_type}:{self.label}"
