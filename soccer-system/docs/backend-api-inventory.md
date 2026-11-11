# 后端接口契约盘点（前后端联调用）

> 盘点对象：`c:\Users\ZhuanZ\Desktop\try-rootball\soccer-database-main`（Django 6.1 + DRF 3.18 + SimpleJWT）
> 盘点方式：静态阅读路由、视图、序列化器、模型、公共渲染器/异常/权限、既有文档与冒烟脚本；未修改任何业务代码。
> 盘点日期：2026-11-10
> 事实来源：`config/urls.py`、`apps/*/urls*.py`、`apps/*/views*.py`、`apps/*/serializers.py`、`apps/*/models.py`、`apps/common/{renderers,exceptions,permissions,pagination,codes,formatting,middleware}.py`、`config/settings.py`、`scripts/smoke_test.py`、`.env.example`、`apps/*/services.py`
> 标注约定：**【需运行确认】** 表示结论来自代码静态推导、尚未实测；其余为代码可直接验证的事实。

---

## 0. 通用契约

### 0.1 Base URL 与端口

| 项 | 值 |
|---|---|
| 开发端口 | `8000`（`python manage.py runserver` 默认） |
| Base URL | `http://127.0.0.1:8000` |
| API 前缀 | `/api`（健康检查为 `/api/health`，其余业务均以 `/api/...` 开头） |
| 尾斜杠 | **所有路由均无尾斜杠**（`path('auth/login')` 等）。请求 `/api/auth/login/` 不会命中，**【需运行确认】** 实际返回 Django HTML 404 而非统一信封 |
| 生产前缀 | 代码未配置 `/api` 以外的前缀，也未配置反向代理前缀；如需 `/prod-api` 由网关负责 |

### 0.2 认证

- 方式：JWT（`rest_framework_simplejwt.authentication.JWTAuthentication`）
- 请求头：`Authorization: Bearer <access token>`
- 登录响应同时返回 `token`、`access`（两者同值）与 `refresh`
- 有效期（`config/settings.py`）：access **8 小时**，refresh **7 天**
- **没有实现 refresh 换发接口**（`config/urls.py` 未注册 `TokenRefreshView`）：access 过期后只能重新登录
- 登出仅把 `refresh` 加入黑名单；**access 不会立即失效**，在 8 小时内仍可调用接口（【需运行确认】业务上是否接受）
- 禁用账号（`status=disabled`）只拦截登录；已签发的 JWT 仍可继续调用接口（权限类未校验 `status`，SimpleJWT 只看 Django `is_active`，而该字段不会随业务状态变更）——联调时需注意"禁用不踢下线"
- 管理员与非管理员使用不同登录入口：
  - 管理员：`email + password` → `POST /api/admin/auth/login`
  - 其余角色：`phone + password` → `POST /api/auth/login`
  - 管理员走统一登录会被拒（`20004`）；非管理员走管理员登录会被拒（`20004`）

### 0.3 响应信封

所有 JSON API（除文件下载）统一由 `UnifiedJSONRenderer` 包裹为五字段：

```json
{
  "code": 0,
  "msg": "success",
  "data": {},
  "success": true,
  "trace_id": "3f2c..."
}
```

- `success` 恒等于 `code === 0`
- 渲染器兜底逻辑：非异常路径且 HTTP 状态 ≥400 时会把 HTTP 状态码当作 `code`；正常业务错误都已由异常处理器封装，不会走到该分支
- `msg`：成功为 `success`；参数/业务错误为后端拼接后的**单条字符串**
- `trace_id`：取请求头 `X-Request-ID`，缺省则由后端生成 uuid hex；同时在响应头回写 `X-Request-ID`
- 校验错误不会返回字段级结构：`custom_exception_handler._flatten_error` 会把 DRF 错误拍平成一条 `msg`（如 `"phone: 该手机号已被注册"`），`data` 恒为 `null`
- 分页、详情、删除等响应的真实业务数据都在 `data` 内

**例外（不套信封）**：
1. 文件下载/图片查看：`FileResponse` / `HttpResponse` 直接返回二进制（`Content-Disposition` 附件或 inline）
2. `GET /api/province/registrations/export`（xlsx）
3. `GET /api/province/registrations/{id}/form-docx`（docx）
4. 未匹配路由的 404（Django 默认 HTML）**【需运行确认】**

### 0.4 错误码

| code | HTTP | 含义 | 触发点 |
|---|---|---|---|
| 0 | 200 | 成功 | — |
| 9 | 400 | 乐观锁冲突 | 比赛更新/状态/阵容 `version` 不匹配 |
| 10001 | 400（MethodNotAllowed 时为 405） | 参数校验失败 | DRF ValidationError；也用于 **MethodNotAllowed** |
| 10006 | 400 | 不支持的文件格式 | 赛事文件、报名材料、头像扩展名不允许 |
| 10007 | 400 | 文件大小超限 | 超过 `MAX_FILE_SIZE`（默认 10MB） |
| 20001 | 401 | 未登录/登录过期 | 未带或非法 JWT |
| 20002 | 400 | 账号或密码错误 | 登录失败 |
| 20003 | 400 | 账号已被禁用 | `status=disabled` |
| 20004 | 400/403 | 无操作权限 | 角色/权限点/数据域不匹配 |
| 30001 | 404 | 资源不存在 | 比赛/报名单/球员/学校等查无 |
| 40002 | 400 | 比赛已结束，禁止修改 | 已结束比赛写操作；状态流转非法 |
| 40009 | 400 | 请勿重复提交 | 赛事事件 `client_token` 重复；同赛事同球队重复报名 |
| 50008 | 400 | 人脸核验服务异常 | 定义存在，mock 驱动不会触发 |
| 60001 | — | 数据存储异常 | **仅定义，代码中未抛出** |
| 90001 | 500（Throttled 时为 429） | 系统繁忙 | 未预期异常兜底；DRF `Throttled` 也映射到该码 |

补充：
- `BusinessException` 默认 HTTP 400，可自定义 `status_code`（不存在类资源用 404）
- 权限不足时 DRF 返回 401/403，但信封 `code` 固定为 20001/20004（以 `code` 为准，不要只看 HTTP 状态）
- 非 API 路径的 500/404 不走统一信封

### 0.5 分页

统一使用 `apps/common/pagination.paginate`：

- Query：`page`（默认 1）、`page_size`（默认 20，最大 100）
- 非法值回退默认；`page` 超出总页数时返回**最后一页**，但响应中的 `page` 仍回显请求值
- 返回结构（位于 `data`）：

```json
{
  "list": [],
  "next_page": null,
  "total": 0,
  "page": 1,
  "page_size": 20
}
```

- `next_page`：有下一页时为页码，否则 `null`
- **不分页**的列表接口：比赛事件、裁判、赛事文件、人脸核验记录、运动员比赛列表、`/api/city/registrations/summary`、`/api/province/registrations/statistics`
- 各列表支持的搜索参数见各接口；通用搜索为 `keyword`（icontains）

### 0.6 时间格式（前端需注意不一致）

| 模块 | 字段 | 格式 |
|---|---|---|
| 赛事直播 | `match_time`、`created_at`、`updated_at` | `YYYY-MM-DD HH:mm:ss`（`apps/common/formatting.format_dt`，Asia/Shanghai） |
| 运动员端 | `match_time` | DRF 默认 **ISO 8601**（如 `2026-10-26T15:00:00+08:00`）【需运行确认毫秒/时区写法】 |
| 报名/账号/组织/通知/日志 | `created_at`、`submitted_at`、`reported_at`、`city_reviewed_at`、`province_reviewed_at`、`date_joined` | DRF 默认 **ISO 8601** |
| 赛事创建/更新时间入参 | `match_time` | `DateTimeField`，接受 ISO 8601（冒烟脚本用 `2026-11-01T15:00:00+08:00`） |

