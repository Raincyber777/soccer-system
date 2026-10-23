# -*- coding: utf-8 -*-
"""players 模型：球员遴选档案（PLAN 4.3.7）。"""
from __future__ import annotations

from django.db import models

from common.db_fields import TinyIntegerField
from common.models import SoftDeleteMixin


class Player(SoftDeleteMixin):
    """球员遴选档案：身份证密文 + 哈希精确检索。"""

    name = models.CharField(max_length=32, db_index=True, verbose_name="姓名")
    gender = TinyIntegerField(verbose_name="性别")
    id_card = models.CharField(max_length=255, null=True, blank=True, verbose_name="身份证密文")
    id_card_hash = models.CharField(max_length=64, null=True, blank=True, db_index=True, verbose_name="身份证哈希")
    birth_date = models.DateField(null=True, blank=True, verbose_name="出生日期")
    region_id = models.BigIntegerField(null=True, blank=True, db_index=True, verbose_name="所属市州")
    team = models.ForeignKey(
        "teams.Team",
        db_constraint=False,
        on_delete=models.DO_NOTHING,
        related_name="players",
        verbose_name="所属球队",
    )
    school_name = models.CharField(max_length=128, null=True, blank=True, verbose_name="学校")
    category = TinyIntegerField(db_index=True, verbose_name="组别")
    photo_url = models.CharField(max_length=255, null=True, blank=True, verbose_name="照片")
    publicity_status = TinyIntegerField(default=0, db_index=True, verbose_name="公示状态")
    source_member_id = models.BigIntegerField(null=True, blank=True, verbose_name="来源球队成员")
    status = TinyIntegerField(default=1, verbose_name="状态")

    class Meta(SoftDeleteMixin.Meta):
        db_table = "players"
        verbose_name = "球员遴选档案"
        verbose_name_plural = "球员遴选档案"
        ordering = ["id"]

    def __str__(self) -> str:
        return self.name
