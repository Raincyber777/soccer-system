"""用户端球队接口，挂在 /api/ 下。"""
from django.urls import path

from .views import MyTeamView, SchoolTeamListView, TeamAthleteView, TeamCoachView

urlpatterns = [
    path('teams/mine', MyTeamView.as_view()),
    path('teams/<int:pk>/athletes', TeamAthleteView.as_view()),
    path('teams/<int:pk>/coaches', TeamCoachView.as_view()),
    path('school/teams', SchoolTeamListView.as_view()),
]
