"""前后端联调冒烟测试（与 Apifox 用例同序）。

前置：
  1. 后端已 migrate、seed_admin；
  2. 服务运行在 http://127.0.0.1:8000；
  3. 使用后端虚拟环境执行：.venv\\Scripts\\python scripts\\apifox_smoke.py

输出：控制台 PASS/FAIL，并写入 docs/api/smoke-result.md
"""
import io
import os
import random
import sys
import uuid
from datetime import datetime
from pathlib import Path

import requests

BASE = os.getenv('BASE_URL', 'http://127.0.0.1:8000')
ROOT = Path(__file__).resolve().parent.parent
RESULT = ROOT.parent / 'soccer-system' / 'docs' / 'api' / 'smoke-result.md'
sys.path.insert(0, str(ROOT))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django  # noqa: E402
from django.utils import timezone as dj_timezone  # noqa: E402

django.setup()

from apps.accounts.models import (  # noqa: E402
    AthleteProfile,
    CityProfile,
    CoachProfile,
    SchoolProfile,
    User,
    UserRole,
)
from apps.common.permissions import SCHOOL_ADMIN_PERMISSIONS  # noqa: E402
from apps.live.models import Match, MatchStatus  # noqa: E402
from apps.org.models import City, GroupType, Province, School, Team, TeamStatus  # noqa: E402
from apps.registration.models import Competition, Registration  # noqa: E402

PASSED = []
FAILED = []


def check(name, condition, detail=''):
    if condition:
        PASSED.append(name)
        print(f'  [PASS] {name}')
    else:
        FAILED.append(f'{name} :: {detail}')
        print(f'  [FAIL] {name} :: {detail}')


def api(method, path, token=None, **kwargs):
    headers = kwargs.pop('headers', {})
    if token:
        headers['Authorization'] = f'Bearer {token}'
    resp = requests.request(method, f'{BASE}{path}', headers=headers, timeout=20, **kwargs)
    try:
        body = resp.json()
    except ValueError:
        body = {'raw': resp.text[:200]}
    return resp.status_code, body


def ok(body):
    return body.get('code') == 0