### 0.7 文件与 multipart

- 私有目录：`PRIVATE_STORAGE_ROOT = <项目根>/storage/private`，不通过静态 URL 暴露，必须走鉴权下载接口
- 单文件上限：业务代码统一用 `MAX_FILE_SIZE`（默认 10MB）校验；`MAX_IMAGE_SIZE` 仅定义、未在代码中使用；Django 内存上传上限同为 10MB
- 允许扩展名：
  - 赛事文件：`.pdf .jpg .jpeg .png`
  - 报名材料（盖章表/学籍/教练资质）：`.pdf .jpg .jpeg .png`
  - 球员头像：`.jpg .jpeg .png`
- multipart 字段名统一为 `file`；`type`（赛事文件）与 `player_name/player_no/photo`（人脸核验）为普通表单字段
- 扩展名错误 → 10006；大小超限 → 10007
- 下载响应为二进制，不带 `code/msg/data` 信封
- 仓库内存在历史目录 `.private/`（含 `coaches/`、`registrations/` 示例文件），与当前 `PRIVATE_STORAGE_ROOT=<项目根>/storage/private` 不一致；这些历史资料通过接口下载会返回 30001 "文件不存在"

### 0.8 权限与数据域模型

权限类只有三种实现（`apps/common/permissions.py`）：

1. `role_permission(*roles)`：角色白名单，**管理员（role=admin 或 is_superuser）直通**
2. `live_permission(perm)`：权限点白名单，管理员直通；非管理员需 `user.permissions` 含该权限点
3. 公开接口：视图未声明权限 → 走 DRF 默认 `AllowAny`

校级账号创建时默认写入 13 个权限点（`SCHOOL_ADMIN_PERMISSIONS`）：9 个 `live:*` + `registration:identity:verify`、`registration:statistics:view`、`school:notification:manage`、`school:auditlog:view`。

> **重要事实**：`/api/admin/live/*` 与 `/api/school/live/*` 挂载的是**同一批视图类**，鉴权只校验权限点、不校验角色。因此持有 `live:*` 权限点的校级账号访问 `/api/admin/live/*` 也能成功，但 `_school_match_queryset/_ensure_school_match` 会按本校裁剪；管理员/省级看全量。

数据域规则（`apps/live/views.py`、报名 services）：

| 角色 | 比赛可见范围 | 报名单范围 |
|---|---|---|
| admin | 全量 | 全量 |
| province | 全量（代码按 `UserRole.PROVINCE` 放行） | 全量（未按 province_id 过滤） |
| city | —（无比赛入口） | 本市 `team.school.city_id` |
| county | — | 本市 + `school.county` 匹配 |
| school | 主队或客队属于本校 | 本校所有球队 |
| coach | — | 自己执教的球队 |
| athlete | 自己球队的比赛（运动员端） | — |
| personal | 仅公众端 | — |

> 报名审核与统计接口的 `commission`：`role_permission('city', 'county')`、`role_permission('province')`、`role_permission('school')` 均允许 admin 直通。

---

## 1. 认证（6 条）

### 1.1 `GET /api/health`
- 权限：免登
- Query：无
- Body：无
- 响应 `data`：`{ "status": "up", "time": "2026-11-10T18:00:00+08:00" }`（`timezone.localtime().isoformat()`）
- 备注：冒烟脚本未覆盖该接口，**【需运行确认】** 可用于存活探测

### 1.2 `POST /api/auth/register`
- 权限：免登
- Body（JSON）：

| 字段 | 必填 | 类型/约束 | 说明 |
|---|---|---|---|
| `name` | 是 | string ≤50 | 姓名 |
| `phone` | 是 | `^1[3-9]\d{9}$`，全局唯一 | 同时作为 `username` |
| `password` | 是 | 6–64 | 明文提交 |
| `role` | 是 | `personal \| coach \| athlete` | 不允许自助注册 admin/省/市/县/校 |

- 响应 `data`（登录结构，见 1.3）
- 副作用：`coach` 自动建 `CoachProfile(status=pending)`；`athlete` 自动建 `AthleteProfile(status=pending, team=null)`
- 错误：手机号重复/格式错/角色非法 → 10001

### 1.3 `POST /api/auth/login`
- 权限：免登
- Body：`phone`（必填，string）、`password`（必填，string，6–64）
- 响应 `data`：

```json
{
  "token": "<access>",
  "access": "<access>",
  "refresh": "<refresh>",
  "token_type": "Bearer",
  "user": {
    "id": 1, "name": "王球员", "phone": "13800000001", "email": null,
    "role": "athlete", "role_display": "运动员",
    "status": "active", "status_display": "正常", "is_admin": false,
    "permissions": [],
    "profile": { "id": 1, "team_id": 1, "jersey_no": 9, "position": "前锋",
                 "status": "approved", "reject_reason": null },
    "date_joined": "2026-10-01T10:00:00+08:00"
  }
}
```

- `profile` 按角色不同（`accounts/serializers.profile_summary`）：
  - athlete：`id, team_id, jersey_no, position, status, reject_reason`
  - coach：`id, name, phone, status, reject_reason`
  - school：`id, school_id, name`
  - city：`id, city_id, name`
  - county：`id, city_id, county, name`
  - province：`id, province_id, name`
  - admin/其他：`id, name`
  - 无 profile：`null`
- 错误：账号不存在/密码错 → 20002；admin 走此入口 → 20004；`status=disabled` → 20003

### 1.4 `POST /api/admin/auth/login`
- 权限：免登
- Body：`email`（必填，`EmailField` ≤191）、`password`（必填，6–64）
- 响应：同 1.3（`user.role=admin`、`is_admin=true`）
- 校验：账号 `role=admin` 或 `is_superuser`，否则 20004；密码错 20002；禁用 20003
- 邮箱匹配不区分大小写

### 1.5 `POST /api/auth/logout`
- 权限：登录即可
- Body：`refresh`（可选，string）
- 响应 `data`：`{ "logged_out": true }`
- 行为：传 `refresh` 且合法则加入黑名单；非法/过期忽略；access 不吊销
- 错误：未登录 → 20001

### 1.6 `GET /api/auth/me`
- 权限：登录即可
- 响应 `data`：UserSerializer（同 1.3 的 `user` 结构）
- 用途：刷新页面恢复用户信息与权限点

---

## 2. 行政区划 / 学校 / 团队（17 条）

序列化字段：

**Province**：`id, name, code`
**City**：`id, province, province_name, name, code`
**School**：`id, city, city_name, name, logo, address, status, created_at, updated_at`
**Team**：`id, school, school_name, coach, coach_name, name, logo, group_type, status, reject_reason, created_at, updated_at`（`coach/status/reject_reason/created_at/updated_at` 只读）

> 学校模型有 `county` 字段，但 **SchoolSerializer 未暴露**；`/api/city/registrations/summary` 与区县账号过滤依赖 `school.county`，目前只能由数据库/后台写入。**【需运行确认】** 现有 seed 是否填充区县。

### 2.1 省份

| 方法 | 路径 | 权限 | Query | Body |
|---|---|---|---|---|
| GET | `/api/admin/provinces` | admin | `page,page_size,keyword(name)` | — |
| POST | `/api/admin/provinces` | admin | — | `name`*、`code`*（唯一） |
| GET | `/api/admin/provinces/{id}` | admin | — | — |
| PUT | `/api/admin/provinces/{id}` | admin | — | `name`、`code`（部分更新，`partial=True`） |
| DELETE | `/api/admin/provinces/{id}` | admin | — | — |

- 列表响应 `data`：分页 + `list: Province[]`
- POST/PUT 响应 `data`：单条 Province
- DELETE 响应 `data`：`{ "id": 1 }`
- 不存在 → 30001（"省份不存在"）

### 2.2 城市

