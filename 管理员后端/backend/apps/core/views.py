# -*- coding: utf-8 -*-
"""公共接口（PLAN 5.4.10）：健康检查，免登录。"""
from datetime import datetime

from django.conf import settings
from django.views.decorators.http import require_GET

from common.result import success


@require_GET
def health(request):
    """健康检查：{status, version, time}，无需登录。

    项目 USE_TZ=False，时间为本地时间（Asia/Shanghai），不得使用 timezone.localtime()。
    """
    return success(
        "ok",
        {
            "status": "ok",
            "version": settings.APP_VERSION,
            "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        },
    )
