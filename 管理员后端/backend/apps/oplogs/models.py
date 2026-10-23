# -*- coding: utf-8 -*-
"""oplogs 模型：用户操作日志（PLAN 4.3.12）。只读，不提供删除/修改接口。"""
from __future__ import annotations

from django.db import models

from common.db_fields import TinyIntegerField


class OperationLog(models.Model):
    """操作日志：操作人、模块、动作、请求元信息、脱敏参数、trace_id。"""

    user_id = models.BigIntegerField(null=True, blank=True, db_index=True, verbose_name="操作人")
    username = models.CharField(max_length=64, null=True, blank=True, db_index=True, verbose_name="账号快照")
    role = TinyIntegerField(null=True, blank=True, verbose_name="角色快照")
    module = models.CharField(max_length=32, db_index=True, verbose_name="模块")
    action = models.CharField(max_length=64, db_index=True, verbose_name="操作")
    method = models.CharField(max_length=8, null=True, blank=True, verbose_name="方法")
    path = models.CharField(max_length=255, null=True, blank=True, verbose_name="路径")
    ip = models.CharField(max_length=64, null=True, blank=True, verbose_name="客户端 IP")
    params = models.JSONField(null=True, blank=True, verbose_name="参数（脱敏）")
    result_code = models.IntegerField(default=0, verbose_name="结果码")
    duration_ms = models.IntegerField(null=True, blank=True, verbose_name="耗时")
    trace_id = models.CharField(max_length=32, null=True, blank=True, db_index=True, verbose_name="链路 ID")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name="时间")

    class Meta:
        db_table = "operation_logs"
        verbose_name = "操作日志"
        verbose_name_plural = "操作日志"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["user_id", "created_at"], name="idx_user_time"),
            models.Index(fields=["module", "created_at"], name="idx_module_time"),
        ]

    def __str__(self) -> str:
        return f"{self.username}:{self.action}"