| 方法 | 路径 | 权限 | Query | Body |
|---|---|---|---|---|
| GET | `/api/admin/cities` | admin, city | `page,page_size,keyword(name),province_id` | — |
| POST | `/api/admin/cities` | admin, city | — | `province`*（int）、`name`*、`code`* |
| GET | `/api/admin/cities/{id}` | admin | — | — |
| PUT | `/api/admin/cities/{id}` | admin | — | 同上，部分更新 |
| DELETE | `/api/admin/cities/{id}` | admin | — | — |

- city 角色只返回自己绑定的城市；未绑定返回空分页（`total=0,page=1,page_size=20`，`next_page` 字段缺失——代码手写 dict）
- **POST 允许 city 角色创建城市**（代码事实，非笔误）：`permission_classes = role_permission('admin','city')`
- `code` 唯一约束为 `(province, code)`

### 2.3 学校

| 方法 | 路径 | 权限 | Query | Body |
|---|---|---|---|---|
| GET | `/api/admin/schools` | admin, school, city | `page,page_size,keyword(name),city_id` | — |
| POST | `/api/admin/schools` | admin, school, city | — | `city`*、`name`*、`logo`、`address`、`status`(`active\|disabled`) |
| GET | `/api/admin/schools/{id}` | admin, school | — | — |
| PUT | `/api/admin/schools/{id}` | admin, school | — | 同上，部分更新 |
| DELETE | `/api/admin/schools/{id}` | admin, school | — | — |
| GET | `/api/city/schools` | admin, school, city | 同 GET `/api/admin/schools` | — |

- school 角色：列表仅本校、详情/改/删仅本校（否则 20004 "仅可操作本校数据"）
- city 角色：列表仅本市；**详情/改/删不可用**（`SchoolDetailView` 只允许 admin/school）
- POST 会写 `created_by=当前用户 id`；**school / city 角色也能调用 POST 创建学校**（代码未做数据域校验），这是与"只读查阅"预期不一致的地方
- 注意：`/api/city/schools` 与 `/api/admin/schools` 是同一视图的两次挂载
- 删除学校会级联删除城市下学校关联数据（Team/报名单/通知等），无软删除

### 2.4 团队

| 方法 | 路径 | 权限 | Query | Body |
|---|---|---|---|---|
| GET | `/api/admin/teams` | admin, school | `page,page_size,keyword(name),status(pending\|approved\|rejected)` | — |

- school 只返回本校球队；admin 全量
- 响应 `data`：分页 + `list: Team[]`
- **只有列表，没有创建/编辑/删除/审核球队接口**（见第 11 节）

---

## 3. 公众直播（3 条，免登）

> 权限：视图未声明 `permission_classes`，DRF 默认 `AllowAny`；即使带 token 也不做角色校验。

### 3.1 `GET /api/public/live/matches`
- Query：`status`(`not_started|live|finished`)、`group_type`(`university|middle_school|primary_school`)、`page`、`page_size`
- 响应 `data`：分页 + `list: MatchListItem[]`

`MatchListItem`：
`id, group_type, group_type_label, home_team_name, away_team_name, home_team_logo, away_team_logo, match_time, venue, status, status_label, home_score, away_score`

- 排序：`-match_time, -id`
- 无 keyword/球队/日期筛选

### 3.2 `GET /api/public/live/matches/{id}`
- 响应 `data`：`MatchDetail`

`MatchDetail` = MatchListItem + `lineup_home`（`LineupPlayer[]|null`）、`lineup_away`、`live_link`，并在视图层额外拼：
- `referees`: `{ id, role, role_label, name }[]`
- `events`: `MatchEvent[]`（按 `minute,id` 升序）

- 不存在 → 30001
- **不返回** `home_team_id / away_team_id / version / 创建审计字段`

### 3.3 `GET /api/public/live/matches/{id}/events`
- Query：`since_id`（可选，int；`id > since_id` 增量拉取；非法值忽略）
- 响应 `data`：`MatchEvent[]`（**非分页**）

`MatchEvent`：
`id, type, type_label, minute, team_side(home|away|null), player_name, player_no(int|null), related_player_name, content, created_at`

- 用于直播大屏轮询；建议前端保存最大 `id` 作为 `since_id`

---

## 4. 管理端直播（20 条，前缀 `/api/admin/live`）

权限点与角色：
- 管理员直通
- 非管理员必须持有对应 `live:*` 权限点（校级账号默认具备）
- 数据域：非 admin/province 且绑定学校的账号，仅能看/改"主队或客队属于本校"的比赛；未绑定学校 → 20004

### 4.1 比赛 CRUD 与状态

| 方法 | 路径 | 权限点 | Query | Body |
|---|---|---|---|---|
| GET | `/api/admin/live/matches` | `live:match:view` | `page,page_size,status,group_type,keyword` | — |
| POST | `/api/admin/live/matches` | `live:match:create` | — | MatchStore |
| GET | `/api/admin/live/matches/{id}` | `live:match:view` | — | — |
| PUT | `/api/admin/live/matches/{id}` | `live:match:update` | — | MatchStore 全字段可选 + `version`* |
| DELETE | `/api/admin/live/matches/{id}` | `live:match:delete` | — | — |
| PATCH | `/api/admin/live/matches/{id}/status` | `live:match:update` | — | `action`*、`version`* |
| PUT | `/api/admin/live/matches/{id}/lineup` | `live:match:update` | — | `version`*、`lineup_home[]`、`lineup_away[]` |

**MatchStore（创建）**

| 字段 | 必填 | 类型/约束 |
|---|---|---|
| `group_type` | 是 | `university\|middle_school\|primary_school` |
| `home_team_name` | 是 | string ≤100 |
| `away_team_name` | 是 | string ≤100 |
| `home_team_logo` | 否 | string ≤255 / null / "" |
| `away_team_logo` | 否 | string ≤255 / null / "" |
| `match_time` | 是 | DateTime（ISO 8601） |
| `venue` | 否 | string ≤200 / null / "" |
| `home_team_id` | 否 | int / null |
| `away_team_id` | 否 | int / null |

- 创建时即使传了 `home_team_id/away_team_id`，`home_team_name/away_team_name` 仍必填，不会自动取名
- 校级账号创建比赛额外校验（**仅当账号已绑定学校时生效**）：至少一支球队、球队必须存在、必须包含本校球队，否则 10001/20004

**MatchUpdate**
- 所有字段可选（序列化器初始化时把 `required` 全部置 False），`version` 必填
- **【需运行确认】** 缺少 `version` 时视图 `data.pop('version')` 会 KeyError → 返回 90001，而非 10001
- 已结束比赛更新 → 40002；version 不匹配 → 9

**MatchStatus**
- `action`: `start`（`not_started → live`）或 `finish`（`live → finished`）
- 状态不匹配 → 40002；version 冲突 → 9
- 不存在 → 30001

**Lineup**
- `lineup_home` / `lineup_away`：数组，可为空
- 球员项：`name`*（≤50）、`no`*（string ≤16）、`position`（≤20，可空）、`is_captain`（bool，默认 false）
- 已结束 → 40002；version 冲突 → 9

**响应 `data`**：`AdminMatchDetail`

`AdminMatchDetail` = `MatchListItem` 全字段 + `lineup_home, lineup_away, live_link, version, created_by, updated_by, created_at, updated_at`
（**不含** referees/events；列表也用同一序列化器）

- DELETE 仅允许 `not_started`，否则 40002（"仅未开始的比赛可删除"）；软删除，响应 `{ "id": 1 }`

### 4.2 比赛事件

