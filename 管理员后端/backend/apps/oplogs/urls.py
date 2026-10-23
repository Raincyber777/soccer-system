# -*- coding: utf-8 -*-
"""oplogs 路由：日志只读 API。"""
from django.urls import path

from apps.oplogs import views

app_name = "oplogs"

urlpatterns = [
    path("api/v1/operation-logs", views.logs_list, name="api_list"),
    path("api/v1/operation-logs/<int:log_id>", views.log_detail, name="api_detail"),
]
