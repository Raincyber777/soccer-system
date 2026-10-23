# -*- coding: utf-8 -*-
"""teams 路由：纯 API。"""
from django.urls import path

from apps.teams import views

app_name = "teams"

urlpatterns = [
    path("api/v1/teams", views.teams_list, name="api_list"),
    path("api/v1/teams/<int:team_id>", views.team_detail, name="api_detail"),
    path("api/v1/teams/<int:team_id>/reset-password", views.team_reset_password, name="api_reset_password"),
    path("api/v1/teams/<int:team_id>/members", views.team_members, name="api_members"),
    path("api/v1/teams/<int:team_id>/coaches", views.team_coaches, name="api_coaches"),
    path("api/v1/teams/<int:team_id>/matches", views.team_matches, name="api_matches"),
]