def fixture():
    province, _ = Province.objects.get_or_create(code='510000', defaults={'name': '四川省'})
    city, _ = City.objects.get_or_create(province=province, code='510100', defaults={'name': '成都市'})
    school, _ = School.objects.get_or_create(name='成都实验中学', defaults={'city': city})
    school.city = city
    school.save()

    coach, _ = User.objects.get_or_create(
        phone='13900000001',
        defaults={'username': '13900000001', 'name': '李教练', 'role': UserRole.COACH},
    )
    coach.set_password('pass1234')
    coach.save()
    CoachProfile.objects.update_or_create(
        user=coach,
        defaults={
            'name': '李教练',
            'status': 'approved',
            'qualification_path': 'demo/coach-qualification.pdf',
            'qualification_name': '教练资质.pdf',
        },
    )

    team, _ = Team.objects.get_or_create(
        name='成都实验中学足球队',
        defaults={'school': school, 'coach': coach, 'group_type': GroupType.MIDDLE_SCHOOL, 'status': TeamStatus.APPROVED},
    )
    team.school = school
    team.coach = coach
    team.status = TeamStatus.APPROVED
    team.found_time = '2018-09-01'
    team.captain = '王球员'
    team.intro = '成都实验中学足球队成立于 2018 年，长期开展校园足球训练与各级比赛。'
    team.flag_uploaded = True
    team.logo_uploaded = True
    team.photo_uploaded = True
    team.save()

    opponent, _ = Team.objects.get_or_create(
        name='绵阳南山中学',
        defaults={'school': school, 'coach': coach, 'group_type': GroupType.MIDDLE_SCHOOL, 'status': TeamStatus.APPROVED},
    )
    opponent.school = school
    opponent.coach = coach
    opponent.status = TeamStatus.APPROVED
    opponent.save()

    # 用户端「球队负责人」演示账号：personal 角色拥有自己的球队
    leader, _ = User.objects.get_or_create(
        phone='13500000001',
        defaults={'username': '13500000001', 'name': '杨立科', 'role': UserRole.PERSONAL},
    )
    leader.set_password('pass1234')
    leader.save()
    CoachProfile.objects.update_or_create(
        user=leader,
        defaults={
            'name': '杨立科',
            'status': 'approved',
            'qualification_path': 'demo/leader-qualification.pdf',
            'qualification_name': '负责人资质.pdf',
        },
    )
    leader_team, _ = Team.objects.get_or_create(
        name='成都实验中学一队',
        defaults={'school': school, 'coach': leader, 'group_type': GroupType.MIDDLE_SCHOOL, 'status': TeamStatus.APPROVED},
    )
    leader_team.school = school
    leader_team.coach = leader
    leader_team.status = TeamStatus.APPROVED
    leader_team.found_time = '2019-09-01'
    leader_team.captain = '刘队长'
    leader_team.intro = '成都实验中学一队由学校球队负责人组建，长期参加成都市青少年足球赛事。'
    leader_team.flag_uploaded = True
    leader_team.logo_uploaded = True
    leader_team.photo_uploaded = True
    leader_team.save()

    for index, name in enumerate(('刘队长', '陈二', '杨三', '黄四', '吴五'), start=1):
        player_user, _ = User.objects.get_or_create(
            phone=f'1381000000{index}',
            defaults={'username': f'1381000000{index}', 'name': name, 'role': UserRole.ATHLETE},
        )
        player_user.set_password('pass1234')
        player_user.save()
        player_profile, _ = AthleteProfile.objects.get_or_create(user=player_user, defaults={'name': name})
        player_profile.team = leader_team
        player_profile.jersey_no = index
        player_profile.position = '中场'
        player_profile.status = 'approved'
        player_profile.enrollment_cert_path = 'demo/enrollment-cert.pdf'
        player_profile.enrollment_cert_name = '学籍证明.pdf'
        player_profile.save()

    athlete_user, _ = User.objects.get_or_create(
        phone='13800000001',
        defaults={'username': '13800000001', 'name': '王球员', 'role': UserRole.ATHLETE},
    )
    athlete_user.set_password('pass1234')
    athlete_user.save()
    profile, _ = AthleteProfile.objects.get_or_create(user=athlete_user, defaults={'name': '王球员'})
    profile.team = team
    profile.jersey_no = 10
    profile.position = '中场'
    profile.status = 'approved'
    profile.enrollment_cert_path = 'demo/enrollment-cert.pdf'
    profile.enrollment_cert_name = '学籍证明.pdf'
    profile.save()

    # 报名资格要求至少 5 名球员，补齐演示阵容
    for index, name in enumerate(('李四', '赵五', '孙六', '周七'), start=2):
        player_user, _ = User.objects.get_or_create(
            phone=f'1380000000{index}',
            defaults={'username': f'1380000000{index}', 'name': name, 'role': UserRole.ATHLETE},
        )
        player_user.set_password('pass1234')
        player_user.save()
        player_profile, _ = AthleteProfile.objects.get_or_create(user=player_user, defaults={'name': name})
        player_profile.team = team
        player_profile.jersey_no = index
        player_profile.position = '后卫'
        player_profile.status = 'approved'
        player_profile.enrollment_cert_path = 'demo/enrollment-cert.pdf'
        player_profile.enrollment_cert_name = '学籍证明.pdf'
        player_profile.save()

    competition, _ = Competition.objects.get_or_create(
        name='2026 四川省青少年足球联赛', year=2026, defaults={'status': Competition.Status.OPEN},
    )
    competition.status = Competition.Status.OPEN
    competition.save()

    # 用户端提交报名专用赛事（与审核用例的赛事分开，避免重复报名）
    submit_competition, _ = Competition.objects.get_or_create(
        name='2026 成都市青少年足球杯', year=2026, defaults={'status': Competition.Status.OPEN},
    )
    submit_competition.status = Competition.Status.OPEN
    submit_competition.save()
    Registration.objects.filter(competition=submit_competition, team=team).delete()
    Registration.objects.filter(competition=submit_competition, team=leader_team).delete()

    # 浏览器联调用的市州 / 校级账号
    city_user, _ = User.objects.get_or_create(
        phone='13600000001',
        defaults={'username': '13600000001', 'name': '成都市管理员', 'role': UserRole.CITY},
    )
    city_user.set_password('pass1234')
    city_user.save()
    CityProfile.objects.update_or_create(user=city_user, defaults={'name': '成都市管理员', 'city': city})

    school_user, _ = User.objects.get_or_create(
        phone='13700000001',
        defaults={'username': '13700000001', 'name': '校级管理员', 'role': UserRole.SCHOOL},
    )
    school_user.set_password('pass1234')
    school_user.permissions = list(SCHOOL_ADMIN_PERMISSIONS)
    school_user.save()
    SchoolProfile.objects.update_or_create(user=school_user, defaults={'name': '校级管理员', 'school': school})

    registration = Registration.objects.filter(competition=competition, team=team).first()
    if registration is None:
        registration = Registration.objects.create(competition=competition, team=team)
    registration.status = Registration.Status.SUBMITTED
    registration.reject_level = None
    registration.reject_reason = None
    registration.submitted_at = dj_timezone.now()
    registration.save()

    match = Match.objects.filter(home_team_name=team.name, away_team_name=opponent.name).order_by('id').first()
    if match is None:
        match = Match.objects.create(
            group_type=GroupType.MIDDLE_SCHOOL,
            home_team_name=team.name, away_team_name=opponent.name,
            home_team=team, away_team=opponent,
            match_time='2026-10-26T15:00:00+08:00',
            venue='成都体育中心', status=MatchStatus.FINISHED,
            home_score=2, away_score=1,
        )
    match.home_team = team
    match.away_team = opponent
    match.save()
    return team, opponent, competition, registration, match, profile


