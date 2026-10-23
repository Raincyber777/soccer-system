# -*- coding: utf-8 -*-
"""players 请求参数（PLAN 5.4.4）。"""
from __future__ import annotations

from common.request import BaseRequest, CharField, ChoiceField, IntegerField


class PlayerListRequest(BaseRequest):
    keyword = CharField(required=False, max_length=32, label="球员姓名")
    id_card = CharField(
        required=False,
        max_length=18,
        label="身份证号",
        regex=r"^[0-9]{17}[0-9Xx]$",
    )
    team_id = IntegerField(required=False, min_value=1, label="球队")
    category = ChoiceField(required=False, choices=(1, 2, 3), label="组别")
    pageNum = IntegerField(required=False, min_value=1, label="页码")
    pageSize = IntegerField(required=False, min_value=1, label="每页条数")
