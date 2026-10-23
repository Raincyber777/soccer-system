# -*- coding: utf-8 -*-
"""模型公共基类（PLAN 4.1）：时间戳、软删除、默认过滤已删除数据。

说明：
- `objects` 默认只返回未删除数据（业务查询用）；
- `all_objects` 返回全部数据（统计/排重用）；
- `Meta.base_manager_name = "all_objects"`，避免反向关联被默认过滤影响。
"""
from __future__ import annotations

from django.db import models
from django.utils import timezone


class AliveQuerySet(models.QuerySet):
    def alive(self) -> "AliveQuerySet":
        return self.filter(deleted_at__isnull=True)

    def soft_delete(self) -> int:
        return self.update(deleted_at=timezone.now())


class AliveManager(models.Manager):
    """只返回未软删除记录。"""

    def get_queryset(self) -> AliveQuerySet:
        return AliveQuerySet(self.model, using=self._db).filter(deleted_at__isnull=True)


class AllObjectsManager(models.Manager):
    """返回全部记录（含已软删除）。"""

    def get_queryset(self) -> AliveQuerySet:
        return AliveQuerySet(self.model, using=self._db)


class TimestampMixin(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        abstract = True


class SoftDeleteMixin(TimestampMixin):
    """主数据软删除（PLAN 4.1）：teams / team_members / team_coaches / players / users。"""

    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True, verbose_name="删除时间")

    objects = AliveManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True
        base_manager_name = "all_objects"
