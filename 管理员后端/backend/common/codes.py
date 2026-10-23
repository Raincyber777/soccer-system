# -*- coding: utf-8 -*-
"""统一响应码（PLAN 8.1 契约，数值冻结，不得擅自变更）。"""
from enum import IntEnum


class ResponseCode(IntEnum):
    SUCCESS = 0
    PARAM_ERROR = 10001
    REQUIRED_MISSING = 10002
    FORMAT_ERROR = 10003
    FILE_FORMAT_ERROR = 10006
    UNAUTHORIZED = 20001
    FORBIDDEN = 20005
    ACCOUNT_DISABLED = 20006
    PASSWORD_ERROR = 20008
    DATA_NOT_FOUND = 30001
    DATA_EXISTS = 30003
    VERSION_CONFLICT = 30008
    BUSINESS_ERROR = 40001
    QUOTA_EXCEEDED = 40006
    DATABASE_ERROR = 60001
    SYSTEM_ERROR = 90001

    @property
    def msg(self) -> str:
        return _MESSAGES[self]


_MESSAGES = {
    ResponseCode.SUCCESS: "成功",
    ResponseCode.PARAM_ERROR: "参数错误",
    ResponseCode.REQUIRED_MISSING: "必填参数缺失",
    ResponseCode.FORMAT_ERROR: "参数格式错误",
    ResponseCode.FILE_FORMAT_ERROR: "文件格式错误",
    ResponseCode.UNAUTHORIZED: "请先登录",
    ResponseCode.FORBIDDEN: "无权限访问",
    ResponseCode.ACCOUNT_DISABLED: "账号已被禁用",
    ResponseCode.PASSWORD_ERROR: "账号或密码错误",
    ResponseCode.DATA_NOT_FOUND: "记录不存在",
    ResponseCode.DATA_EXISTS: "数据已存在",
    ResponseCode.VERSION_CONFLICT: "数据已被他人修改，请刷新后重试",
    ResponseCode.BUSINESS_ERROR: "业务处理失败",
    ResponseCode.QUOTA_EXCEEDED: "超出配额限制",
    ResponseCode.DATABASE_ERROR: "数据库异常",
    ResponseCode.SYSTEM_ERROR: "系统异常，请联系管理员",
}
