# -*- coding: utf-8 -*-
"""teams 模型：球队 / 成员 / 教练员 / 比赛（PLAN 4.3.4–4.3.9）。"""
from __future__ import annotations

from django.db import models

from common.db_fields import TinyIntegerField
from common.models import SoftDeleteMixin, TimestampMixin


class Team(SoftDeleteMixin):
    """球队基础信息（按市州 / 组别 / 名称检索）。"""

    name = models.CharField(max_length=128, db_index=True, verbose_name="球队名称")
    region = models.ForeignKey(
        "core.Region",
        db_constraint=False,
        on_delete=models.DO_NOTHING,
        related_name="teams",
        verbose_name="所属市州",
    )
    category = TinyIntegerField(db_index=True, verbose_name="组别")
    org_name = models.CharField(max_length=128, null=True, blank=True, verbose_name="所属单位")
    logo_url = models.CharField(max_length=255, null=True, blank=True, verbose_name="队徽")
    flag_url = models.CharField(max_length=255, null=True, blank=True, verbose_name="队旗")
    photo_url = models.CharField(max_length=255, null=True, blank=True, verbose_name="合照")
    intro = models.TextField(null=True, blank=True, verbose_name="简介")
    status = TinyIntegerField(default=1, verbose_name="状态")
    created_by = models.BigIntegerField(null=True, blank=True, verbose_name="创建人")

    class Meta(SoftDeleteMixin.Meta):
        db_table = "teams"
        verbose_name = "球队"
        verbose_name_plural = "球队"
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return self.name


class TeamMember(SoftDeleteMixin):
    """球队成员（球员名单）。"""

    team = models.ForeignKey(
        "teams.Team",
        db_constraint=False,
        on_delete=models.DO_NOTHING,
        related_name="members",
        verbose_name="球队",
    )
    name = models.CharField(max_length=32, db_index=True, verbose_name="姓名")
    gender = TinyIntegerField(verbose_name="性别")
    id_card = models.CharField(max_length=255, null=True, blank=True, verbose_name="身份证密文")
    id_card_hash = models.CharField(max_length=64, null=True, blank=True, db_index=True, verbose_name="身份证哈希")
    birth_date = models.DateField(null=True, blank=True, verbose_name="出生日期")
    jersey_no = models.SmallIntegerField(null=True, blank=True, verbose_name="球衣号")
    position = models.CharField(max_length=16, null=True, blank=True, verbose_name="位置")
    photo_url = models.CharField(max_length=255, null=True, blank=True, verbose_name="照片")
    phone = models.CharField(max_length=255, null=True, blank=True, verbose_name="手机号密文")
    status = TinyIntegerField(default=1, verbose_name="状态")

    class Meta(SoftDeleteMixin.Meta):
        db_table = "team_members"
        verbose_name = "球队成员"
        verbose_name_plural = "球队成员"
        ordering = ["id"]

    def __str__(self) -> str:
        return self.name


class TeamCoach(SoftDeleteMixin):
    """球队教练员。"""

    team = models.ForeignKey(
        "teams.Team",
        db_constraint=False,
        on_delete=models.DO_NOTHING,
        related_name="coaches",
        verbose_name="球队",
    )
    name = models.CharField(max_length=32, db_index=True, verbose_name="姓名")
    gender = TinyIntegerField(verbose_name="性别")
    id_card = models.CharField(max_length=255, null=True, blank=True, verbose_name="身份证密文")
    id_card_hash = models.CharField(max_length=64, null=True, blank=True, db_index=True, verbose_name="身份证哈希")
    phone = models.CharField(max_length=255, null=True, blank=True, verbose_name="手机号密文")
    cert_level = TinyIntegerField(null=True, blank=True, verbose_name="证书等级")
    audit_status = TinyIntegerField(default=0, db_index=True, verbose_name="审核状态")
    status = TinyIntegerField(default=1, verbose_name="状态")

    class Meta(SoftDeleteMixin.Meta):
        db_table = "team_coaches"
        verbose_name = "球队教练员"
        verbose_name_plural = "球队教练员"
        ordering = ["id"]

    def __str__(self) -> str:
        return self.name


class Match(TimestampMixin):
    """赛事对阵与比分。"""

    event_id = models.BigIntegerField(db_index=True, verbose_name="赛事")
    round = models.CharField(max_length=32, null=True, blank=True, verbose_name="轮次")
    home_team = models.ForeignKey(
        "teams.Team",
        db_constraint=False,
        on_delete=models.DO_NOTHING,
        related_name="home_matches",
        verbose_name="主队",
    )
    away_team = models.ForeignKey(
        "teams.Team",
        db_constraint=False,
        on_delete=models.DO_NOTHING,
        related_name="away_matches",
        verbose_name="客队",
    )
    home_score = TinyIntegerField(null=True, blank=True, verbose_name="主队得分")
    away_score = TinyIntegerField(null=True, blank=True, verbose_name="客队得分")
    status = TinyIntegerField(default=1, db_index=True, verbose_name="状态")
    match_time = models.DateTimeField(null=True, blank=True, verbose_name="比赛时间")
    referee_id = models.BigIntegerField(null=True, blank=True, verbose_name="裁判")

    class Meta:
        db_table = "matches"
        verbose_name = "比赛"
        verbose_name_plural = "比赛"
        ordering = ["-match_time", "-id"]
        indexes = [
            models.Index(fields=["event_id", "status"], name="idx_event_status"),
            models.Index(fields=["home_team", "match_time"], name="idx_home"),
            models.Index(fields=["away_team", "match_time"], name="idx_away"),
        ]

    def __str__(self) -> str:
        return f"{self.home_team_id} vs {self.away_team_id}"
