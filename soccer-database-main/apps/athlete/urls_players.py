"""球员库路由，挂在 /api/ 下。"""
from django.urls import path

from .views_players import MyPlayerRecordsView, PlayerDetailView, PlayerListView, PlayerPublicizeView

urlpatterns = [
    path('players', PlayerListView.as_view()),
    path('players/mine/records', MyPlayerRecordsView.as_view()),
    path('players/<int:pk>', PlayerDetailView.as_view()),
    path('players/<int:pk>/publicize', PlayerPublicizeView.as_view()),
]
