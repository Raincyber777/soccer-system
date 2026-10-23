# -*- coding: utf-8 -*-
"""全局错误处理（纯 API）：所有错误一律返回统一 Result，不渲染页面。"""
from __future__ import annotations

from django.http import JsonResponse

from common.codes import ResponseCode
from common.result import error


def error_400(request, exception=None):
    return error(ResponseCode.PARAM_ERROR, "请求不合法")


def error_403(request, exception=None):
    return error(ResponseCode.FORBIDDEN)


def error_404(request, exception=None):
    return error(ResponseCode.DATA_NOT_FOUND, "接口不存在")


def error_500(request):
    return error(ResponseCode.SYSTEM_ERROR)


def not_found(request, *args, **kwargs):
    """兜底路由：任何未匹配路径统一返回 30001 JSON（纯后端服务，不出现 HTML 404 页）。"""
    return error(ResponseCode.DATA_NOT_FOUND, "接口不存在")
