"""行政区划与组织序列化器 + 视图。"""
import uuid

from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import AthleteProfile, CoachProfile, User, UserRole
from apps.common.codes import ResponseCode
from apps.common.exceptions import BusinessException
from apps.common.formatting import mask_id_card
from apps.common.pagination import paginate
from apps.common.permissions import role_permission

from .models import City, Province, School, Team, TeamCoachProfile


class ProvinceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Province
        fields = ('id', 'name', 'code')


class CitySerializer(serializers.ModelSerializer):
    province_name = serializers.CharField(source='province.name', read_only=True)

    class Meta:
        model = City
        fields = ('id', 'province', 'province_name', 'name', 'code')


class SchoolSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source='city.name', read_only=True)

    class Meta:
        model = School
        fields = ('id', 'city', 'city_name', 'name', 'logo', 'address', 'status', 'created_at', 'updated_at')
        read_only_fields = ('created_at', 'updated_at')


class TeamSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.name', read_only=True)
    coach_name = serializers.CharField(source='coach.name', read_only=True)

    class Meta:
        model = Team
        fields = (
            'id', 'school', 'school_name', 'coach', 'coach_name', 'name', 'logo',
            'group_type', 'status', 'reject_reason', 'created_at', 'updated_at',
        )
        read_only_fields = ('coach', 'status', 'reject_reason', 'created_at', 'updated_at')


GROUP_LABELS = {
    'university': '高校组',
    'middle_school': '中学组',
    'primary_school': '小学组',
}
GROUP_CODES = {label: code for code, label in GROUP_LABELS.items()}


class MyTeamSerializer(serializers.ModelSerializer):
    """用户端「我的球队」：字段对齐前端 Team 契约。"""

    city = serializers.CharField(source='school.city.name', read_only=True)
    school = serializers.CharField(source='school.name', read_only=True)
    school_code = serializers.SerializerMethodField()
    group = serializers.SerializerMethodField()
    owner_account = serializers.SerializerMethodField()
    coaches = serializers.SerializerMethodField()
    players = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = (
            'id', 'name', 'city', 'school', 'school_code', 'group',
            'found_time', 'captain', 'intro',
            'flag_uploaded', 'logo_uploaded', 'photo_uploaded', 'honor_uploaded',
            'owner_account', 'updated_at', 'coaches', 'players',
        )

    def get_school_code(self, obj):
        return str(obj.school_id)

    def get_group(self, obj):
        return GROUP_LABELS.get(obj.group_type, obj.group_type)

    def get_owner_account(self, obj):
        return obj.coach.phone or obj.coach.email or obj.coach.name

    def get_coaches(self, obj):
        members = [
            {
                'id': str(item.id),
                'name': item.name,
                'category': item.category,
                'level': item.level,
                'phone': item.phone,
            }
            for item in obj.coach_members.all()
        ]
        if members:
            return members
        profiles = CoachProfile.objects.filter(user=obj.coach)
        return [
            {
                'id': str(profile.id),
                'name': profile.name,
                'category': '专职教练员',
                'level': '',
                'phone': profile.phone or '',
            }
            for profile in profiles
        ]

    def get_players(self, obj):
        profiles = AthleteProfile.objects.filter(team=obj).order_by('jersey_no', 'id')
        return [
            {
                'id': str(profile.id),
                'name': profile.name,
                'idCard': mask_id_card(profile.id_card) or '',
                'birthDate': profile.birth_date.isoformat() if profile.birth_date else '',
                'position': profile.position or '中场',
                'jerseyNo': profile.jersey_no or 0,
                'photoUploaded': bool(profile.avatar_path),
            }
            for profile in profiles
        ]


