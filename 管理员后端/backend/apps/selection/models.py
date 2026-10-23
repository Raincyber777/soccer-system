# -*- coding: utf-8 -*-
"""selection 模型：赛事 / 初选复选评分 / 最佳球员结果（PLAN 4.3.8 / 4.3.10 / 4.3.11）。"""
from __future__ import annotations

from django.conf import settings
from django.db import models

from common.db_fields import TinyIntegerField
from common.models import TimestampMixin


class Event(TimestampMixin):
    """赛事（组别维度）。"""

    name = models.CharField(max_length=128, verbose_name="赛事名称")
    year = models.SmallIntegerField(verbose_name="届次年份")
    category = TinyIntegerField(db_index=True, verbose_name="组别")
    register_start = models.DateTimeField(null=True, blank=True, verbose_name="报名开始")
    register_end = models.DateTimeField(null=True, blank=True, verbose_name="报名结束")
    status = TinyIntegerField(default=1, verbose_name="状态")

    class Meta:
        db_table = "events"
        verbose_name = "赛事"
        verbose_name_plural = "赛事"
        ordering = ["-year", "category"]

    def __str__(self) -> str:
        return self.name


class SelectionScore(TimestampMixin):
    """初选/复选评分：同一评委对同一球员同一阶段唯一。"""

    event = models.ForeignKey(
        "selection.Event",
        db_constraint=False,
        on_delete=models.DO_NOTHING,
        related_name="scores",
        verbose_name="赛事",
    )
    player = models.ForeignKey(
        "players.Player",
        db_constraint=False,
        on_delete=models.DO_NOTHING,
        related_name="scores",
        verbose_name="球员",
    )
    team = models.ForeignKey(
        "teams.Team",
        db_constraint=False,
        on_delete=models.DO_NOTHING,
        related_name="scores",
        verbose_name="球队",
    )
    category = TinyIntegerField(db_index=True, verbose_name="组别")
    stage = TinyIntegerField(db_index=True, verbose_name="阶段")
    judge = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        db_constraint=False,
        on_delete=models.DO_NOTHING,
        related_name="judged_scores",
        verbose_name="评委",
    )
    judge_name = models.CharField(max_length=64, null=True, blank=True, verbose_name="评委姓名快照")
    physical_score = models.DecimalField(max_digits=4, decimal_places=1, verbose_name="身体素质")
    technical_score = models.DecimalField(max_digits=4, decimal_places=1, verbose_name="技术水平")
    tactical_score = models.DecimalField(max_digits=4, decimal_places=1, verbose_name="战术意识")
    mental_score = models.DecimalField(max_digits=4, decimal_places=1, verbose_name="心理素质")
    potential_score = models.DecimalField(max_digits=4, decimal_places=1, verbose_name="发展潜力")
    total_score = models.DecimalField(max_digits=5, decimal_places=2, verbose_name="合计")
    remark = models.CharField(max_length=255, null=True, blank=True, verbose_name="备注")
    version = models.IntegerField(default=1, verbose_name="乐观锁版本")

    class Meta:
        db_table = "selection_scores"
        verbose_name = "遴选评分"
        verbose_name_plural = "遴选评分"
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["event", "player", "stage", "judge"],
                name="uk_event_player_stage_judge",
            ),
        ]
        indexes = [
            models.Index(fields=["event", "stage", "category"], name="idx_event_stage_category"),
            models.Index(fields=["team", "stage"], name="idx_team_stage"),
        ]

    def __str__(self) -> str:
        return f"{self.player_id}@{self.stage}"


class SelectionResult(TimestampMixin):
    """最佳球员遴选结果（每组别独立生成，旧结果 status=0 保留）。"""

    event = models.ForeignKey(
        "selection.Event",
        db_constraint=False,
        on_delete=models.DO_NOTHING,
        related_name="results",
        verbose_name="赛事",
    )
    player = models.ForeignKey(
        "players.Player",
        db_constraint=False,
        on_delete=models.DO_NOTHING,
        related_name="results",
        verbose_name="球员",
    )
    team = models.ForeignKey(
        "teams.Team",
        db_constraint=False,
        on_delete=models.DO_NOTHING,
        related_name="results",
        verbose_name="球队",
    )
    category = TinyIntegerField(db_index=True, verbose_name="组别")
    stage = TinyIntegerField(db_index=True, verbose_name="阶段")
    total_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="综合得分")
    rank = models.IntegerField(null=True, blank=True, verbose_name="名次")
    result = TinyIntegerField(default=0, verbose_name="结果")
    result_type = TinyIntegerField(default=1, verbose_name="结果类型")
    status = TinyIntegerField(default=1, verbose_name="状态")
    generated_by = models.BigIntegerField(null=True, blank=True, verbose_name="生成人")
    generated_at = models.DateTimeField(null=True, blank=True, verbose_name="生成时间")

    class Meta:
        db_table = "selection_results"
        verbose_name = "最佳球员结果"
        verbose_name_plural = "最佳球员结果"
        ordering = ["rank", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["event", "player", "stage", "category"],
                name="uk_event_player_stage_category",
            ),
        ]
        indexes = [
            models.Index(fields=["event", "stage", "category", "status"], name="idx_evt_stage_cat_status"),
        ]

    def __str__(self) -> str:
        return f"{self.player_id}#{self.rank}"
