# -*- coding: utf-8 -*-
"""oplogs 请求参数（PLAN 5.4.9）。"""
from __future__ import annotations

from common.request import BaseRequest, CharField, DateField, IntegerField


class LogListRequest(BaseRequest):
    module = CharField(required=False, max_length=32, label="模块")
    action = CharField(required=False, max_length=64, label="操作")
    user_id = IntegerField(required=False, min_value=1, label="操作人")
    start_date = DateField(required=False, label="开始日期")
    end_date = DateField(required=False, label="结束日期")
    keyword = CharField(required=False, max_length=64, label="关键字")
    pageNum = IntegerField(required=False, min_value=1, label="页码")
    pageSize = IntegerField(required=False, min_value=1, label="每页条数")
