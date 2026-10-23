# -*- coding: utf-8 -*-
"""根路由：纯 API 服务（无页面）。所有响应均为统一 Result JSON。"""
from django.urls import include, path, re_path

from apps.core import error_views

urlpatterns = [
    path("api/v1/", include("apps.core.urls")),
    path("", include("apps.accounts.urls")),
    path("", include("apps.teams.urls")),
    path("", include("apps.players.urls")),
    path("", include("apps.selection.urls")),
    path("", include("apps.oplogs.urls")),
    # 兜底：未匹配路径也返回 JSON，不出现 HTML 404
    re_path(r"^.*$", error_views.not_found),
]

handler400 = "apps.core.error_views.error_400"
handler403 = "apps.core.error_views.error_403"
handler404 = "apps.core.error_views.error_404"
handler500 = "apps.core.error_views.error_500"
