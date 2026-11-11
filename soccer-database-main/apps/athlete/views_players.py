"""球员库接口：列表 / 详情 / 公示开关 / 我的比赛明细。

挂在 /api/players*，数据源为 accounts.AthleteProfile 与赛事事件。
"""
from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import AthleteProfile
from apps.common.codes import ResponseCode
from apps.common.exceptions import BusinessException
from apps.common.formatting import mask_id_card
from apps.common.permissions import role_permission
from apps.live.models import Match, MatchEvent
from apps.org.models import GroupType
from apps.org.views import MyTeamSerializer

GROUP_LABELS = {
    GroupType.UNIVERSITY: '高校组',
    GroupType.MIDDLE_SCHOOL: '中学组',
    GroupType.PRIMARY_SCHOOL: '小学组',
}
GROUP_CODES = {label: code for code, label in GROUP_LABELS.items()}


def public_status(profile: AthleteProfile) -> str:
    if profile.publicized:
        return '已公示'
    if profile.status == 'approved':
        return '待审核'
    return '未公示'


def player_row(profile: AthleteProfile) -> dict:
    team = profile.team
    school = team.school if team else None
    return {
        'id': profile.id,
        'name': profile.name,
        'idCard': mask_id_card(profile.id_card) or '',
        'teamId': team.id if team else 0,
        'team': team.name if team else '',
        'school': school.name if school else '',
        'city': school.city.name if school and school.city else '',
        'group': GROUP_LABELS.get(team.group_type, '') if team else '',
        'jerseyNo': profile.jersey_no or 0,
        'position': profile.position or '中场',
        'birthDate': profile.birth_date.isoformat() if profile.birth_date else '',
        'height': 0,
        'weight': 0,
        'status': public_status(profile),
        'account': profile.user.phone or profile.user.email or '',
    }


def _scope_queryset(user):
    queryset = AthleteProfile.objects.select_related('user', 'team__school__city').all()
    if user.role == 'school':
        profile = user.role_profile()
        queryset = queryset.filter(team__school_id=profile.school_id) if profile and profile.school_id else queryset.none()
    elif user.role in ('city', 'county'):
        profile = user.role_profile()
        queryset = queryset.filter(team__school__city_id=profile.city_id) if profile and profile.city_id else queryset.none()
        if user.role == 'county' and getattr(profile, 'county', None):
            queryset = queryset.filter(team__school__county=profile.county)
    return queryset


class PlayerListView(APIView):
    permission_classes = [role_permission('admin', 'province', 'city', 'county', 'school')]

    def get(self, request):
        queryset = _scope_queryset(request.user)
        keyword = (request.query_params.get('keyword') or '').strip()
        if keyword:
            queryset = queryset.filter(
                Q(name__icontains=keyword)
                | Q(id_card__icontains=keyword)
                | Q(team__name__icontains=keyword)
                | Q(team__school__name__icontains=keyword)
            )
        city = (request.query_params.get('city') or '').strip()
        if city:
            queryset = queryset.filter(team__school__city__name=city)
        group = (request.query_params.get('group') or '').strip()
        if group in GROUP_CODES:
            queryset = queryset.filter(team__group_type=GROUP_CODES[group])
        status_value = (request.query_params.get('status') or '').strip()
        if status_value == '已公示':
            queryset = queryset.filter(publicized=True)
        elif status_value == '待审核':
            queryset = queryset.filter(publicized=False, status='approved')
        elif status_value == '未公示':
            queryset = queryset.exclude(status='approved')

        return Response([player_row(item) for item in queryset.order_by('id')[:500]])


class PlayerDetailView(APIView):
    permission_classes = [role_permission('admin', 'province', 'city', 'county', 'school')]

    def get(self, request, pk: int):
        profile = AthleteProfile.objects.select_related('user', 'team__school__city').filter(pk=pk).first()
        if profile is None:
            raise BusinessException(ResponseCode.NOT_FOUND, '球员不存在', status_code=404)
        return Response(self._detail(profile))

    @staticmethod
    def _detail(profile: AthleteProfile):
        team = profile.team
        matches = []
        season = {
            'matches': 0, 'starts': 0, 'minutes': 0, 'goals': 0, 'assists': 0,
            'yellowCards': 0, 'redCards': 0, 'avgRating': 0, 'goalsPerMatch': 0, 'winRate': 0,
        }
        tournaments = []
        if team is not None:
            finished = list(
                Match.objects.filter(Q(home_team=team) | Q(away_team=team), status='finished')
                .order_by('-match_time')[:30]
            )
            goals = MatchEvent.objects.filter(athlete_id=profile.id, type='goal').count()
            yellow = MatchEvent.objects.filter(athlete_id=profile.id, type='yellow').count()
            red = MatchEvent.objects.filter(athlete_id=profile.id, type='red').count()
            wins = 0
            for match in finished:
                is_home = match.home_team_id == team.id
                my_score = match.home_score if is_home else match.away_score
                other_score = match.away_score if is_home else match.home_score
                if my_score > other_score:
                    wins += 1
                events = {
                    item.type: item
                    for item in MatchEvent.objects.filter(athlete_id=profile.id, match_id=match.id)
                }
                matches.append({
                    'id': str(match.id),
                    'date': match.match_time.strftime('%Y-%m-%d') if match.match_time else '',
                    'tournamentName': '',
                    'opponent': match.away_team_name if is_home else match.home_team_name,
                    'score': f'{my_score} - {other_score}',
                    'result': '胜' if my_score > other_score else ('平' if my_score == other_score else '负'),
                    'starts': False,
                    'minutes': 0,
                    'goals': 1 if 'goal' in events else 0,
                    'assists': 0,
                    'yellowCards': 1 if 'yellow' in events else 0,
                    'redCards': 1 if 'red' in events else 0,
                    'rating': 0,
                })
            total = len(finished)
            season.update({
                'matches': total,
                'goals': goals,
                'yellowCards': yellow,
                'redCards': red,
                'goalsPerMatch': round(goals / total, 2) if total else 0,
                'winRate': round(wins / total * 100) if total else 0,
            })
            if total:
                tournaments.append({
                    'tournamentName': '全部赛事',
                    'matches': total,
                    'goals': goals,
                    'assists': 0,
                    'minutes': 0,
                    'avgRating': 0,
                })
        return {
            'player': player_row(profile),
            'team': MyTeamSerializer(team).data if team else None,
            'season': season,
            'tournaments': tournaments,
            'matches': matches,
        }


class PlayerPublicizeView(APIView):
    permission_classes = [role_permission('admin', 'province')]

    def post(self, request, pk: int):
        profile = AthleteProfile.objects.filter(pk=pk).first()
        if profile is None:
            raise BusinessException(ResponseCode.NOT_FOUND, '球员不存在', status_code=404)
        profile.publicized = bool(request.data.get('publicized'))
        profile.save(update_fields=['publicized', 'updated_at'])
        return Response(player_row(profile))


class MyPlayerRecordsView(APIView):
    """当前运动员账号绑定球队的比赛明细；非运动员账号返回空列表。"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = AthleteProfile.objects.filter(user=request.user).first()
        if profile is None or profile.team_id is None:
            return Response([])
        detail = PlayerDetailView._detail(profile)
        return Response(detail['matches'])