class MyTeamView(APIView):
    """当前账号的球队：教练取自己执教的球队，校级取本校第一支球队。"""
    permission_classes = [role_permission('coach', 'personal', 'school', 'admin')]

    def get(self, request):
        team = self._team_of(request.user)
        return Response(MyTeamSerializer(team).data if team else None)

    def put(self, request):
        user = request.user
        team = self._team_of(user)
        data = request.data

        if team is None:
            if user.role not in ('coach', 'personal'):
                raise BusinessException(ResponseCode.FORBIDDEN, '仅教练或球队负责人可创建球队')
            school = self._resolve_school(data)
            team = Team(school=school, coach=user, name=data.get('name') or '我的球队')
            team.group_type = self._resolve_group(data)

        for field in ('name', 'found_time', 'captain', 'intro'):
            if field in data:
                setattr(team, field, data.get(field) or '')
        for field in ('flag_uploaded', 'logo_uploaded', 'photo_uploaded', 'honor_uploaded'):
            if field in data:
                setattr(team, field, bool(data.get(field)))
        if 'group_type' in data or 'group' in data:
            team.group_type = self._resolve_group(data)
        if 'school_id' in data or 'schoolCode' in data:
            team.school = self._resolve_school(data)

        team.save()
        return Response(MyTeamSerializer(team).data)

    @staticmethod
    def _team_of(user):
        if user.role in ('coach', 'personal'):
            return Team.objects.filter(coach=user).order_by('id').first()
        if user.role == 'school':
            profile = user.role_profile()
            if profile and profile.school_id:
                return Team.objects.filter(school_id=profile.school_id).order_by('id').first()
            return None
        return Team.objects.order_by('id').first()

    @staticmethod
    def _resolve_group(data):
        value = data.get('group_type') or data.get('group') or 'middle_school'
        return GROUP_CODES.get(value, value)

    @staticmethod
    def _resolve_school(data):
        raw = data.get('school_id') or data.get('schoolCode')
        school = None
        if raw:
            try:
                school = School.objects.filter(pk=int(raw)).first()
            except (TypeError, ValueError):
                school = None
        if school is None:
            name = (data.get('school') or '').strip()
            if name:
                school = School.objects.filter(name=name).first()
        if school is None:
            raise BusinessException(ResponseCode.PARAM_INVALID, '请选择所属学校')
        return school


RosterPermission = role_permission('coach', 'personal', 'school', 'admin', 'province')


class TeamAthleteInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=50)
    idCard = serializers.CharField(max_length=18, required=False, allow_blank=True, allow_null=True, default='')
    birthDate = serializers.DateField(required=False, allow_null=True)
    position = serializers.ChoiceField(
        choices=['门将', '后卫', '中场', '前锋'], required=False, default='中场'
    )
    jerseyNo = serializers.IntegerField(min_value=0, max_value=99, required=False, default=0)
    photoUploaded = serializers.BooleanField(required=False, default=False)


class TeamCoachInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=50)
    category = serializers.CharField(max_length=30, required=False, default='专职教练员')
    level = serializers.CharField(max_length=30, required=False, allow_blank=True, default='')
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')


def _get_team(pk: int) -> Team:
    team = Team.objects.filter(pk=pk).select_related('school', 'coach').first()
    if team is None:
        raise BusinessException(ResponseCode.NOT_FOUND, '球队不存在', status_code=404)
    return team


def _ensure_team_scope(request, team: Team):
    user = request.user
    if user.role in ('admin', 'province'):
        return
    if user.role in ('coach', 'personal'):
        if team.coach_id != user.id:
            raise BusinessException(ResponseCode.FORBIDDEN, '仅可维护自己的球队')
        return
    if user.role == 'school':
        profile = user.role_profile()
        if not profile or profile.school_id != team.school_id:
            raise BusinessException(ResponseCode.FORBIDDEN, '仅可维护本校球队')
        return
    raise BusinessException(ResponseCode.FORBIDDEN, '无操作权限')


def _athlete_row(profile: AthleteProfile) -> dict:
    return {
        'id': str(profile.id),
        'name': profile.name,
        'idCard': mask_id_card(profile.id_card) or '',
        'birthDate': profile.birth_date.isoformat() if profile.birth_date else '',
        'position': profile.position or '中场',
        'jerseyNo': profile.jersey_no or 0,
        'photoUploaded': bool(profile.avatar_path),
    }


def _coach_row(coach: TeamCoachProfile) -> dict:
    return {
        'id': str(coach.id),
        'name': coach.name,
        'category': coach.category,
        'level': coach.level,
        'phone': coach.phone,
    }


