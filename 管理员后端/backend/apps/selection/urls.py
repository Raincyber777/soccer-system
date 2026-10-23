# -*- coding: utf-8 -*-
"""selection 路由：纯 API（评分 / 汇总 / 导出 / 结果）。"""
from django.urls import path

from apps.selection import views

app_name = "selection"

urlpatterns = [
    # 具体路径在前，避免与 <int:score_id> 冲突
    path("api/v1/selection-scores", views.scores_collection, name="api_scores"),
    path("api/v1/selection-scores/summary", views.score_summary, name="api_summary"),
    path("api/v1/selection-scores/export", views.score_export, name="api_export"),
    path("api/v1/selection-scores/<int:score_id>", views.score_update, name="api_score_update"),
    path("api/v1/selection-results", views.results_list, name="api_results"),
    path("api/v1/selection-results/generate", views.results_generate, name="api_generate"),
]