| 方法 | 路径 | 权限点 | Query/Body |
|---|---|---|---|
| GET | `/api/admin/live/matches/{id}/events` | `live:event:manage` | `since_id`（可选） |
| POST | `/api/admin/live/matches/{id}/events` | `live:event:manage` | EventStore |
| PUT | `/api/admin/live/events/{id}` | `live:event:manage` | 同 EventStore 全字段可选 |
| DELETE | `/api/admin/live/events/{id}` | `live:event:manage` | — |

**EventStore**

| 字段 | 必填 | 类型/约束 | 条件 |
|---|---|---|---|
| `type` | 是 | `goal\|yellow\|red\|substitution\|text` | — |
| `minute` | 是 | int 0–130 | — |
| `team_side` | 条件 | `home\|away` / null | 非 `text` 必填 |
| `player_name` | 条件 | string ≤100 | 非 `text` 必填 |
| `player_no` | 否 | string ≤16 | 前端契约中为 number |
| `related_player_name` | 条件 | string ≤100 | `substitution` 必填（换上球员） |
| `content` | 条件 | string ≤500 | `text` 必填 |
| `client_token` | 是 | string ≤64，全局唯一 | 幂等键；PUT 时可选 |
| `athlete_id` | 否 | int / null | 关联运动员档案，供运动员端统计 |

- 响应 `data`（增/改/删一致）：

```json
{
  "event": { "...": "MatchEvent | null" },
  "home_score": 1,
  "away_score": 0,
  "version": 3
}
```

- `goal` 事件在事务内联动比分并 `version+1`；删除/改类型会先回退旧比分再按新值重算
- `client_token` 重复 → 40009；已结束比赛 → 40002
- PUT 为部分更新且**不做跨字段合并校验**（服务层直接写库）；修改 `client_token` 为已存在值可能触发数据库唯一约束 → 90001 **【需运行确认】**
- 事件列表非分页，按 `minute,id` 升序

### 4.3 裁判

| 方法 | 路径 | 权限点 | Body |
|---|---|---|---|
| GET | `/api/admin/live/matches/{id}/referees` | `live:referee:manage` | — |
| PUT | `/api/admin/live/matches/{id}/referees` | `live:referee:manage` | `referees[]` |

- `referees`：数组，`max_length=4`，整体替换（先删后建）
- 项：`role`*（`chief\|assistant\|fourth`）、`name`*（≤50）
- 数量限制：主裁 ≤1、第四官员 ≤1、边裁 ≤2；超限 → 10001
- 响应 `data`：`{ id, role, role_label, name }[]`（非分页）
- 不校验比赛是否已结束

### 4.4 赛事文件

| 方法 | 路径 | 权限点 | 请求 |
|---|---|---|---|
| GET | `/api/admin/live/matches/{id}/files` | `live:file:manage` | — |
| POST | `/api/admin/live/matches/{id}/files` | `live:file:manage` | multipart：`type`*、`file`* |
| GET | `/api/admin/live/files/{id}/download` | `live:file:manage` | — |
| DELETE | `/api/admin/live/files/{id}` | `live:file:manage` | — |

- `type`：`sign_in`（培训签到表）| `record_confirm`（记录确认单）| `referee_report`（裁判报告单）
- `file`：pdf/jpg/jpeg/png，≤10MB
- 响应 `data`（列表/上传）：`MatchFileItem`

```json
{ "id": 1, "match_id": 3, "type": "sign_in", "file_name": "签到表.pdf",
  "file_path": "matches/3/xxxx.pdf", "mime": "application/pdf", "size": 12345,
  "uploaded_by": 1, "created_at": "2026-11-01 15:00:00" }
```

- `file_path` 是私有相对路径，不可直接访问
- 下载返回二进制附件，无信封；文件记录存在但磁盘缺失 → 30001 "文件已丢失"
- DELETE 同时删记录与磁盘文件，响应 `{ "id": 1 }`

### 4.5 直播链接

`PUT /api/admin/live/matches/{id}/live-link`
- 权限点：`live:link:manage`
- Body：`live_link`（可选，URL ≤512，可 null/"" 清空）
- 已结束 → 40002
- 响应 `data`：`{ "live_link": "https://...", "version": 4 }`（version 自增，前端需同步）

### 4.6 人脸核验

| 方法 | 路径 | 权限点 | 请求 |
|---|---|---|---|
| POST | `/api/admin/live/matches/{id}/face-verify` | `live:face:manage` | multipart：`player_name`*、`player_no`、`photo`* |
| GET | `/api/admin/live/matches/{id}/face-verify-records` | `live:face:manage` | — |

- `photo`：`ImageField`，只由 DRF/Pillow 校验"是否为有效图片"；服务层**未**单独校验扩展名与 10MB 上限
- 当前为 mock 驱动：固定 `result=pass`、`score=95.00`、`channel=mock`、`request_id=uuid`
- 响应 `data`（POST 单条 / GET 列表非分页）：

```json
{ "id": 1, "match_id": 3, "player_name": "王球员", "player_no": "10",
  "photo_path": "face_verify/3/xxx.jpg", "result": "pass", "score": "95.00",
  "channel": "mock", "request_id": "hex", "remark": null,
  "created_by": 1, "created_at": "2026-11-01 15:00:00" }
```

- `score` 为字符串（Decimal 序列化）；`player_no` 为原始 CharField，返回**字符串**，与前端契约的 `number | null` 不一致
- 图片非法时 DRF 报 "Upload a valid image"，经 `_raise_file_error` 按关键字映射为 10006

---

## 5. 校级直播（20 条，前缀 `/api/school/live`）

- **路由与视图完全复用第 4 节**，仅前缀不同；`urls_school.py` 与 `urls_admin.py` 一一对应
- 权限点相同（校级账号默认具备全部 9 个 `live:*`）
- 差异只在数据域：
  - 比赛列表/详情/写操作仅限"主队或客队属于本校"
  - 已绑定学校时，创建比赛必须包含本校球队；**未绑定学校的校级账号 POST 会跳过该校验**（可创建任意比赛，但随后列表为空、详情/改/删返回 20004），属代码现状
  - 管理员/省级访问时不受学校域限制

| 方法 | 路径 | 权限点 |
|---|---|---|
| GET | `/api/school/live/matches` | `live:match:view` |
| POST | `/api/school/live/matches` | `live:match:create` |
| GET | `/api/school/live/matches/{id}` | `live:match:view` |
| PUT | `/api/school/live/matches/{id}` | `live:match:update` |
| DELETE | `/api/school/live/matches/{id}` | `live:match:delete` |
| PATCH | `/api/school/live/matches/{id}/status` | `live:match:update` |
| PUT | `/api/school/live/matches/{id}/lineup` | `live:match:update` |
| GET | `/api/school/live/matches/{id}/events` | `live:event:manage` |
| POST | `/api/school/live/matches/{id}/events` | `live:event:manage` |
| PUT | `/api/school/live/events/{id}` | `live:event:manage` |
| DELETE | `/api/school/live/events/{id}` | `live:event:manage` |
| GET | `/api/school/live/matches/{id}/referees` | `live:referee:manage` |
| PUT | `/api/school/live/matches/{id}/referees` | `live:referee:manage` |
| GET | `/api/school/live/matches/{id}/files` | `live:file:manage` |
| POST | `/api/school/live/matches/{id}/files` | `live:file:manage` |
| GET | `/api/school/live/files/{id}/download` | `live:file:manage` |
| DELETE | `/api/school/live/files/{id}` | `live:file:manage` |
| PUT | `/api/school/live/matches/{id}/live-link` | `live:link:manage` |
| POST | `/api/school/live/matches/{id}/face-verify` | `live:face:manage` |
| GET | `/api/school/live/matches/{id}/face-verify-records` | `live:face:manage` |

> 参数/响应/错误码同 4.1–4.6，不再重复。

---

## 6. 运动员端（5 条，前缀 `/api/athlete`）

- 权限：`role_permission('athlete')`；admin 直通但会因无运动员档案返回 30001
- 所有接口要求存在 `AthleteProfile`，否则 30001 "运动员资料不存在"

