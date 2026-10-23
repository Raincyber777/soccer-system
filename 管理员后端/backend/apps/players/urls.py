# -*- coding: utf-8 -*-
"""players 路由：纯 API。"""
from django.urls import path

from apps.players import views

app_name = "players"

urlpatterns = [
    path("api/v1/players", views.players_list, name="api_list"),
    path("api/v1/players/<int:player_id>", views.player_detail, name="api_detail"),
]
