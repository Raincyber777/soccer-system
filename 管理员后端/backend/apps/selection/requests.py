# -*- coding: utf-8 -*-
"""selection 请求参数（PLAN 5.4.5–5.4.8）。"""
from __future__ import annotations

from common.request import BaseRequest, CharField, ChoiceField, DecimalField, IntegerField


class ScoreListRequest(BaseRequest):
    event_id = IntegerField(required=False, min_value=1, label="赛事")
    stage = ChoiceField(required=False, choices=(1, 2), label="阶段")
    category = ChoiceField(required=False, choices=(1, 2, 3), label="组别")
    team_id = IntegerField(required=False, min_value=1, label="球队")
    keyword = CharField(required=False, max_length=32, label="球员姓名")
    pageNum = IntegerField(required=False, min_value=1, label="页码")
    pageSize = IntegerField(required=False, min_value=1, label="每页条数")


class ScoreCreateRequest(BaseRequest):
    event_id = IntegerField(required=True, min_value=1, label="赛事")
    player_id = IntegerField(required=True, min_value=1, label="球员")
    stage = ChoiceField(required=True, choices=(1, 2), label="阶段")
    physical_score = DecimalField(required=True, min_value=0, max_value=20, decimal_places=1, label="身体素质")
    technical_score = DecimalField(required=True, min_value=0, max_value=20, decimal_places=1, label="技术水平")
    tactical_score = DecimalField(required=True, min_value=0, max_value=20, decimal_places=1, label="战术意识")
    mental_score = DecimalField(required=True, min_value=0, max_value=20, decimal_places=1, label="心理素质")
    potential_score = DecimalField(required=True, min_value=0, max_value=20, decimal_places=1, label="发展潜力")
    remark = CharField(required=False, max_length=255, label="备注")


class ScoreUpdateRequest(BaseRequest):
    physical_score = DecimalField(required=True, min_value=0, max_value=20, decimal_places=1, label="身体素质")
    technical_score = DecimalField(required=True, min_value=0, max_value=20, decimal_places=1, label="技术水平")
    tactical_score = DecimalField(required=True, min_value=0, max_value=20, decimal_places=1, label="战术意识")
    mental_score = DecimalField(required=True, min_value=0, max_value=20, decimal_places=1, label="心理素质")
    potential_score = DecimalField(required=True, min_value=0, max_value=20, decimal_places=1, label="发展潜力")
    remark = CharField(required=False, max_length=255, label="备注")
    version = IntegerField(required=True, min_value=1, label="版本号")


class SummaryRequest(BaseRequest):
    event_id = IntegerField(required=True, min_value=1, label="赛事")
    stage = ChoiceField(required=True, choices=(1, 2), label="阶段")
    category = ChoiceField(required=False, choices=(1, 2, 3), label="组别")
    pageNum = IntegerField(required=False, min_value=1, label="页码")
    pageSize = IntegerField(required=False, min_value=1, label="每页条数")


class ExportRequest(BaseRequest):
    event_id = IntegerField(required=True, min_value=1, label="赛事")
    stage = ChoiceField(required=True, choices=(1, 2), label="阶段")
    category = ChoiceField(required=False, choices=(1, 2, 3), label="组别")
    format = ChoiceField(required=False, choices=("xlsx", "csv"), default="xlsx", label="导出格式")


class ResultListRequest(BaseRequest):
    event_id = IntegerField(required=True, min_value=1, label="赛事")
    stage = ChoiceField(required=False, choices=(1, 2), default=2, label="阶段")
    category = ChoiceField(required=False, choices=(1, 2, 3), label="组别")
    pageNum = IntegerField(required=False, min_value=1, label="页码")
    pageSize = IntegerField(required=False, min_value=1, label="每页条数")


class GenerateRequest(BaseRequest):
    event_id = IntegerField(required=True, min_value=1, label="赛事")
    stage = ChoiceField(required=True, choices=(1, 2), label="阶段")
    category = ChoiceField(required=True, choices=(1, 2, 3), label="组别")
    top_n = IntegerField(required=False, min_value=1, max_value=11, label="生成数量")