### 6.1 `GET /api/athlete/profile`
响应 `data`：

```json
{
  "id": 1, "name": "王球员", "jersey_no": 10, "position": "中场",
  "status": "approved", "reject_reason": null,
  "team": { "id": 1, "name": "成都实验中学足球队", "logo": null,
            "group_type": "middle_school", "status": "approved" }
}
```

- 未挂靠球队时 `team=null`

### 6.2 `PUT /api/athlete/profile`
- Body（全部可选）：

| 字段 | 必填 | 类型/约束 |
|---|---|---|
| `name` | 否 | string ≤50；同步写 `users.name` |
| `jersey_no` | 否 | int 0–99 / null |
| `position` | 否 | string ≤20 / null / "" |

- 响应：同 6.1 更新后的结构
- **不能修改** `team_id`、`id_card`、`avatar`、`status`（实名/头像只能由省级接口操作）

### 6.3 `GET /api/athlete/matches`
- Query：`status`（`not_started|live|finished`）
- 非法 status 值 → 直接返回 `{ "list": [], "team_id": null }`（不报错）
- 未挂球队 → 同上空结构
- 响应 `data`：

```json
{
  "list": [{
    "id": 3, "group_type": "middle_school", "match_time": "2026-10-26T15:00:00+08:00",
    "venue": "成都体育中心", "status": "not_started", "is_home": true,
    "opponent": "绵阳南山中学", "my_score": 0, "opponent_score": 0, "live_link": null
  }],
  "team_id": 1
}
```

- 非分页；按 `-match_time` 排序；`match_time` 为 ISO 格式（与其他模块不一致）
- `my_score/opponent_score` 已按我方视角换算

### 6.4 `GET /api/athlete/stats`
响应 `data`：

```json
{ "goals": 2, "assists": 0, "yellow_cards": 1, "red_cards": 0,
  "appearances": 2, "team_record": { "win": 1, "draw": 1, "loss": 0 } }
```

- 数据源：`match_events.athlete_id` 实时聚合
- `assists`：`type=goal` 且 `related_player_name == 本人姓名`
- `appearances`：本人有事件且比赛已结束的去重比赛数
- `team_record`：所属球队已结束比赛的胜平负

### 6.5 `GET /api/athlete/standings`
响应 `data`：

```json
{
  "group_type": "middle_school",
  "standings": [{
    "team_id": 1, "team_name": "成都实验中学足球队", "played": 2,
    "win": 1, "draw": 1, "loss": 0, "gf": 3, "ga": 2, "gd": 1,
    "points": 4, "is_my_team": true
  }],
  "top_scorers": [{
    "athlete_id": 1, "name": "王球员", "jersey_no": 10,
    "team_name": "成都实验中学足球队", "goals": 2
  }]
}
```

- 统计范围：本组别 + 已结束 + 双方均绑定 `team_id` 的比赛
- 积分：胜 3 平 1 负 0；排序：积分 → 净胜球 → 进球数
- 参赛队：本组别 `Team.status=approved`
- 射手榜：前 10，必须事件带 `athlete_id`
- 未挂球队 → `{ "standings": [], "top_scorers": [], "group_type": null }`

---

## 7. 提交方报名（8 条，教练 / 校级）

- 权限：`role_permission('coach', 'school')`，admin 直通
- 球队范围：coach = 自己执教的球队；school = 本校全部球队
- **admin 虽能通过角色校验，但 `_submitter_team_ids` 对 admin 返回空集合，实际会 20004**（不能代提交/代查看）
- 报名状态机：`draft → submitted → city_approved → reported → approved`，任一级驳回 → `rejected`（记录 `reject_level` + `reject_reason`），驳回后可重新 `submit`

### 7.1 `GET /api/competitions`
- 权限：**任意登录用户**（`IsAuthenticated`）
- Query：`status`(`open|closed`)、`page`、`page_size`（无 keyword）
- 响应 `data`：分页 + `list: Competition[]`

```json
{ "id": 1, "name": "2026 四川省青少年足球联赛", "year": 2026,
  "status": "open", "status_display": "报名中", "created_at": "2026-09-01T10:00:00+08:00" }
```

- 只读；**没有赛事创建/编辑/删除接口**

### 7.2 `GET /api/registrations`
- Query：`keyword`（球队/学校/教练姓名）、`status`、`competition_id`、`group_type`、`city_id`、`page`、`page_size`
- 响应 `data`：分页 + `list: RegistrationListItem[]`

**RegistrationListItem**

```
id, competition, competition_name, competition_year,
team, team_name, group_type, group_type_display,
school_name, school_county, city_id, city_name,
status, status_display, reject_level, reject_level_display, reject_reason,
player_count, archived, archived_at,
submitted_at, reported_at, created_at
```

- `status`：`draft|submitted|city_approved|reported|approved|rejected`
- `reject_level`：`city|province|null`
- `archived`：布尔，`archived_at != null`

### 7.3 `POST /api/registrations`
- Body：`competition_id`*（int ≥1）、`team_id`*（int ≥1）
- 校验：
  - 赛事必须存在（30001）且 `status=open`（否则 10001 "该赛事报名已截止"）
  - 球队必须在可操作范围（20004）
  - 同赛事同球队只能一份（40009）
- 响应 `data`：RegistrationDetail
- 副作用：创建 `draft` 记录 + `RegistrationLog(create)`

### 7.4 `GET /api/registrations/{id}`
- 校验：报名单球队必须在可操作范围（20004）
- 响应 `data`：RegistrationDetail

**RegistrationDetail** = RegistrationListItem +：

| 字段 | 说明 |
|---|---|
| `coach` | `CoachMaterial \| null`：`id,user_id,name,phone,id_card(脱敏),has_qualification,qualification_name,status,reject_reason` |
| `players` | `PlayerMaterial[]`：`id,user_id,name,jersey_no,position,id_card(脱敏),has_enrollment_cert,has_avatar,enrollment_cert_name,avatar_name,status,reject_reason` |
| `has_stamped_form` | bool |
| `stamped_form_name` | string/null |
| `city_reviewed_at` | ISO / null |
| `province_reviewed_at` | ISO / null |

- 身份证脱敏：保留前 3 位 + 后 4 位，中间 `*`；≤7 位全打码
- `players` 按 `jersey_no, id` 升序

### 7.5 `POST /api/registrations/{id}/submit`
- Body：无
- 前置：状态 `draft|rejected`，否则 10001
- 完整度校验（任一不满足即 10001，msg 拼接缺失项）：
  1. 已上传盖章报名表扫描件
  2. 教练姓名 + 教练资质附件 + 教练实名认证 `approved`
  3. 球员 ≥1，且每名球员已上传学籍材料、实名认证 `approved`
- 响应：RegistrationDetail
- 副作用：`status=submitted`、清空驳回信息、写 `submitted_at`、日志 `submit`

### 7.6 `POST /api/registrations/{id}/stamped-form`
- multipart：`file`*（pdf/jpg/jpeg/png，≤10MB）
- 状态限制：仅 `draft|rejected` 可上传/替换；已归档 → 10001；其他状态 → 10001
- 响应：RegistrationDetail
- 文件落 `storage/private/registrations/{id}/`，旧文件自动删除

### 7.7 `POST /api/registrations/{id}/athletes/{athlete_id}/enrollment-cert`
- multipart：`file`*（pdf/jpg/jpeg/png，≤10MB）
- 校验：报名单在可操作范围；未归档；`athlete_id` 必须属于该报名单的球队（否则 30001）
- 响应：RegistrationDetail
- 材料挂在 `AthleteProfile.enrollment_cert_*`，**不限制报名单状态**（已提交/已通过仍可补传，只要未归档）

