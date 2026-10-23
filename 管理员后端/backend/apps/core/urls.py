# -*- coding: utf-8 -*-
"""core 路由：基础接口。"""
from django.urls import path

from apps.core import views

app_name = "core"

urlpatterns = [
    path("health", views.health, name="health"),
]
