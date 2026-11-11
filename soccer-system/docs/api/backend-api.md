# 后端 API 接口文档

> 服务：`soccer-database-main`（Django 6 + DRF + SimpleJWT）
> Base URL：`http://127.0.0.1:8000`
> 版本：2026-11-10
> 完整机器可读定义见 `openapi.json`（可直接导入 Apifox / Postman）

---

## 0. 通用约定

### 0.1 响应信封

除文件下载外，所有接口返回：

```json
{
  "code": 0,
  "msg": "success",
  "data": {},
  "success": true,
  "trace_id": "3f2c..."
}
```

- `code === 0` 表示成功；`success` 恒等于 `code === 0`。
- 错误时 `data` 为 `null`，`msg` 为一条可直接展示的中文说明。
- 校验错误不会返回字段级结构，例如 `"phone: 该手机号已被注册"`。

### 0.2 认证

- 请求头：`Authorization: Bearer <access>`
- 登录返回：`token`、`access`（同值）、`refresh`、`token_type`、`user`
- access 有效期 8 小时，refresh 7 天；**没有 refresh 换发接口**，过期需重新登录。
- 管理员（`role=admin`）必须走 `/api/admin/auth/login`（邮箱）；其他角色走 `/api/auth/login`（手机号）。

### 0.3 分页

Query：`page`（默认 1）、`page_size`（默认 20，最大 100）。

```json
{
  "list": [],
  "next_page": null,
  "total": 0,
  "page": 1,
  "page_size": 20
}
```

### 0.4 错误码

| code | HTTP | 含义 |
|---|---|---|
| 0 | 200 | 成功 |
| 9 | 400 | 乐观锁冲突（version 不匹配） |
| 10001 | 400/405 | 参数校验失败 / 方法不允许 |
| 10006 | 400 | 文件格式不支持 |
| 10007 | 400 | 文件超过 10MB |
| 20001 | 401 | 未登录或令牌失效 |
| 20002 | 400 | 账号或密码错误 |
| 20003 | 400 | 账号已禁用 |
| 20004 | 400/403 | 无操作权限 |
| 30001 | 404 | 资源不存在 |
| 40002 | 400 | 比赛已结束/状态流转非法 |
| 40009 | 400 | 重复提交（client_token 或重复报名） |
| 90001 | 500/429 | 系统繁忙 |

### 0.5 文件

- multipart 字段名统一为 `file`（人脸核验为 `photo`）。
- 允许扩展名：赛事文件/报名材料 `.pdf .jpg .jpeg .png`；头像 `.jpg .jpeg .png`。
- 下载接口返回二进制，不套信封。

---

## 1. 健康检查与认证

### 1.1 健康检查

`GET /api/health`（免登）

```json
{ "code": 0, "msg": "success", "data": { "status": "up", "time": "2026-11-10T18:00:00+08:00" } }
```

### 1.2 注册

`POST /api/auth/register`（免登）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `name` | string | 是 | 姓名，≤50 |
| `phone` | string | 是 | 11 位手机号，全局唯一 |
| `password` | string | 是 | 6–64 位 |
| `role` | string | 是 | `personal` / `coach` / `athlete` |

响应 `data` 同登录结构。错误：手机号重复或格式错 → `10001`。

### 1.3 统一登录（非管理员）

`POST /api/auth/login`

```json
{ "phone": "13800000001", "password": "pass1234" }
```

`data`：

```json
{
  "token": "<access>",
  "access": "<access>",
  "refresh": "<refresh>",
  "token_type": "Bearer",
  "user": {
    "id": 1, "name": "王球员", "phone": "13800000001", "email": null,
    "role": "athlete", "role_display": "运动员",
    "status": "active", "is_admin": false, "permissions": [],
    "profile": { "id": 1, "team_id": 1, "jersey_no": 9, "position": "前锋", "status": "approved", "reject_reason": null },
    "date_joined": "2026-10-01T10:00:00+08:00"
  }
}
```

错误：`20002` 账号/密码错误；`20003` 禁用；`20004` 管理员走错入口。

### 1.4 管理员登录

`POST /api/admin/auth/login`

```json
{ "email": "admin@ball.local", "password": "admin123" }
```

响应同上，`user.role=admin`、`is_admin=true`。

### 1.5 当前用户

`GET /api/auth/me`（登录）

返回 `user` 对象，用于刷新页面恢复登录态与权限点。

### 1.6 登出

`POST /api/auth/logout`（登录）

```json
{ "refresh": "<refresh>" }
```

`refresh` 可选；仅加入黑名单，access 不会立即失效。

---

## 2. 赛事与报名

### 2.1 赛事列表

`GET /api/competitions`（登录）

Query：`status`（`open` / `closed`）、`page`、`page_size`。