### 7.8 `POST /api/registrations/{id}/coach-qualification`
- multipart：`file`*（pdf/jpg/jpeg/png，≤10MB）
- 校验：报名单在可操作范围；未归档；球队教练必须有 `CoachProfile`（否则 30001）
- 响应：RegistrationDetail
- 材料挂在 `CoachProfile.qualification_*`

---

## 8. 市州审核（12 条，前缀 `/api/city`，role=city/county）

- 权限：`role_permission('city', 'county')`，admin 直通
- 数据域：city 角色 = 本市；county 角色 = 本市 + `school.county` 精确匹配；未绑定返回空
- 所有单条接口在越权时返回 20004

### 8.1 `GET /api/city/registrations`
- Query：`keyword`、`status`、`competition_id`、`group_type`、`city_id`、`page`、`page_size`
- 响应：分页 + `RegistrationListItem[]`
- 额外注解 `player_count`，避免 N+1

### 8.2 `GET /api/city/registrations/summary`
- Query：`competition_id`（可选）
- 响应 `data`（非分页）：

```json
{
  "scope": "city | county | all",
  "county": "武侯区 | null",
  "by_school": [{ "name": "成都实验中学", "total": 3,
                  "draft": 0, "submitted": 1, "city_approved": 1,
                  "reported": 1, "approved": 0, "rejected": 0 }],
  "by_group": [{ "name": "middle_school", "total": 3, "...": "同上状态键" }],
  "total": 3
}
```

- `by_group.name` 为组别枚举原值（非中文）

### 8.3 `POST /api/city/registrations/report`
- Body：`ids`*（int 数组，1–200 个，每个 ≥1）
- 行为：逐个报送，单个失败不中断
- 响应 `data`：`{ "reported": [1,2], "failed": [{ "id": 3, "msg": "仅市州通过的报名单可报送" }] }`

### 8.4 `GET /api/city/registrations/{id}`
- 响应：RegistrationDetail
- 越权 → 20004；不存在 → 30001

### 8.5 `GET /api/city/registrations/{id}/completeness`
- 响应 `data`：

```json
{
  "complete": false,
  "items": [
    { "key": "stamped_form", "label": "盖章报名表扫描件", "ok": true, "missing": [] },
    { "key": "coach", "label": "教练信息", "ok": false, "missing": ["教练资质附件", "教练实名认证未通过"] },
    { "key": "players", "label": "球员名单与学籍材料", "ok": false,
      "total": 2, "missing": ["以下球员未上传学籍材料：张三"] }
  ],
  "missing": ["教练资质附件", "..."]
}
```

### 8.6 `POST /api/city/registrations/{id}/approve`
- Body：无
- 前置：`status=submitted`，否则 10001
- 响应：RegistrationDetail（`status=city_approved`）

### 8.7 `POST /api/city/registrations/{id}/reject`
- Body：`reason`*（string ≤500）
- 前置：`status=submitted`，否则 10001
- 响应：RegistrationDetail（`status=rejected`、`reject_level=city`）

### 8.8 `POST /api/city/registrations/{id}/report`
- Body：无
- 前置：`status=city_approved`，否则 10001
- 响应：RegistrationDetail（`status=reported`）

### 8.9 `POST /api/city/registrations/{id}/archive`
- Body：无
- 前置：未归档；状态必须为 `city_approved|reported|approved`，否则 10001
- 响应：RegistrationDetail（写 `archived_at/archived_by`）
- 归档后提交方不可再上传/替换资料

### 8.10 `GET /api/city/registrations/{id}/stamped-form/download`
- 响应：二进制附件（`stamped_form_name` 为文件名）
- 报名单不存在/未上传/磁盘缺失 → 30001
- 越权 → 20004

### 8.11 `GET /api/city/athletes/{id}/enrollment-cert/download`
- 响应：二进制附件
- 权限：球员必须属于本市（county 账号还需区县匹配），否则 20004
- 球员不存在 → 30001；材料未上传 → 30001

### 8.12 `GET /api/city/coaches/{id}/qualification/download`
- 响应：二进制附件
- 权限：该教练必须有球队属于本市（county 账号还需区县匹配），否则 20004
- 教练不存在/材料未上传 → 30001

---

## 9. 省级审核（23 条，前缀 `/api/province`，role=province）

- 权限：`role_permission('province')`，admin 直通
- **注意**：省级接口未按 `province_profile.province_id` 过滤，实际是全省/全量数据（当前仅 seed 一个省）
- 账号管理类接口中，涉及 `admin` 角色的目标账号仅 admin 可操作

### 9.1 报名审核

| 方法 | 路径 | Query | Body |
|---|---|---|---|
| GET | `/api/province/registrations` | `keyword,status,competition_id,group_type,city_id,page,page_size` | — |
| GET | `/api/province/registrations/export` | 同上（分页参数无效） | — |
| GET | `/api/province/registrations/statistics` | `competition_id` | — |
| GET | `/api/province/registrations/{id}` | — | — |
| POST | `/api/province/registrations/{id}/approve` | — | 无 |
| POST | `/api/province/registrations/{id}/reject` | — | `reason`* ≤500 |
| GET | `/api/province/registrations/{id}/stamped-form` | `inline=1` 可选 | — |
| GET | `/api/province/registrations/{id}/form-docx` | — | — |

- 列表：分页 + `RegistrationListItem[]`
- 详情：RegistrationDetail
- approve：仅 `status=reported`，否则 10001 → `approved`
- reject：仅 `status=reported` → `rejected`、`reject_level=province`
- stamped-form：默认附件下载；`inline=1` 浏览器内联查看；未上传 → 30001
- form-docx：服务端用 `python-docx` 生成报名表 Word，**不套信封**；写 `form_download` 日志
- export：`openpyxl` 生成 xlsx，**不套信封**；支持列表同款筛选；写 `export` 日志；文件名 `报名情况.xlsx`
- statistics 响应（非分页，**键名保留 Django 聚合原键**）：

```json
{
  "by_city": [{ "team__school__city_id": 1, "team__school__city__name": "成都市",
                "total": 5, "draft": 0, "submitted": 1, "city_approved": 1,
                "reported": 2, "approved": 1, "rejected": 0 }],
  "by_group": [{ "team__group_type": "middle_school", "total": 3, "...": "状态键" }],
  "university_by_school": [{ "team__school_id": 1, "team__school__name": "四川大学", "...": "" }],
  "by_team": [{ "team_id": 1, "team__name": "成都实验中学足球队",
                "team__school__name": "成都实验中学",
                "team__school__city__name": "成都市",
                "team__group_type": "middle_school", "total": 3, "...": "状态键" }],
  "athlete_by_city": [{ "city_id": 1, "city_name": "成都市", "total": 30,
                        "pending": 5, "approved": 24, "rejected": 1 }],
  "athlete_overall": { "total": 30, "pending": 5, "approved": 24, "rejected": 1 },
  "total": 8
}
```

> 前端若需要 `city_name / group_type` 等语义键，需自行映射，后端当前未做重命名。

### 9.2 教练员

| 方法 | 路径 | Query | Body |
|---|---|---|---|
| GET | `/api/province/coaches` | `keyword(name/phone/id_card),status,page,page_size` | — |
| PUT | `/api/province/coaches/{id}` | — | `name`、`phone`（手机号格式）、`id_card`（≤18） |
| POST | `/api/province/coaches/{id}/verify` | — | `approve`*（bool）、`reason`（驳回必填 ≤500） |
| GET | `/api/province/coaches/{id}/qualification/download` | — | — |

- 列表：分页 + `CoachMaterial[]`；`keyword` 命中未脱敏身份证号
- **`ProvinceCoachDetailView` 只实现了 PUT，没有 GET**（访问 GET 会 405 → 10001）
- PUT 返回 CoachMaterial；有变更时写 `identity_update` 日志
- verify：仅 `pending` 可操作；通过要求 `id_card` 非空；返回 CoachMaterial
- 下载：未上传/不存在 → 30001

