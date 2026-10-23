# -*- coding: utf-8 -*-
"""teams 请求参数（PLAN 8.2）。"""
from __future__ import annotations

from common.request import BaseRequest, CharField, ChoiceField, IntegerField


class TeamListRequest(BaseRequest):
    region_id = IntegerField(required=False, min_value=1, label="市州")
    category = ChoiceField(required=False, choices=(1, 2, 3), label="组别")
    keyword = CharField(required=False, max_length=64, label="球队名称")
    pageNum = IntegerField(required=False, min_value=1, label="页码")
    pageSize = IntegerField(required=False, min_value=1, label="每页条数")


class TeamUpdateRequest(BaseRequest):
    name = CharField(required=False, max_length=128, label="球队名称")
    region_id = IntegerField(required=False, min_value=1, label="市州")
    category = ChoiceField(required=False, choices=(1, 2, 3), label="组别")
    org_name = CharField(required=False, max_length=128, label="所属单位")
    intro = CharField(required=False, max_length=1000, label="简介")
    status = ChoiceField(required=False, choices=(0, 1), label="状态")


class ResetPasswordRequest(BaseRequest):
    password = CharField(required=False, max_length=64, label="密码")


class PageRequest(BaseRequest):
    pageNum = IntegerField(required=False, min_value=1, label="页码")
    pageSize = IntegerField(required=False, min_value=1, label="每页条数")