def main():
    print('== 0. 准备数据 ==')
    team, opponent, competition, registration, match, profile = fixture()
    suffix = uuid.uuid4().hex[:6]
    phone = f'137{random.randint(10000000, 99999999)}'

    print('== 1. 健康检查与认证 ==')
    status, body = api('GET', '/api/health')
    check('GET /api/health', status == 200 and ok(body), str(body)[:200])

    status, body = api('POST', '/api/auth/register', json={
        'name': f'冒烟测试{suffix}', 'phone': phone, 'password': 'pass1234', 'role': 'personal',
    })
    check('POST /api/auth/register', ok(body) and body.get('data', {}).get('token'), str(body)[:200])

    status, body = api('POST', '/api/auth/login', json={'phone': phone, 'password': 'pass1234'})
    personal_token = body.get('data', {}).get('token')
    check('POST /api/auth/login（手机号）', ok(body) and personal_token, str(body)[:200])

    status, body = api('GET', '/api/auth/me', token=personal_token)
    check('GET /api/auth/me', ok(body) and body.get('data', {}).get('role') == 'personal', str(body)[:200])

    status, body = api('POST', '/api/admin/auth/login', json={'email': 'admin@ball.local', 'password': 'admin123'})
    admin_token = body.get('data', {}).get('token')
    check('POST /api/admin/auth/login（邮箱）', ok(body) and admin_token, str(body)[:200])

    status, body = api('POST', '/api/auth/login', json={'phone': '13900000001', 'password': 'pass1234'})
    coach_token = body.get('data', {}).get('token')
    check('教练登录', ok(body) and coach_token, str(body)[:200])

    status, body = api('POST', '/api/auth/login', json={'phone': '13800000001', 'password': 'pass1234'})
    athlete_token = body.get('data', {}).get('token')
    check('运动员登录', ok(body) and athlete_token, str(body)[:200])

    print('== 2. 赛事与报名 ==')
    status, body = api('GET', '/api/teams/mine', token=coach_token)
    team_data = body.get('data') or {}
    check('GET /api/teams/mine（教练球队）', ok(body) and len(team_data.get('players') or []) >= 5,
          str(body)[:250])

    status, body = api('GET', '/api/competitions', token=coach_token)
    competitions = (body.get('data') or {}).get('list') or []
    submit_competition = next((item for item in competitions if item.get('name') == '2026 成都市青少年足球杯'), None)
    check('GET /api/competitions 含可报名赛事', ok(body) and submit_competition is not None, str(body)[:250])

    if submit_competition:
        status, body = api('POST', '/api/registrations', token=coach_token, json={
            'competition_id': submit_competition['id'], 'team_id': team.id,
        })
        submit_reg_id = (body.get('data') or {}).get('id')
        check('POST /api/registrations（用户提交报名）', ok(body) and submit_reg_id, str(body)[:250])

        if submit_reg_id:
            status, body = api('POST', f'/api/registrations/{submit_reg_id}/stamped-form', token=coach_token,
                               files={'file': ('报名表.pdf', b'%PDF-1.4 stamped-form', 'application/pdf')})
            check('POST 盖章报名表上传', ok(body), str(body)[:200])

            status, body = api('POST', f'/api/registrations/{submit_reg_id}/submit', token=coach_token)
            check('POST 提交报名审核', ok(body) and body.get('data', {}).get('status') == 'submitted',
                  str(body)[:250])

    status, body = api('GET', '/api/competitions', token=coach_token)
    check('GET /api/competitions', ok(body) and body.get('data', {}).get('list'), str(body)[:200])

    status, body = api('GET', '/api/registrations', token=coach_token)
    check('GET /api/registrations（我的报名）', ok(body) and body.get('data', {}).get('list') is not None, str(body)[:200])

    print('== 2.1 球队成员与球员库 ==')
    status, body = api('GET', f'/api/teams/{team.id}/athletes', token=coach_token)
    athletes = body.get('data') or []
    check('GET 球队球员名单', ok(body) and len(athletes) >= 5, str(body)[:200])

    roster = [
        {
            'name': item['name'],
            'idCard': item.get('idCard') or '',
            'birthDate': item.get('birthDate') or None,
            'position': item.get('position') or '中场',
            'jerseyNo': item.get('jerseyNo') or 0,
            'photoUploaded': item.get('photoUploaded', False),
        }
        for item in athletes
    ]
    roster.append({'name': '冒烟球员', 'idCard': '', 'position': '前锋', 'jerseyNo': 66, 'photoUploaded': False})
    status, body = api('PUT', f'/api/teams/{team.id}/athletes', token=coach_token, json={'members': roster})
    check('PUT 保存球队球员名单', ok(body) and len(body.get('data') or []) >= 6, str(body)[:250])

    status, body = api('GET', f'/api/teams/{team.id}/coaches', token=coach_token)
    coaches = body.get('data') or []
    check('GET 球队教练组', ok(body) and len(coaches) >= 1, str(body)[:200])

    coach_rows = [
        {'name': item['name'], 'category': item['category'], 'level': item.get('level') or '',
         'phone': item.get('phone') or ''}
        for item in coaches
    ]
    if not any(item['name'] == '冒烟教练' for item in coach_rows):
        coach_rows.append({'name': '冒烟教练', 'category': '专职教练员', 'level': 'C级', 'phone': '13900000009'})
    status, body = api('PUT', f'/api/teams/{team.id}/coaches', token=coach_token, json={'coaches': coach_rows})
    check('PUT 保存球队教练组', ok(body) and len(body.get('data') or []) >= 2, str(body)[:250])

    status, body = api('GET', '/api/players', token=admin_token)
    players = body.get('data') or []
    check('GET /api/players（球员库）', ok(body) and len(players) >= 5, str(body)[:200])
    player_id = players[0]['id'] if players else None

    if player_id:
        status, body = api('GET', f'/api/players/{player_id}', token=admin_token)
        detail = body.get('data') or {}
        check('GET /api/players/{id}', ok(body) and detail.get('player', {}).get('id') == player_id,
              str(body)[:250])
        status, body = api('POST', f'/api/players/{player_id}/publicize', token=admin_token,
                           json={'publicized': True})
        check('POST 球员公示', ok(body) and body.get('data', {}).get('status') == '已公示', str(body)[:200])
        status, body = api('POST', f'/api/players/{player_id}/publicize', token=admin_token,
                           json={'publicized': False})
        check('POST 取消球员公示', ok(body) and body.get('data', {}).get('status') != '已公示', str(body)[:200])

    status, body = api('GET', '/api/players/mine/records', token=athlete_token)
    check('GET /api/players/mine/records', ok(body) and isinstance(body.get('data'), list), str(body)[:200])

    reg_id = registration.id
    status, body = api('GET', '/api/city/registrations', token=admin_token)
    check('GET /api/city/registrations', ok(body) and body.get('data', {}).get('list') is not None, str(body)[:200])

    status, body = api('POST', f'/api/city/registrations/{reg_id}/approve', token=admin_token)
    check('POST /api/city/registrations/{id}/approve', ok(body) and body.get('data', {}).get('status') == 'city_approved',
          str(body)[:250])

    status, body = api('POST', f'/api/city/registrations/{reg_id}/report', token=admin_token)
    check('POST /api/city/registrations/{id}/report', ok(body) and body.get('data', {}).get('status') == 'reported',
          str(body)[:250])

    status, body = api('POST', f'/api/province/registrations/{reg_id}/approve', token=admin_token)
    check('POST /api/province/registrations/{id}/approve', ok(body) and body.get('data', {}).get('status') == 'approved',
          str(body)[:250])

    print('== 3. 公众直播 ==')
    status, body = api('GET', '/api/public/live/matches')
    public_list = body.get('data', {}).get('list') or []
    check('GET /api/public/live/matches', ok(body) and public_list, str(body)[:200])
    public_id = public_list[0]['id'] if public_list else match.id

    status, body = api('GET', f'/api/public/live/matches/{public_id}')
    check('GET /api/public/live/matches/{id}', ok(body) and body.get('data', {}).get('id') == public_id, str(body)[:200])

    status, body = api('GET', f'/api/public/live/matches/{public_id}/events?since_id=999999')
    check('GET /public/live/matches/{id}/events', ok(body) and isinstance(body.get('data'), list), str(body)[:200])

    print('== 4. 校级比赛运营 ==')
    status, body = api('GET', '/api/school/live/matches', token=admin_token)
    check('GET /api/school/live/matches', ok(body) and body.get('data', {}).get('list') is not None, str(body)[:200])

    status, body = api('POST', '/api/school/live/matches', token=admin_token, json={
        'group_type': 'middle_school',
        'home_team_id': team.id, 'away_team_id': opponent.id,
        'home_team_name': team.name, 'away_team_name': opponent.name,
        'match_time': '2026-11-01T15:00:00+08:00', 'venue': '联调测试场地',
    })
    new_match = body.get('data') or {}
    match_id = new_match.get('id')
    version = new_match.get('version')
    check('POST /api/school/live/matches', ok(body) and match_id and version is not None, str(body)[:250])

    status, body = api('PUT', f'/api/school/live/matches/{match_id}', token=admin_token, json={
        'version': 999, 'venue': '错误版本',
    })
    check('PUT 比赛版本冲突（code=9）', body.get('code') == 9, str(body)[:200])

    status, body = api('PUT', f'/api/school/live/matches/{match_id}', token=admin_token, json={
        'version': version, 'venue': '联调测试场地-改',
    })
    version = (body.get('data') or {}).get('version', version)
    check('PUT 比赛更新', ok(body) and body.get('data', {}).get('venue') == '联调测试场地-改', str(body)[:200])

    status, body = api('PATCH', f'/api/school/live/matches/{match_id}/status', token=admin_token, json={
        'action': 'start', 'version': version,
    })
    version = (body.get('data') or {}).get('version', version)
    check('PATCH 开始比赛', ok(body) and body.get('data', {}).get('status') == 'live', str(body)[:200])

    status, body = api('POST', f'/api/school/live/matches/{match_id}/events', token=admin_token, json={
        'type': 'goal', 'minute': 12, 'team_side': 'home', 'player_name': '王球员',
        'player_no': '10', 'client_token': uuid.uuid4().hex, 'athlete_id': profile.id,
    })
    event_id = (body.get('data', {}).get('event') or {}).get('id')
    check('POST 新增进球事件', ok(body) and body.get('data', {}).get('home_score') == 1, str(body)[:250])

    status, body = api('GET', f'/api/school/live/matches/{match_id}/events', token=admin_token)
    check('GET 比赛事件', ok(body) and len(body.get('data') or []) == 1, str(body)[:200])

    status, body = api('DELETE', f'/api/school/live/events/{event_id}', token=admin_token)
    check('DELETE 事件', ok(body), str(body)[:200])

    status, body = api('PUT', f'/api/school/live/matches/{match_id}/referees', token=admin_token, json={
        'referees': [{'role': 'chief', 'name': '张主裁'}, {'role': 'assistant', 'name': '李边裁'}],
    })
    check('PUT 裁判', ok(body) and len(body.get('data') or []) == 2, str(body)[:200])

    status, body = api('GET', f'/api/school/live/matches/{match_id}', token=admin_token)
    version = (body.get('data') or {}).get('version', version)
    status, body = api('PUT', f'/api/school/live/matches/{match_id}/lineup', token=admin_token, json={
        'version': version,
        'lineup_home': [{'name': '王球员', 'no': '10', 'position': '中场'}],
        'lineup_away': [{'name': '赵球员', 'no': '7'}],
    })
    version = (body.get('data') or {}).get('version', version)
    check('PUT 阵容', ok(body) and len(body.get('data', {}).get('lineup_home') or []) == 1, str(body)[:200])

    status, body = api('PUT', f'/api/school/live/matches/{match_id}/live-link', token=admin_token, json={
        'live_link': 'https://live.example.com/room/1',
    })
    check('PUT 直播链接', ok(body) and body.get('data', {}).get('live_link'), str(body)[:200])

    status, body = api('POST', f'/api/school/live/matches/{match_id}/files', token=admin_token,
                       files={'file': ('签到表.txt', b'hello', 'text/plain')}, data={'type': 'sign_in'})
    check('POST 文件非法格式（10006）', body.get('code') == 10006, str(body)[:200])

    status, body = api('POST', f'/api/school/live/matches/{match_id}/files', token=admin_token,
                       files={'file': ('签到表.pdf', b'%PDF-1.4 smoke', 'application/pdf')}, data={'type': 'sign_in'})
    file_id = (body.get('data') or {}).get('id')
    check('POST 文件上传', ok(body) and file_id, str(body)[:200])

    if file_id:
        download = requests.get(f'{BASE}/api/school/live/files/{file_id}/download',
                                headers={'Authorization': f'Bearer {admin_token}'}, timeout=20)
        check('GET 文件下载', download.status_code == 200 and download.content.startswith(b'%PDF'),
              f'status={download.status_code}')
        status, body = api('DELETE', f'/api/school/live/files/{file_id}', token=admin_token)
        check('DELETE 文件', ok(body), str(body)[:200])

    try:
        from PIL import Image

        buffer = io.BytesIO()
        Image.new('RGB', (10, 10), (30, 120, 60)).save(buffer, format='PNG')
        status, body = api('POST', f'/api/school/live/matches/{match_id}/face-verify', token=admin_token,
                           files={'photo': ('face.png', buffer.getvalue(), 'image/png')},
                           data={'player_name': '王球员', 'player_no': '10'})
        check('POST 人脸核验', ok(body) and body.get('data', {}).get('result') == 'pass', str(body)[:200])

        status, body = api('GET', f'/api/school/live/matches/{match_id}/face-verify-records', token=admin_token)
        check('GET 人脸核验记录', ok(body) and len(body.get('data') or []) >= 1, str(body)[:200])
    except ImportError:
        check('POST 人脸核验', False, 'Pillow 未安装')

    status, body = api('GET', f'/api/school/live/matches/{match_id}', token=admin_token)
    version = (body.get('data') or {}).get('version', version)
    status, body = api('PATCH', f'/api/school/live/matches/{match_id}/status', token=admin_token, json={
        'action': 'finish', 'version': version,
    })
    check('PATCH 结束比赛', ok(body) and body.get('data', {}).get('status') == 'finished', str(body)[:200])

    status, body = api('DELETE', f'/api/school/live/matches/{match_id}', token=admin_token)
    check('DELETE 已结束比赛（40002）', body.get('code') == 40002, str(body)[:200])

    status, body = api('POST', '/api/school/live/matches', token=admin_token, json={
        'group_type': 'middle_school',
        'home_team_id': team.id, 'away_team_id': opponent.id,
        'home_team_name': team.name, 'away_team_name': opponent.name,
        'match_time': '2026-11-02T15:00:00+08:00', 'venue': '待删除比赛',
    })
    temp_id = (body.get('data') or {}).get('id')
    status, body = api('DELETE', f'/api/school/live/matches/{temp_id}', token=admin_token)
    check('DELETE 未开始比赛（清理）', ok(body), str(body)[:200])

    print('== 5. 运动员端 ==')
    status, body = api('GET', '/api/athlete/profile', token=athlete_token)
    check('GET /api/athlete/profile', ok(body) and body.get('data', {}).get('team', {}).get('id') == team.id,
          str(body)[:200])
    status, body = api('GET', '/api/athlete/matches', token=athlete_token)
    check('GET /api/athlete/matches', ok(body) and body.get('data', {}).get('list') is not None, str(body)[:200])
    status, body = api('GET', '/api/athlete/stats', token=athlete_token)
    check('GET /api/athlete/stats', ok(body), str(body)[:200])
    status, body = api('GET', '/api/athlete/standings', token=athlete_token)
    check('GET /api/athlete/standings', ok(body) and body.get('data', {}).get('standings'), str(body)[:200])

    print('== 6. 组织端 ==')
    status, body = api('GET', '/api/admin/provinces', token=admin_token)
    check('GET /api/admin/provinces', ok(body) and body.get('data', {}).get('list'), str(body)[:200])
    status, body = api('GET', '/api/admin/cities?province_id=1', token=admin_token)
    check('GET /api/admin/cities', ok(body), str(body)[:200])
    status, body = api('GET', '/api/admin/schools', token=admin_token)
    check('GET /api/admin/schools', ok(body), str(body)[:200])
    status, body = api('GET', '/api/admin/teams', token=admin_token)
    check('GET /api/admin/teams', ok(body), str(body)[:200])

    print('== 7. 权限 ==')
    status, body = api('GET', '/api/admin/provinces', token=personal_token)
    check('个人账号访问管理端（20004）', body.get('code') == 20004, str(body)[:200])

    total = len(PASSED) + len(FAILED)
    print('\n' + '=' * 60)
    print(f'通过 {len(PASSED)} / {total}，失败 {len(FAILED)}')

    lines = [
        '# Apifox 冒烟测试结果',
        '',
        f'- 时间：{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}',
        f'- Base URL：{BASE}',
        f'- 通过：{len(PASSED)} / {total}',
        f'- 失败：{len(FAILED)}',
        '',
        '## 明细',
        '',
        '| 结果 | 用例 |',
        '|---|---|',
    ]
    lines += [f'| PASS | {name} |' for name in PASSED]
    lines += [f'| FAIL | {item} |' for item in FAILED]
    RESULT.parent.mkdir(parents=True, exist_ok=True)
    RESULT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'结果已写入 {RESULT}')

    if FAILED:
        print('\n失败明细：')
        for item in FAILED:
            print('  -', item)
        sys.exit(1)


if __name__ == '__main__':
    main()
