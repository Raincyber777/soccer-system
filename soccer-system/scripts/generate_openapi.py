"""生成 OpenAPI 3.0 文档，供 Apifox / Postman 直接导入。

用法：python scripts/generate_openapi.py
输出：docs/api/openapi.json
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'docs' / 'api' / 'openapi.json'

ENVELOPE = {'$ref': '#/components/schemas/Envelope'}
PAGE = {'$ref': '#/components/schemas/PageData'}


def op(tag, summary, *, method='get', security=True, params=None, body=None, response=None, description='', binary=False):
    content_type = 'application/octet-stream' if binary else 'application/json'
    response_schema = response or ({'type': 'string', 'format': 'binary'} if binary else ENVELOPE)
    operation = {
        'tags': [tag],
        'summary': summary,
        'responses': {
            '200': {
                'description': '二进制文件' if binary else '统一信封',
                'content': {content_type: {'schema': response_schema}},
            }
        },
    }
    if description:
        operation['description'] = description
    if security:
        operation['security'] = [{'bearerAuth': []}]
    if params:
        operation['parameters'] = params
    if body is not None:
        operation['requestBody'] = {
            'required': True,
            'content': {'application/json': {'schema': body}},
        }
    return operation


def p(name, where='query', required=False, schema=None, description=''):
    return {
        'name': name,
        'in': where,
        'required': required,
        'schema': schema or {'type': 'string'},
        'description': description,
    }


PAGE_PARAMS = [
    p('page', schema={'type': 'integer', 'default': 1}),
    p('page_size', schema={'type': 'integer', 'default': 20, 'maximum': 100}),
]

paths = {}

paths['/api/health'] = {
    'get': op('系统', '健康检查', security=False),
}

paths['/api/auth/register'] = {
    'post': op('认证', '注册', security=False, body={'$ref': '#/components/schemas/RegisterRequest'}),
}
paths['/api/auth/login'] = {
    'post': op('认证', '统一登录（手机号）', security=False, body={'$ref': '#/components/schemas/LoginRequest'}),
}
paths['/api/admin/auth/login'] = {
    'post': op('认证', '管理员登录（邮箱）', security=False, body={'$ref': '#/components/schemas/AdminLoginRequest'}),
}
paths['/api/auth/me'] = {
    'get': op('认证', '当前用户'),
}
paths['/api/auth/logout'] = {
    'post': op('认证', '登出', body={'type': 'object', 'properties': {'refresh': {'type': 'string'}}}),
}

paths['/api/competitions'] = {
    'get': op('赛事', '赛事列表', params=PAGE_PARAMS + [p('status', schema={'type': 'string', 'enum': ['open', 'closed']})]),
}

REGISTRATION_FILTERS = PAGE_PARAMS + [
    p('keyword'),
    p('status', schema={'type': 'string', 'enum': ['draft', 'submitted', 'city_approved', 'reported', 'approved', 'rejected']}),
    p('competition_id', schema={'type': 'integer'}),
    p('group_type', schema={'type': 'string', 'enum': ['university', 'middle_school', 'primary_school']}),
    p('city_id', schema={'type': 'integer'}),
]

paths['/api/registrations'] = {
    'get': op('报名', '我的报名单', params=REGISTRATION_FILTERS),
    'post': op('报名', '创建报名单（草稿）', body={'$ref': '#/components/schemas/RegistrationCreate'}),
}
paths['/api/registrations/{id}'] = {
    'get': op('报名', '报名单详情', params=[p('id', 'path', True, {'type': 'integer'})]),
}
paths['/api/registrations/{id}/submit'] = {
    'post': op('报名', '提交/重新提交报名', params=[p('id', 'path', True, {'type': 'integer'})]),
}
paths['/api/registrations/{id}/stamped-form'] = {
    'post': op(
        '报名', '上传盖章报名表', params=[p('id', 'path', True, {'type': 'integer'})],
        body={'type': 'object', 'properties': {'file': {'type': 'string', 'format': 'binary'}}},
    ),
}

for prefix, tag in (('/api/city', '报名-市州'), ('/api/province', '报名-省级')):
    paths[f'{prefix}/registrations'] = {
        'get': op(tag, '报名单列表', params=REGISTRATION_FILTERS),
    }
    paths[f'{prefix}/registrations/{{id}}'] = {
        'get': op(tag, '报名单详情', params=[p('id', 'path', True, {'type': 'integer'})]),
    }
    paths[f'{prefix}/registrations/{{id}}/approve'] = {
        'post': op(tag, '审核通过', params=[p('id', 'path', True, {'type': 'integer'})]),
    }
    paths[f'{prefix}/registrations/{{id}}/reject'] = {
        'post': op(
            tag, '审核驳回', params=[p('id', 'path', True, {'type': 'integer'})],
            body={'type': 'object', 'required': ['reason'], 'properties': {'reason': {'type': 'string', 'maxLength': 500}}},
        ),
    }

paths['/api/city/registrations/{id}/report'] = {
    'post': op('报名-市州', '报送省级', params=[p('id', 'path', True, {'type': 'integer'})]),
}
paths['/api/province/registrations/statistics'] = {'get': op('报名-省级', '省级统计')}
paths['/api/province/registrations/export'] = {'get': op('报名-省级', '导出 xlsx', binary=True)}

paths['/api/public/live/matches'] = {
    'get': op('直播-公众', '公众比赛列表', security=False, params=PAGE_PARAMS + [p('status'), p('group_type'), p('keyword')]),
}
paths['/api/public/live/matches/{id}'] = {
    'get': op('直播-公众', '公众比赛详情', security=False, params=[p('id', 'path', True, {'type': 'integer'})]),
}
paths['/api/public/live/matches/{id}/events'] = {
    'get': op(
        '直播-公众', '公众事件列表', security=False,
        params=[p('id', 'path', True, {'type': 'integer'}), p('since_id', schema={'type': 'integer'})],
    ),
}

SCHOOL = '/api/school/live'
paths[f'{SCHOOL}/matches'] = {
    'get': op('直播-校级', '比赛列表', params=PAGE_PARAMS + [p('status'), p('group_type'), p('keyword')]),
    'post': op('直播-校级', '新建比赛', body={'$ref': '#/components/schemas/MatchCreate'}),
}
paths[f'{SCHOOL}/matches/{{id}}'] = {
    'get': op('直播-校级', '比赛详情', params=[p('id', 'path', True, {'type': 'integer'})]),
    'put': op('直播-校级', '更新比赛（乐观锁）', params=[p('id', 'path', True, {'type': 'integer'})],
              body={'$ref': '#/components/schemas/MatchUpdate'}),
    'delete': op('直播-校级', '删除比赛', params=[p('id', 'path', True, {'type': 'integer'})]),
}
paths[f'{SCHOOL}/matches/{{id}}/status'] = {
    'patch': op('直播-校级', '开始/结束比赛', params=[p('id', 'path', True, {'type': 'integer'})],
                body={'$ref': '#/components/schemas/MatchStatus'}),
}
paths[f'{SCHOOL}/matches/{{id}}/lineup'] = {
    'put': op('直播-校级', '保存阵容', params=[p('id', 'path', True, {'type': 'integer'})],
              body={'$ref': '#/components/schemas/Lineup'}),
}
paths[f'{SCHOOL}/matches/{{id}}/events'] = {
    'get': op('直播-校级', '事件列表', params=[p('id', 'path', True, {'type': 'integer'}), p('since_id', schema={'type': 'integer'})]),
    'post': op('直播-校级', '新增事件', params=[p('id', 'path', True, {'type': 'integer'})],
               body={'$ref': '#/components/schemas/EventCreate'}),
}
paths[f'{SCHOOL}/events/{{id}}'] = {
    'put': op('直播-校级', '修改事件', params=[p('id', 'path', True, {'type': 'integer'})],
              body={'$ref': '#/components/schemas/EventCreate'}),
    'delete': op('直播-校级', '删除事件', params=[p('id', 'path', True, {'type': 'integer'})]),
}
paths[f'{SCHOOL}/matches/{{id}}/referees'] = {
    'get': op('直播-校级', '裁判列表', params=[p('id', 'path', True, {'type': 'integer'})]),
    'put': op('直播-校级', '保存裁判', params=[p('id', 'path', True, {'type': 'integer'})],
              body={'$ref': '#/components/schemas/Referees'}),
}
paths[f'{SCHOOL}/matches/{{id}}/files'] = {
    'get': op('直播-校级', '文件列表', params=[p('id', 'path', True, {'type': 'integer'})]),
    'post': op('直播-校级', '上传文件', params=[p('id', 'path', True, {'type': 'integer'})],
               body={'$ref': '#/components/schemas/FileUpload'}),
}
paths[f'{SCHOOL}/files/{{id}}'] = {
    'delete': op('直播-校级', '删除文件', params=[p('id', 'path', True, {'type': 'integer'})]),
}
paths[f'{SCHOOL}/files/{{id}}/download'] = {
    'get': op('直播-校级', '下载文件', params=[p('id', 'path', True, {'type': 'integer'})], binary=True),
}
paths[f'{SCHOOL}/matches/{{id}}/live-link'] = {
    'put': op('直播-校级', '设置/清除直播链接', params=[p('id', 'path', True, {'type': 'integer'})],
              body={'type': 'object', 'properties': {'live_link': {'type': 'string', 'nullable': True}}}),
}
paths[f'{SCHOOL}/matches/{{id}}/face-verify'] = {
    'post': op('直播-校级', '人脸核验', params=[p('id', 'path', True, {'type': 'integer'})],
               body={'$ref': '#/components/schemas/FaceVerify'}),
}
paths[f'{SCHOOL}/matches/{{id}}/face-verify-records'] = {
    'get': op('直播-校级', '人脸核验记录', params=[p('id', 'path', True, {'type': 'integer'})]),
}

paths['/api/athlete/profile'] = {
    'get': op('运动员', '本人资料'),
    'put': op('运动员', '更新本人资料', body={'$ref': '#/components/schemas/AthleteProfileUpdate'}),
}
paths['/api/athlete/matches'] = {
    'get': op('运动员', '我的比赛', params=[p('status', schema={'type': 'string', 'enum': ['not_started', 'live', 'finished']})]),
}
paths['/api/athlete/stats'] = {'get': op('运动员', '我的数据')}
paths['/api/athlete/standings'] = {'get': op('运动员', '积分榜')}

paths['/api/admin/provinces'] = {
    'get': op('组织', '省份列表', params=PAGE_PARAMS + [p('keyword')]),
    'post': op('组织', '新建省份', body={'type': 'object', 'required': ['name', 'code'],
                                        'properties': {'name': {'type': 'string'}, 'code': {'type': 'string'}}}),
}
paths['/api/admin/provinces/{id}'] = {
    'put': op('组织', '更新省份', params=[p('id', 'path', True, {'type': 'integer'})],
              body={'type': 'object', 'properties': {'name': {'type': 'string'}, 'code': {'type': 'string'}}}),
    'delete': op('组织', '删除省份', params=[p('id', 'path', True, {'type': 'integer'})]),
}
paths['/api/admin/cities'] = {
    'get': op('组织', '城市列表', params=PAGE_PARAMS + [p('keyword'), p('province_id', schema={'type': 'integer'})]),
    'post': op('组织', '新建城市', body={'type': 'object', 'required': ['province', 'name', 'code'],
                                        'properties': {'province': {'type': 'integer'}, 'name': {'type': 'string'},
                                                       'code': {'type': 'string'}}}),
}
paths['/api/admin/cities/{id}'] = {
    'put': op('组织', '更新城市', params=[p('id', 'path', True, {'type': 'integer'})],
              body={'type': 'object', 'properties': {'province': {'type': 'integer'}, 'name': {'type': 'string'},
                                                     'code': {'type': 'string'}}}),
    'delete': op('组织', '删除城市', params=[p('id', 'path', True, {'type': 'integer'})]),
}
paths['/api/admin/schools'] = {
    'get': op('组织', '学校列表', params=PAGE_PARAMS + [p('keyword'), p('city_id', schema={'type': 'integer'})]),
    'post': op('组织', '新建学校', body={'type': 'object', 'required': ['city', 'name'],
                                        'properties': {'city': {'type': 'integer'}, 'name': {'type': 'string'},
                                                       'county': {'type': 'string'}, 'address': {'type': 'string'}}}),
}
paths['/api/admin/schools/{id}'] = {
    'put': op('组织', '更新学校', params=[p('id', 'path', True, {'type': 'integer'})],
              body={'type': 'object', 'properties': {'city': {'type': 'integer'}, 'name': {'type': 'string'},
                                                     'county': {'type': 'string'}, 'address': {'type': 'string'},
                                                     'status': {'type': 'string'}}}),
    'delete': op('组织', '删除学校', params=[p('id', 'path', True, {'type': 'integer'})]),
}
paths['/api/admin/teams'] = {
    'get': op('组织', '球队列表', params=PAGE_PARAMS + [p('keyword'), p('school_id', schema={'type': 'integer'})]),
}
paths['/api/city/schools'] = {'get': op('组织', '本市学校列表', params=PAGE_PARAMS + [p('keyword')])}
paths['/api/teams/mine'] = {
    'get': op('组织', '我的球队'),
    'put': op('组织', '保存我的球队', body={'$ref': '#/components/schemas/MyTeamUpdate'}),
}
paths['/api/teams/{id}/athletes'] = {
    'get': op('组织', '球队球员名单', params=[p('id', 'path', True, {'type': 'integer'})]),
    'put': op('组织', '保存球队球员名单', params=[p('id', 'path', True, {'type': 'integer'})],
              body={'type': 'object', 'properties': {'members': {
                  'type': 'array', 'items': {'$ref': '#/components/schemas/AthleteRosterInput'}}}}),
}
paths['/api/teams/{id}/coaches'] = {
    'get': op('组织', '球队教练组', params=[p('id', 'path', True, {'type': 'integer'})]),
    'put': op('组织', '保存球队教练组', params=[p('id', 'path', True, {'type': 'integer'})],
              body={'type': 'object', 'properties': {'coaches': {
                  'type': 'array', 'items': {'$ref': '#/components/schemas/CoachRosterInput'}}}}),
}
paths['/api/school/teams'] = {'get': op('组织', '本校球队列表')}
paths['/api/players'] = {
    'get': op('球员', '球员库列表', params=PAGE_PARAMS + [
        p('keyword'), p('city'), p('group'), p('status'),
    ]),
}
paths['/api/players/{id}'] = {
    'get': op('球员', '球员全量统计', params=[p('id', 'path', True, {'type': 'integer'})]),
}
paths['/api/players/{id}/publicize'] = {
    'post': op('球员', '公示/取消公示', params=[p('id', 'path', True, {'type': 'integer'})],
               body={'type': 'object', 'required': ['publicized'],
                     'properties': {'publicized': {'type': 'boolean'}}}),
}
paths['/api/players/mine/records'] = {'get': op('球员', '我的比赛明细')}

schemas = {
    'Envelope': {
        'type': 'object',
        'properties': {
            'code': {'type': 'integer', 'example': 0},
            'msg': {'type': 'string', 'example': 'success'},
            'data': {'nullable': True},
            'success': {'type': 'boolean', 'example': True},
            'trace_id': {'type': 'string'},
        },
    },
    'PageData': {
        'type': 'object',
        'properties': {
            'list': {'type': 'array', 'items': {}},
            'next_page': {'type': 'integer', 'nullable': True},
            'total': {'type': 'integer'},
            'page': {'type': 'integer'},
            'page_size': {'type': 'integer'},
        },
    },
    'LoginRequest': {
        'type': 'object', 'required': ['phone', 'password'],
        'properties': {'phone': {'type': 'string', 'example': '13800000001'},
                       'password': {'type': 'string', 'example': 'pass1234'}},
    },
    'AdminLoginRequest': {
        'type': 'object', 'required': ['email', 'password'],
        'properties': {'email': {'type': 'string', 'example': 'admin@ball.local'},
                       'password': {'type': 'string', 'example': 'admin123'}},
    },
    'RegisterRequest': {
        'type': 'object', 'required': ['name', 'phone', 'password', 'role'],
        'properties': {
            'name': {'type': 'string'}, 'phone': {'type': 'string'},
            'password': {'type': 'string'}, 'role': {'type': 'string', 'enum': ['personal', 'coach', 'athlete']},
        },
    },
    'RegistrationCreate': {
        'type': 'object', 'required': ['competition_id', 'team_id'],
        'properties': {'competition_id': {'type': 'integer'}, 'team_id': {'type': 'integer'}},
    },
    'MatchCreate': {
        'type': 'object', 'required': ['group_type', 'home_team_name', 'away_team_name', 'match_time'],
        'properties': {
            'group_type': {'type': 'string', 'enum': ['university', 'middle_school', 'primary_school']},
            'home_team_id': {'type': 'integer', 'nullable': True},
            'away_team_id': {'type': 'integer', 'nullable': True},
            'home_team_name': {'type': 'string'},
            'away_team_name': {'type': 'string'},
            'match_time': {'type': 'string', 'example': '2026-11-01T15:00:00+08:00'},
            'venue': {'type': 'string'},
        },
    },
    'MatchUpdate': {
        'allOf': [
            {'$ref': '#/components/schemas/MatchCreate'},
            {'type': 'object', 'required': ['version'], 'properties': {'version': {'type': 'integer'}}},
        ],
    },
    'MatchStatus': {
        'type': 'object', 'required': ['action', 'version'],
        'properties': {'action': {'type': 'string', 'enum': ['start', 'finish']}, 'version': {'type': 'integer'}},
    },
    'Lineup': {
        'type': 'object', 'required': ['version', 'lineup_home', 'lineup_away'],
        'properties': {
            'version': {'type': 'integer'},
            'lineup_home': {'type': 'array', 'items': {'$ref': '#/components/schemas/LineupPlayer'}},
            'lineup_away': {'type': 'array', 'items': {'$ref': '#/components/schemas/LineupPlayer'}},
        },
    },
    'LineupPlayer': {
        'type': 'object', 'required': ['name', 'no'],
        'properties': {'name': {'type': 'string'}, 'no': {'type': 'string'},
                       'position': {'type': 'string'}, 'is_captain': {'type': 'boolean'}},
    },
    'EventCreate': {
        'type': 'object', 'required': ['type', 'minute', 'client_token'],
        'properties': {
            'type': {'type': 'string', 'enum': ['goal', 'yellow', 'red', 'substitution', 'text']},
            'minute': {'type': 'integer', 'minimum': 0, 'maximum': 130},
            'team_side': {'type': 'string', 'enum': ['home', 'away'], 'nullable': True},
            'player_name': {'type': 'string'},
            'player_no': {'type': 'string'},
            'related_player_name': {'type': 'string'},
            'content': {'type': 'string'},
            'client_token': {'type': 'string'},
            'athlete_id': {'type': 'integer', 'nullable': True},
        },
    },
    'Referees': {
        'type': 'object', 'required': ['referees'],
        'properties': {'referees': {'type': 'array', 'maxItems': 4, 'items': {
            'type': 'object', 'required': ['role', 'name'],
            'properties': {'role': {'type': 'string', 'enum': ['chief', 'assistant', 'fourth']},
                           'name': {'type': 'string'}}}}},
    },
    'FileUpload': {
        'type': 'object', 'required': ['type', 'file'],
        'properties': {
            'type': {'type': 'string', 'enum': ['sign_in', 'record_confirm', 'referee_report']},
            'file': {'type': 'string', 'format': 'binary'},
        },
    },
    'FaceVerify': {
        'type': 'object', 'required': ['player_name', 'photo'],
        'properties': {'player_name': {'type': 'string'}, 'player_no': {'type': 'string'},
                       'photo': {'type': 'string', 'format': 'binary'}},
    },
    'AthleteProfileUpdate': {
        'type': 'object',
        'properties': {'name': {'type': 'string'}, 'jersey_no': {'type': 'integer', 'minimum': 0, 'maximum': 99},
                       'position': {'type': 'string'}},
    },
    'MyTeamUpdate': {
        'type': 'object',
        'properties': {
            'name': {'type': 'string'},
            'school_id': {'type': 'integer'},
            'school': {'type': 'string'},
            'schoolCode': {'type': 'string'},
            'group': {'type': 'string', 'enum': ['高校组', '中学组', '小学组']},
            'found_time': {'type': 'string'},
            'captain': {'type': 'string'},
            'intro': {'type': 'string'},
            'flag_uploaded': {'type': 'boolean'},
            'logo_uploaded': {'type': 'boolean'},
            'photo_uploaded': {'type': 'boolean'},
            'honor_uploaded': {'type': 'boolean'},
        },
    },
    'AthleteRosterInput': {
        'type': 'object', 'required': ['name'],
        'properties': {
            'name': {'type': 'string'},
            'idCard': {'type': 'string'},
            'birthDate': {'type': 'string', 'format': 'date', 'nullable': True},
            'position': {'type': 'string', 'enum': ['门将', '后卫', '中场', '前锋']},
            'jerseyNo': {'type': 'integer', 'minimum': 0, 'maximum': 99},
            'photoUploaded': {'type': 'boolean'},
        },
    },
    'CoachRosterInput': {
        'type': 'object', 'required': ['name'],
        'properties': {
            'name': {'type': 'string'},
            'category': {'type': 'string', 'enum': ['专职教练员', '体育教师兼任', '社会足球从业者']},
            'level': {'type': 'string'},
            'phone': {'type': 'string'},
        },
    },
}

document = {
    'openapi': '3.0.3',
    'info': {
        'title': '青少年足球赛事系统 API',
        'version': '1.0.0',
        'description': 'soccer-database-main 后端接口。统一信封 { code, msg, data, success, trace_id }；路径均无尾斜杠。',
    },
    'servers': [
        {'url': 'http://127.0.0.1:8000', 'description': '本地开发'},
    ],
    'tags': [
        {'name': '系统'}, {'name': '认证'}, {'name': '赛事'}, {'name': '报名'},
        {'name': '报名-市州'}, {'name': '报名-省级'}, {'name': '直播-公众'},
        {'name': '直播-校级'}, {'name': '运动员'}, {'name': '组织'}, {'name': '球员'},
    ],
    'paths': paths,
    'components': {
        'securitySchemes': {
            'bearerAuth': {'type': 'http', 'scheme': 'bearer', 'bearerFormat': 'JWT'},
        },
        'schemas': schemas,
    },
}

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(document, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'written {OUT} paths={len(paths)}')
