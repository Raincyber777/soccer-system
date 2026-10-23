# -*- coding: utf-8 -*-
"""字典常量与文案（PLAN 4.3 / 6）。数值与文案冻结，前端与接口共用。"""
from __future__ import annotations

from typing import Any, Dict

# 组别
CATEGORY_UNIVERSITY = 1
CATEGORY_MIDDLE = 2
CATEGORY_PRIMARY = 3
CATEGORY_TEXT: Dict[int, str] = {1: "高校组", 2: "中学组", 3: "小学组"}

# 遴选阶段
STAGE_INITIAL = 1
STAGE_FINAL = 2
STAGE_TEXT: Dict[int, str] = {1: "初选", 2: "复选"}

# 性别
GENDER_TEXT: Dict[int, str] = {1: "男", 2: "女"}

# 球队/成员/教练状态
TEAM_STATUS_TEXT: Dict[int, str] = {1: "启用", 0: "禁用"}
MEMBER_STATUS_TEXT: Dict[int, str] = {1: "有效", 0: "离队"}
COACH_STATUS_TEXT: Dict[int, str] = {1: "在职", 0: "离岗"}
AUDIT_STATUS_TEXT: Dict[int, str] = {0: "待审核", 1: "通过", 2: "驳回"}
CERT_LEVEL_TEXT: Dict[int, str] = {1: "A 级", 2: "B 级", 3: "C 级", 4: "D 级"}

# 公示状态
PUBLICITY_STATUS_TEXT: Dict[int, str] = {0: "未公示", 1: "公示中", 2: "取消公示"}

# 比赛状态
MATCH_STATUS_TEXT: Dict[int, str] = {1: "未开始", 2: "进行中", 3: "已结束"}

# 赛事状态
EVENT_STATUS_TEXT: Dict[int, str] = {1: "未开始", 2: "报名中", 3: "比赛中", 4: "已结束"}

# 结果
RESULT_TEXT: Dict[int, str] = {1: "入选", 0: "未入选"}
RESULT_TYPE_TEXT: Dict[int, str] = {1: "最佳球员", 2: "最佳阵容", 3: "其他"}

# 角色
ROLE_TEXT: Dict[int, str] = {
    1: "省级管理员",
    2: "市州管理员",
    3: "球队账号",
    4: "高校",
    5: "运动员",
    6: "教练员",
    9: "系统管理员",
}

# 操作日志模块
MODULE_AUTH = "认证"
MODULE_TEAM = "参赛管理"
MODULE_SELECTION = "遴选管理"
MODULE_LOG = "日志管理"
MODULE_TEXT = {
    MODULE_AUTH: MODULE_AUTH,
    MODULE_TEAM: MODULE_TEAM,
    MODULE_SELECTION: MODULE_SELECTION,
    MODULE_LOG: MODULE_LOG,
}

# 操作动作（写操作日志时统一使用，避免文案漂移）
ACTION_LOGIN = "登录"
ACTION_LOGIN_FAIL = "登录失败"
ACTION_LOGOUT = "退出登录"
ACTION_TEAM_UPDATE = "修改球队信息"
ACTION_TEAM_RESET_PASSWORD = "重置球队密码"
ACTION_SCORE_CREATE = "新增评分"
ACTION_SCORE_UPDATE = "修改评分"
ACTION_SCORE_EXPORT = "导出评分"
ACTION_RESULT_GENERATE = "生成最佳球员结果"


def text_of(mapping: Dict[Any, str], value: Any) -> str:
    """安全取文案：未知值返回空串，避免接口因脏数据报错。"""
    try:
        return mapping.get(value, "")
    except TypeError:  # 不可哈希
        return ""