`data.list[]`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | number | 赛事 ID |
| `name` | string | 名称 |
| `year` | number | 年份 |
| `status` | string | `open` / `closed` |
| `status_display` | string | 报名中 / 已截止 |
| `created_at` | string | ISO 8601 |

### 2.2 我的报名单

`GET /api/registrations`（coach / personal / school）

Query：`keyword`、`status`、`competition_id`、`group_type`、`city_id`、`page`、`page_size`。

`data.list[]` 关键字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | number | 报名单 ID |
| `competition` / `competition_name` | number/string | 赛事 |
| `team` / `team_name` | number/string | 球队 |
| `school_name` | string | 学校 |
| `city_id` / `city_name` | number/string | 城市 |
| `group_type` / `group_type_display` | string | 组别 |
| `status` / `status_display` | string | 后端状态与中文 |
| `reject_level` / `reject_level_display` | string | 驳回层级 |
| `reject_reason` | string | 驳回原因 |
| `player_count` | number | 球员数 |
| `submitted_at` / `reported_at` / `created_at` | string | ISO 8601 |

### 2.2.1 我的球队

`GET /api/teams/mine`（coach / personal / school）

返回当前账号的球队，含 `players` 与 `coaches`；无球队时 `data` 为 `null`。

`PUT /api/teams/mine`（coach / personal）

```json
{
  "name": "成都实验中学一队",
  "school_id": 1,
  "group": "中学组",
  "found_time": "2019-09-01",
  "captain": "刘队长",
  "intro": "球队简介，不少于 20 字",
  "flag_uploaded": true,
  "logo_uploaded": true,
  "photo_uploaded": true
}
```

教练/球队负责人首次保存时自动创建球队并绑定当前账号；校级账号只读本校第一支球队。

### 2.2.2 球队成员

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/teams/{id}/athletes` | coach / personal / school | 球员名单 |
| PUT | `/api/teams/{id}/athletes` | 同上 | `{members:[{name,idCard,birthDate,position,jerseyNo,photoUploaded}]}` |
| GET | `/api/teams/{id}/coaches` | 同上 | 教练组，无自定义成员时回退主教练 |
| PUT | `/api/teams/{id}/coaches` | 同上 | `{coaches:[{name,category,level,phone}]}` |
| GET | `/api/school/teams` | school | 本校球队列表 |

`PUT` 为整体保存：未出现在列表中的球员/教练会被移除；新增球员会生成占位运动员账号（无手机号）。

### 2.2.3 球员库

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/players` | admin/province/city/county/school | `keyword`、`city`、`group`、`status` |
| GET | `/api/players/{id}` | 同上 | 档案 + 球队 + 赛季汇总 + 比赛明细 |
| POST | `/api/players/{id}/publicize` | admin/province | `{publicized: true|false}` |
| GET | `/api/players/mine/records` | athlete | 本人球队比赛明细 |

- `status`：`已公示`（publicized）、`待审核`（审核通过未公示）、`未公示`。
- 出场分钟/首发/评分暂无采集来源，返回 0；进球、红黄牌由比赛事件聚合。

### 2.3 创建报名单（草稿）

`POST /api/registrations`（coach / personal / school）

```json
{ "competition_id": 1, "team_id": 1 }
```

唯一约束：同一赛事同一球队只能一份，重复 → `40009`。

### 2.4 提交报名

`POST /api/registrations/{id}/submit`（coach / personal / school）

提交前需满足：已上传盖章报名表、教练资质与实名通过、至少 1 名球员且学籍材料齐全。驳回后可重新提交，状态回到 `submitted`。

上传盖章报名表：`POST /api/registrations/{id}/stamped-form`，multipart 字段 `file`（PDF/JPG/PNG）。

### 2.5 市州审核

| 方法 | 路径 | Body | 说明 |
|---|---|---|---|
| GET | `/api/city/registrations` | — | 本市报名单列表 |
| GET | `/api/city/registrations/{id}` | — | 详情（含球员/教练/材料） |
| POST | `/api/city/registrations/{id}/approve` | — | 通过，状态 `city_approved` |
| POST | `/api/city/registrations/{id}/reject` | `{ "reason": "..." }` | 驳回 |
| POST | `/api/city/registrations/{id}/report` | — | 报送省级，状态 `reported` |
| GET | `/api/city/registrations/{id}/completeness` | — | 材料完整度 |

### 2.6 省级审核

| 方法 | 路径 | Body | 说明 |
|---|---|---|---|
| GET | `/api/province/registrations` | — | 全省列表 |
| GET | `/api/province/registrations/{id}` | — | 详情 |
| POST | `/api/province/registrations/{id}/approve` | — | 终审通过，状态 `approved` |
| POST | `/api/province/registrations/{id}/reject` | `{ "reason": "..." }` | 省级驳回 |
| GET | `/api/province/registrations/statistics` | — | 省级统计 |
| GET | `/api/province/registrations/export` | — | 导出 xlsx（二进制） |