class TeamAthleteView(APIView):
    """球队球员名单：GET 读取，PUT 整体保存（增删改一次完成）。"""

    permission_classes = [RosterPermission]

    def get(self, request, pk: int):
        team = _get_team(pk)
        _ensure_team_scope(request, team)
        profiles = AthleteProfile.objects.filter(team=team).order_by('jersey_no', 'id')
        return Response([_athlete_row(item) for item in profiles])

    def put(self, request, pk: int):
        team = _get_team(pk)
        _ensure_team_scope(request, team)
        raw = request.data if isinstance(request.data, list) else request.data.get('members', [])
        serializer = TeamAthleteInputSerializer(data=raw, many=True)
        serializer.is_valid(raise_exception=True)

        existing = list(AthleteProfile.objects.filter(team=team))
        by_name = {(item.name or '').strip(): item for item in existing}
        by_card = {item.id_card: item for item in existing if item.id_card}
        kept_ids = set()
        for row in serializer.validated_data:
            name = (row.get('name') or '').strip()
            id_card = (row.get('idCard') or '').strip()
            if '*' in id_card:
                id_card = ''
            profile = by_name.get(name) or (by_card.get(id_card) if id_card else None)
            if profile is None:
                user = User(username=f'roster_{uuid.uuid4().hex[:12]}', name=name, role=UserRole.ATHLETE)
                user.set_unusable_password()
                user.save()
                profile = AthleteProfile.objects.create(user=user, team=team, status='pending')
            profile.name = name
            if id_card:
                profile.id_card = id_card
            profile.birth_date = row.get('birthDate')
            profile.position = row.get('position') or '中场'
            profile.jersey_no = row.get('jerseyNo') or 0
            profile.avatar_path = 'roster/photo' if row.get('photoUploaded') else None
            profile.save()
            kept_ids.add(profile.id)

        AthleteProfile.objects.filter(team=team).exclude(id__in=kept_ids).delete()
        profiles = AthleteProfile.objects.filter(team=team).order_by('jersey_no', 'id')
        return Response([_athlete_row(item) for item in profiles])


class TeamCoachView(APIView):
    """球队教练组：GET 读取，PUT 整体替换。"""

    permission_classes = [RosterPermission]

    def get(self, request, pk: int):
        team = _get_team(pk)
        _ensure_team_scope(request, team)
        members = team.coach_members.all()
        if members:
            return Response([_coach_row(item) for item in members])
        coaches = CoachProfile.objects.filter(user=team.coach)
        return Response([
            {
                'id': str(item.id),
                'name': item.name,
                'category': '专职教练员',
                'level': '',
                'phone': item.phone or '',
            }
            for item in coaches
        ])

    def put(self, request, pk: int):
        team = _get_team(pk)
        _ensure_team_scope(request, team)
        raw = request.data if isinstance(request.data, list) else request.data.get('coaches', [])
        serializer = TeamCoachInputSerializer(data=raw, many=True)
        serializer.is_valid(raise_exception=True)

        team.coach_members.all().delete()
        created = [
            TeamCoachProfile.objects.create(
                team=team,
                name=row['name'],
                category=row.get('category') or '专职教练员',
                level=row.get('level') or '',
                phone=row.get('phone') or '',
            )
            for row in serializer.validated_data
        ]
        return Response([_coach_row(item) for item in created])


class SchoolTeamListView(APIView):
    """校级端本校球队列表，字段对齐前端 Team 契约。"""

    permission_classes = [role_permission('school', 'admin', 'province')]

    def get(self, request):
        user = request.user
        if user.role == 'school':
            profile = user.role_profile()
            if not profile or not profile.school_id:
                return Response([])
            queryset = Team.objects.filter(school_id=profile.school_id)
        else:
            queryset = Team.objects.all()
        return Response([MyTeamSerializer(team).data for team in queryset.order_by('id')])


def _paginated(model, request, serializer_class, queryset=None, keyword_fields=('name',)):
    queryset = queryset if queryset is not None else model.objects.all()
    keyword = request.query_params.get('keyword')
    if keyword:
        from django.db.models import Q

        condition = Q()
        for field in keyword_fields:
            condition |= Q(**{f'{field}__icontains': keyword})
        queryset = queryset.filter(condition)

    data = paginate(queryset, request)
    data['list'] = serializer_class(data['list'], many=True).data
    return data


