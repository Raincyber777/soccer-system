# -*- coding: utf-8 -*-
"""业务异常与参数校验异常（PLAN 8.4 异常映射）。"""
from __future__ import annotations

from common.codes import ResponseCode


class BusinessException(Exception):
    """Service 主动抛出的业务异常，携带响应码。"""

    def __init__(self, code: ResponseCode = ResponseCode.BUSINESS_ERROR, msg: str | None = None):
        self.code = code
        self.msg = msg or code.msg
        super().__init__(self.msg)


class RequestValidationError(Exception):
    """请求参数校验失败，映射为 10001。"""

    def __init__(self, msg: str = "参数错误"):
        self.msg = msg
        super().__init__(self.msg)