状态流转：`draft → submitted → city_approved → reported → approved`；任一审核驳回 → `rejected`。

---

## 3. 赛事直播

### 3.1 公众端（免登）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/public/live/matches` | 列表，支持 `status`、`group_type`、`keyword`、分页 |
| GET | `/api/public/live/matches/{id}` | 详情，含 `lineup_home/away`、`live_link`、`referees` |
| GET | `/api/public/live/matches/{id}/events` | 事件列表，`since_id` 增量拉取 |

比赛字段：`id, group_type, group_type_label, home_team_id, away_team_id, home_team_name, away_team_name, home_team_logo, away_team_logo, match_time, venue, status, status_label, home_score, away_score`。时间格式 `YYYY-MM-DD HH:mm:ss`。

### 3.2 校级管理端（登录 + `live:*` 权限点）

前缀 `/api/school/live`（`/api/admin/live` 同一批视图，管理员/省级看全量）。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET/POST | `/matches` | 列表 / 新建 |
| GET/PUT/DELETE | `/matches/{id}` | 详情 / 更新（带 `version`） / 软删除 |
| PATCH | `/matches/{id}/status` | `{action:'start'|'finish', version}` |
| PUT | `/matches/{id}/lineup` | `{version, lineup_home[], lineup_away[]}` |
| GET/POST | `/matches/{id}/events` | 事件列表 / 新增（`client_token` 幂等） |
| PUT/DELETE | `/events/{id}` | 修改 / 删除事件 |
| GET/PUT | `/matches/{id}/referees` | 裁判列表 / 整体替换 |
| GET/POST | `/matches/{id}/files` | 文件列表 / 上传（`type` + `file`） |
| DELETE | `/files/{id}` | 删除文件 |
| GET | `/files/{id}/download` | 下载（二进制） |
| PUT | `/matches/{id}/live-link` | `{live_link}`，传 null 清除 |
| POST | `/matches/{id}/face-verify` | 人脸核验（`player_name`、`player_no`、`photo`） |
| GET | `/matches/{id}/face-verify-records` | 核验记录 |

新建比赛 Body：

```json
{
  "group_type": "middle_school",
  "home_team_id": 1,
  "away_team_id": 2,
  "home_team_name": "成都实验中学",
  "away_team_name": "绵阳南山中学",
  "match_time": "2026-11-01T15:00:00+08:00",
  "venue": "成都体育中心"
}
```

事件 Body：

```json
{
  "type": "goal",
  "minute": 12,
  "team_side": "home",
  "player_name": "王球员",
  "player_no": "10",
  "client_token": "唯一字符串",
  "athlete_id": 1
}
```

`type`：`goal` / `yellow` / `red` / `substitution` / `text`。文字事件无需主客队与球员；换人必须传 `related_player_name`。

### 3.3 运动员端

前缀 `/api/athlete`（role=athlete）。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET/PUT | `/profile` | 本人资料 / 更新 `name,jersey_no,position` |
| GET | `/matches` | 本人球队比赛，`status` 过滤 |
| GET | `/stats` | 球队战绩与个人数据 |
| GET | `/standings` | 积分榜，含 `is_my_team` |

---

## 4. 组织端

前缀 `/api/admin`（管理员）与 `/api/city/schools`。

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET/POST | `/api/admin/provinces` | admin | 省份列表 / 新建 |
| GET/PUT/DELETE | `/api/admin/provinces/{id}` | admin | 详情 / 更新 / 删除 |
| GET/POST | `/api/admin/cities` | admin/city | 城市列表 / 新建 |
| GET/PUT/DELETE | `/api/admin/cities/{id}` | admin | 详情 / 更新 / 删除 |
| GET/POST | `/api/admin/schools` | admin | 学校列表 / 新建 |
| GET/PUT/DELETE | `/api/admin/schools/{id}` | admin | 详情 / 更新 / 删除 |
| GET | `/api/admin/teams` | admin | 球队列表 |
| GET | `/api/city/schools` | 登录 | 本市学校列表 |

---

## 5. 联调注意事项

1. **所有路径无尾斜杠**，`/api/auth/login/` 会 404。
2. 管理员与普通账号登录入口不同，角色不匹配返回 `20004`。
3. 审核接口的错误以 `code` 为准，不要只看 HTTP 状态。
4. 报名单状态是英文枚举，前端展示需映射中文。
5. 直播模块时间格式为 `YYYY-MM-DD HH:mm:ss`，运动员端与报名为 ISO 8601。
6. 文件下载接口返回二进制，前端需用 `fetch` 读取 `Blob`，不要走 JSON 解析。