class ProvinceListCreateView(APIView):
    permission_classes = [role_permission('admin')]

    def get(self, request):
        return Response(_paginated(Province, request, ProvinceSerializer))

    def post(self, request):
        serializer = ProvinceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ProvinceDetailView(APIView):
    permission_classes = [role_permission('admin')]

    def get(self, request, pk: int):
        return Response(ProvinceSerializer(_get(Province, pk, '省份')).data)

    def put(self, request, pk: int):
        obj = _get(Province, pk, '省份')
        serializer = ProvinceSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk: int):
        _get(Province, pk, '省份').delete()
        return Response({'id': pk})


class CityListCreateView(APIView):
    permission_classes = [role_permission('admin', 'city')]

    def get(self, request):
        queryset = City.objects.all()
        province_id = request.query_params.get('province_id')
        if province_id:
            queryset = queryset.filter(province_id=province_id)
        user = request.user
        if user.role == 'city':
            profile = user.role_profile()
            if not profile or not profile.city_id:
                return Response({'list': [], 'total': 0, 'page': 1, 'page_size': 20})
            queryset = queryset.filter(pk=profile.city_id)
        return Response(_paginated(City, request, CitySerializer, queryset))

    def post(self, request):
        serializer = CitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class CityDetailView(APIView):
    permission_classes = [role_permission('admin')]

    def get(self, request, pk: int):
        return Response(CitySerializer(_get(City, pk, '城市')).data)

    def put(self, request, pk: int):
        obj = _get(City, pk, '城市')
        serializer = CitySerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk: int):
        _get(City, pk, '城市').delete()
        return Response({'id': pk})


class SchoolListCreateView(APIView):
    permission_classes = [role_permission('admin', 'school', 'city')]

    def get(self, request):
        queryset = School.objects.all()
        city_id = request.query_params.get('city_id')
        if city_id:
            queryset = queryset.filter(city_id=city_id)
        user = request.user
        if user.role == 'school':
            profile = user.role_profile()
            queryset = queryset.filter(pk=profile.school_id) if profile and profile.school_id else queryset.none()
        elif user.role == 'city':
            profile = user.role_profile()
            queryset = queryset.filter(city_id=profile.city_id) if profile and profile.city_id else queryset.none()
        return Response(_paginated(School, request, SchoolSerializer, queryset))

    def post(self, request):
        serializer = SchoolSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by=request.user.id)
        return Response(serializer.data)


class SchoolDetailView(APIView):
    permission_classes = [role_permission('admin', 'school')]

    def get(self, request, pk: int):
        self._ensure_scope(request, pk)
        return Response(SchoolSerializer(_get(School, pk, '学校')).data)

    def put(self, request, pk: int):
        self._ensure_scope(request, pk)
        obj = _get(School, pk, '学校')
        serializer = SchoolSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk: int):
        self._ensure_scope(request, pk)
        _get(School, pk, '学校').delete()
        return Response({'id': pk})

    @staticmethod
    def _ensure_scope(request, pk: int):
        user = request.user
        if user.role != 'school':
            return
        profile = user.role_profile()
        if not profile or profile.school_id != pk:
            raise BusinessException(ResponseCode.FORBIDDEN, '仅可操作本校数据')


class TeamListView(APIView):
    """球队列表：管理员全量，校级仅本校。"""

    permission_classes = [role_permission('admin', 'school')]

    def get(self, request):
        queryset = Team.objects.all()
        status_value = request.query_params.get('status')
        if status_value:
            queryset = queryset.filter(status=status_value)
        user = request.user
        if user.role == 'school':
            profile = user.role_profile()
            queryset = queryset.filter(school_id=profile.school_id) if profile and profile.school_id else queryset.none()
        return Response(_paginated(Team, request, TeamSerializer, queryset))


def _get(model, pk: int, label: str):
    obj = model.objects.filter(pk=pk).first()
    if obj is None:
        raise BusinessException(ResponseCode.NOT_FOUND, f'{label}不存在', status_code=404)
    return obj