### 9.3 运动员

| 方法 | 路径 | Query | Body |
|---|---|---|---|
| GET | `/api/province/athletes` | `keyword(name/id_card/team name),team_id,status,page,page_size` | — |
| PUT | `/api/province/athletes/{id}` | — | `name`、`jersey_no`(0–99)、`position`、`id_card`(≤18)、`team_id`(≥1) |
| POST | `/api/province/athletes/{id}/verify` | — | `approve`*、`reason`（驳回必填） |
| POST | `/api/province/athletes/{id}/avatar` | — | multipart `file`*（jpg/jpeg/png） |
| GET | `/api/province/athletes/{id}/avatar` | — | — |
| GET | `/api/province/athletes/{id}/enrollment-cert/download` | — | — |

- 列表：分页 + `PlayerMaterial[]`
- **`ProvinceAthleteDetailView` 只实现了 PUT，没有 GET**
- PUT 返回 PlayerMaterial，写 `identity_update` 日志
- verify：仅 `pending`；通过要求 `id_card`；返回 PlayerMaterial
- 头像上传：替换旧文件，写 `avatar_upload` 日志，返回 PlayerMaterial
- 头像查看：内联二进制（`inline=True`），未上传 → 30001
- 学籍下载：未上传 → 30001

### 9.4 报名账号管理

| 方法 | 路径 | Query | Body |
|---|---|---|---|
| GET | `/api/province/accounts` | `role,keyword(name/phone/email),page,page_size` | — |
| POST | `/api/province/accounts` | — | AccountCreate |
| PUT | `/api/province/accounts/{id}` | — | AccountUpdate |
| DELETE | `/api/province/accounts/{id}` | — | — |

- 账号范围：`city / county / school / province / admin`（`MANAGED_ACCOUNT_ROLES`）；不含 coach/athlete/personal
- 响应 `data`：Account

```
id, name, phone, email, role, role_display, status,
city_id, province_id, county, school_id, date_joined
```

**AccountCreate**

| 字段 | 必填 | 约束 |
|---|---|---|
| `role` | 是 | `city\|county\|school\|province\|admin` |
| `name` | 是 | ≤50 |
| `password` | 是 | 6–64 |
| `phone` | 条件 | 非 admin 必填，手机号，唯一 |
| `email` | 条件 | admin 必填，唯一（不区分大小写） |
| `city_id` | 条件 | city/county 必填 |
| `province_id` | 条件 | province 必填 |
| `county` | 条件 | county 必填 |
| `school_id` | 条件 | school 必填 |

- 创建 school 账号自动写入 13 个默认权限点
- 创建 admin 账号仅 admin 本人可操作，否则 20004
- 响应 Account

**AccountUpdate**
- 可选：`name`、`phone`、`email`、`status(active|disabled)`、`password`、`city_id`、`province_id`、`county`、`school_id`、`permissions[]`
- `permissions` 仅 admin 可改，否则 20004
- **手机号/邮箱未做唯一性校验**，冲突可能抛数据库异常 → 90001 **【需运行确认】**
- DELETE：不能删除当前登录账号（10001）；响应 `{ "id": 1 }`

### 9.5 `GET /api/province/logs`
- Query：`action`、`registration_id`、`actor_id`、`date_from`、`date_to`（日期字符串）、`page`、`page_size`
- 响应：分页 + `RegistrationLog[]`

```json
{ "id": 1, "registration": 7, "action": "city_approve", "action_display": "市州通过",
  "actor": 2, "actor_name": "张三", "detail": {}, "created_at": "2026-11-01T10:00:00+08:00" }
```

- `action` 枚举：`create, submit, city_approve, city_reject, report, province_approve, province_reject, material_upload, avatar_upload, form_download, export, archive, account_create, account_update, account_delete, identity_update, identity_approve, identity_reject`
- 无角色/数据域过滤：province 可见全量日志

---

## 10. 校级审核 / 通知 / 日志（6 条，前缀 `/api/school`）

- 权限：`role_permission('school')`，admin 直通
- 所有接口要求账号绑定学校，否则 20004 "当前账号未绑定学校"
- 注意：`/api/school/live/*` 属于第 5 节，与本组路径并列但不冲突

### 10.1 `POST /api/school/coaches/{id}/verify`
- Body：`approve`*（bool）、`reason`（驳回时必填，≤500）
- 校验：教练必须通过其执教球队归属本校（否则 20004）；仅 `pending` 可审核（10001）
- 通过要求 `id_card` 非空（10001）
- 响应 `data`：`CoachMaterial`
- 副作用：写 `RegistrationLog(identity_approve/reject)` + `SchoolAuditLog`

### 10.2 `POST /api/school/athletes/{id}/verify`
- Body：同上
- 校验：球员必须属于本校球队（否则 20004）；仅 `pending`；通过要求 `id_card`
- 响应 `data`：`PlayerMaterial`
- 副作用：同上

### 10.3 `GET /api/school/statistics`
- 响应 `data`：

```json
{
  "school_id": 1, "school_name": "成都实验中学",
  "teams": { "total": 2, "by_status": { "pending": 0, "approved": 2, "rejected": 0 } },
  "registrations": { "total": 3, "by_status": { "draft": 1, "submitted": 1, "approved": 1 } },
  "athletes": { "total": 20, "by_status": { "pending": 2, "approved": 18, "rejected": 0 } },
  "coaches": { "total": 2, "by_status": { "pending": 0, "approved": 2, "rejected": 0 } }
}
```

- `by_status` 只包含有数据的键（Django `values_list().annotate()` 结果）
- 非分页

### 10.4 `GET /api/school/notifications`
- Query：`page`、`page_size`
- 响应：分页 + `list: SchoolNotification[]`
- 字段：`id, title, content, created_by, created_at`
- 仅本校通知

### 10.5 `POST /api/school/notifications`
- Body：`title`*（≤100）、`content`*（≤5000）
- 响应 `data`：新建的 SchoolNotification
- 副作用：写 `SchoolAuditLog(action='notification.create')`

### 10.6 `GET /api/school/audit-logs`
- Query：`action`、`page`、`page_size`
- `action` 允许值（代码硬编码）：`identity.approve, identity.reject, notification.create, match.create, match.update, match.delete`
- 非法值 → 10001
- 响应：分页 + `list: SchoolAuditLog[]`
- 字段：`id, action, target, detail, actor_name, created_at`
- **已知不一致**：实际写入的动作为 `identity_approve` / `identity_reject`（下划线），与过滤器允许的 `identity.approve/identity.reject`（点号）不匹配，因此按 `identity.*` 过滤永远查不到数据；`match.*` 也未在校级直播视图写审计日志

---

## 11. 后端缺失能力（不可臆造接口）

以下能力在本次盘点的路由/视图中**不存在**，前端不能按"应该有"的方式调用：

### 11.1 球队与赛事
- **球队 CRUD 缺失**：只有 `GET /api/admin/teams`（列表），无创建/编辑/删除/审核球队；也没有 `/api/coach/teams*`、`/api/school/teams*`
- **赛事 CRUD 缺失**：只有 `GET /api/competitions`（列表），无创建/编辑/删除；`Competition` 模型也只有 `name/year/status`，没有规程、报名时间、封面、组别、赛程等字段
- 无"赛事详情"接口（`/api/competitions/{id}` 未实现）
- 无赛程/轮次/分组编排接口
- 无球队-运动员名单维护接口（球员归属只能由省级 `PUT /api/province/athletes/{id}` 的 `team_id` 改）
- 比赛列表/详情**不返回** `home_team_id / away_team_id`，前端无法从比赛直接跳转球队；只能靠球队名称字符串匹配
- 比赛列表不支持按球队、日期区间筛选（管理端仅 `keyword` 模糊匹配主客队名）

### 11.2 新闻 / 门户
- 无新闻、新闻分类、Banner 的模型与接口（实施计划里规划过，但当前代码未落地）
- 无 `/api/public/news*`、`/api/public/banners*`
- 无富文本/图片上传（新闻封面）接口

### 11.3 榜单 / 统计 / 精彩瞬间
- 无**公众**积分榜/射手榜接口；榜单只在 `GET /api/athlete/standings`（需 athlete 角色 + 档案）
- 无跨组别/全省总榜单
- 无"精彩瞬间"/集锦/相册/视频片段模型与接口
- 无管理员全局统计；统计仅有：
  - `GET /api/city/registrations/summary`（市州报名）
  - `GET /api/province/registrations/statistics`（省级报名/球员）
  - `GET /api/school/statistics`（本校）
- 无裁判主数据管理（只能在单场比赛内配置裁判）

### 11.4 账号与资料
- 无 `POST /api/auth/refresh`（refresh 无法换发 access）
- 无修改密码/找回密码接口
- 无管理员用户管理独立接口（复用 `/api/province/accounts*`，且仅覆盖市/县/校/省/管理员角色）
- coach / personal 无资料编辑接口；coach 无法自助提交身份证号实现实名
- athlete 无自助上传头像、无自助填写身份证号（只有省级接口能改），而校级实名审核通过又要求 `id_card` 非空，形成流程缺口
- school 无法修改学校 `county`
- **校级端没有"待审核教练/运动员列表"接口**，只能按 `id` 直接调 verify；`id` 需从报名详情 `coach/players` 或省级列表获取

### 11.5 文件与其它
- 报名材料无删除接口（只能替换）
- 通知无编辑/删除/已读状态
- 比赛删除为软删除，无恢复接口
- 无人脸核验真实第三方对接（mock）
- 无审计日志的 city/province 独立入口（仅有 school 与 province 的报名日志）
- 无 WebSocket/SSE 实时推送，直播靠轮询 `since_id`
- **无图片/文件上传通用接口**：学校/球队 `logo`、比赛 `home_team_logo/away_team_logo` 都只接收字符串路径，需要前端已有可访问 URL
- 无 CORS 配置（`django-cors-headers` 未安装/未配置）；前后端分端口联调需同源代理或自行处理 **【需运行确认】**

---

## 12. 本地启动 / 迁移 / Seed / 默认账号 / 健康检查

### 12.1 环境

```powershell
cd c:\Users\ZhuanZ\Desktop\try-rootball\soccer-database-main

# 建议虚拟环境
python -m venv .venv
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
Copy-Item .env.example .env
```

依赖（`requirements.txt`）：Django 6.1、DRF 3.18、simplejwt 5.5、django-filter、Pillow、python-dotenv、requests、python-docx、openpyxl。

`.env` 关键项：

```
DJANGO_SECRET_KEY=change-me-in-production
DJANGO_DEBUG=1
DJANGO_ALLOWED_HOSTS=*
DB_ENGINE=sqlite          # sqlite | mysql
DB_NAME=db.sqlite3
MAX_FILE_SIZE=10485760
MAX_IMAGE_SIZE=10485760
```

- 默认 SQLite：`<项目根>/db.sqlite3`
- MySQL：设置 `DB_ENGINE=mysql` 及 `DB_USER/DB_PASSWORD/DB_HOST/DB_PORT`
- 私有文件目录：`<项目根>/storage/private`（自动创建子目录）

### 12.2 迁移与种子

```powershell
python manage.py migrate
python manage.py seed_admin
```

- `migrate` 会执行 `org.0002_seed_sichuan`：预置 **四川省 1 条 + 21 个市州**
- `seed_admin` 默认创建/重置管理员：
  - 邮箱：`admin@ball.local`
  - 密码：`admin123`
  - 角色：`admin`，`is_staff/is_superuser=true`
  - 支持参数：`--email`、`--password`、`--name`
- **没有**演示球队/赛事/运动员 seed 命令；冒烟脚本会自行创建测试学校/球队/运动员/比赛

### 12.3 启动

```powershell
python manage.py runserver 0.0.0.0:8000
```

- API Base：`http://127.0.0.1:8000/api`
- 健康检查：

```powershell
curl.exe http://127.0.0.1:8000/api/health
```

预期：

```json
{ "code": 0, "msg": "success", "data": { "status": "up", "time": "..." },
  "success": true, "trace_id": "..." }
```

### 12.4 冒烟测试

```powershell
# 需服务已启动，且已 migrate + seed_admin
python scripts/smoke_test.py
# 或指定地址
$env:BASE_URL="http://127.0.0.1:8000"; python scripts/smoke_test.py
```

覆盖：认证、权限隔离、公众端、管理端比赛 CRUD/乐观锁、事件与比分联动、裁判/阵容/直播链接、状态流转、文件上传下载、运动员端、行政区划、登出（共 60+ 断言）。

### 12.5 默认测试数据（冒烟脚本创建）

- 学校：成都实验中学（取 `510100` 成都市，或首个城市）
- 教练：`13900000001`（无密码，仅 DB 记录）
- 球队：成都实验中学足球队（middle_school / approved）
- 运动员：`13800000001` / `pass1234`（approved，球衣 10，中场）
- 对手队：绵阳南山中学
- 两场比赛：一 finished 2:1，一 not_started

> 该段数据仅用于联调，不是业务 seed。

---

## 13. 联调需优先确认的事项

1. **时间格式不统一**：直播模块 `YYYY-MM-DD HH:mm:ss`，报名/运动员端为 ISO；前端需按模块适配。
2. **错误信息被拍平**：表单字段错误只能从 `msg` 字符串解析，无法拿到结构化字段错误。
3. **`/api/auth/logout` 不吊销 access**，且无 refresh 接口；access 8h 过期后需重新登录。
4. **无尾斜杠**：所有请求路径不要加 `/`。
5. **`PUT /api/admin/live/matches/{id}` 缺 `version` 可能返回 90001**，前端必须携带。
6. **赛事创建 required 名字字段**：只传 `home_team_id/away_team_id` 不够，仍必须传 `home_team_name/away_team_name`。
7. **管理端详情不含 referees/events**：只有公众详情拼装；管理端需额外请求 `/events`、`/referees`。
8. **省级统计键名为 Django 原始聚合键**（`team__school__city_name`），前端需二次映射。
9. **校级审计日志 action 过滤器与实际写入值不一致**。
10. **学校 `county` 无接口可写**，区县账号数据域可能永远为空。
11. **运动员/教练实名资料无法自助补全**，会卡住"提交报名"的完整度校验。
12. **文件下载接口返回二进制**，前端需用 `responseType: blob`，不能按 JSON 解析。
13. **角色与权限点**：admin 全直通；校级账号可访问 `/api/admin/live/*`；前端路由守卫应以 `role` 为主、权限点为辅。
14. **无 CORS 配置**：Vite 开发服务器需配置 proxy 到 `http://127.0.0.1:8000`，否则浏览器跨域失败 **【需运行确认】**。

---

## 14. 接口数量汇总

| 模块 | 条数 |
|---|---|
| 认证 / 健康检查 | 6 |
| 行政区划 / 学校 / 团队 | 17 |
| 公众直播 | 3 |
| 管理端直播 | 20 |
| 校级直播 | 20 |
| 运动员端 | 5 |
| 提交方报名 | 8 |
| 市州审核 | 12 |
| 省级审核 | 23 |
| 校级审核 / 通知 / 日志 | 6 |
| **合计（METHOD + 路径条目）** | **120** |

> 去重后实际视图实现为 **100 个**：管理端直播与校级直播各 20 条共用同一批视图类，仅挂载前缀与数据域不同。
