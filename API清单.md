# 核心 API 清单

> 服务：`soccer-database-main`（Django + DRF + SimpleJWT）
> Base URL：`http://127.0.0.1:8000`
> 完整字段与示例：`soccer-system/docs/api/backend-api.md`
> 机器可读定义：`soccer-system/docs/api/openapi.json`（可导入 Apifox / Postman）
> 状态说明：✅ 前端已接真实接口；◐ 部分页面接入；○ 后端已提供、前端未接

---

## 0. 通用约定

- 响应信封：`{ code, msg, data, success, trace_id }`，`code === 0` 为成功。
- 认证头：`Authorization: Bearer <access>`。
- 路径无尾斜杠。
- 分页参数：`page`、`page_size`（默认 20，最大 100）。
- 管理员登录：`POST /api/admin/auth/login`（邮箱）；其他角色：`POST /api/auth/login`（手机号）。
- access 8 小时，refresh 7 天，无 refresh 换发接口。

---

## 1. 健康检查与认证

| 方法 | 路径 | 权限 | 说明 | 前端状态 |
|---|---|---|---|---|
| GET | `/api/health` | 免登 | 健康检查 | — |
| POST | `/api/auth/register` | 免登 | 注册 personal/coach/athlete | ✅ |
| POST | `/api/auth/login` | 免登 | 非管理员手机号登录 | ✅ |
| POST | `/api/admin/auth/login` | 免登 | 管理员邮箱登录 | ✅ |
| GET | `/api/auth/me` | 登录 | 当前用户与权限点 | ✅ |
| POST | `/api/auth/logout` | 登录 | 登出，refresh 入黑名单 | ✅ |

---

## 2. 赛事、球队与报名

### 2.1 赛事与球队

| 方法 | 路径 | 权限 | 说明 | 前端状态 |
|---|---|---|---|---|
| GET | `/api/competitions` | 登录 | 赛事列表，`status` 筛选 | ✅ |
| GET | `/api/teams/mine` | coach/personal/school | 我的球队（含球员、教练） | ✅ |
| PUT | `/api/teams/mine` | coach/personal | 保存/创建我的球队 | ✅ |
| GET | `/api/teams/{id}/athletes` | coach/personal/school | 球队球员名单 | ✅ |
| PUT | `/api/teams/{id}/athletes` | coach/personal/school | 整体保存球员名单 | ✅ |
| GET | `/api/teams/{id}/coaches` | coach/personal/school | 球队教练组 | ✅ |
| PUT | `/api/teams/{id}/coaches` | coach/personal/school | 整体保存教练组 | ✅ |
| GET | `/api/school/teams` | school | 本校球队列表 | ✅ |

### 2.2 报名单

| 方法 | 路径 | 权限 | 说明 | 前端状态 |
|---|---|---|---|---|
| GET | `/api/registrations` | coach/personal/school | 我的报名单列表 | ✅ |
| POST | `/api/registrations` | coach/personal/school | 创建报名草稿 | ✅ |
| POST | `/api/registrations/{id}/stamped-form` | coach/personal/school | 上传盖章报名表 | ✅ |
| POST | `/api/registrations/{id}/submit` | coach/personal/school | 提交审核 | ✅ |
| GET | `/api/registrations/{id}` | 登录 | 报名单详情 | ◐ |

### 2.3 市州审核

| 方法 | 路径 | 权限 | 说明 | 前端状态 |
|---|---|---|---|---|
| GET | `/api/city/registrations` | city/county | 本市报名单列表 | ✅ |
| GET | `/api/city/registrations/{id}` | city/county | 报名单详情 | ✅ |
| GET | `/api/city/registrations/{id}/completeness` | city/county | 材料完整度 | ◐ |
| POST | `/api/city/registrations/{id}/approve` | city/county | 初审通过 | ✅ |
| POST | `/api/city/registrations/{id}/reject` | city/county | 初审驳回 | ✅ |
| POST | `/api/city/registrations/{id}/report` | city/county | 报送省级 | ✅ |
| GET | `/api/city/registrations/summary` | city/county | 市州汇总 | ○ |

### 2.4 省级审核

| 方法 | 路径 | 权限 | 说明 | 前端状态 |
|---|---|---|---|---|
| GET | `/api/province/registrations` | province/admin | 全省报名单 | ✅ |
| GET | `/api/province/registrations/{id}` | province/admin | 报名单详情 | ✅ |
| POST | `/api/province/registrations/{id}/approve` | province/admin | 终审通过 | ✅ |
| POST | `/api/province/registrations/{id}/reject` | province/admin | 省级驳回 | ✅ |
| GET | `/api/province/registrations/statistics` | province/admin | 省级统计 | ○ |
| GET | `/api/province/registrations/export` | province/admin | 导出 xlsx | ○ |

状态流转：`draft → submitted → city_approved → reported → approved`，驳回为 `rejected`。

---

## 3. 赛事直播

### 3.1 公众端（免登）

| 方法 | 路径 | 说明 | 前端状态 |
|---|---|---|---|
| GET | `/api/public/live/matches` | 比赛列表，支持 status/group_type/keyword/分页 | ✅ |
| GET | `/api/public/live/matches/{id}` | 比赛详情，含阵容、直播链接、裁判 | ◐ |
| GET | `/api/public/live/matches/{id}/events` | 比赛事件，`since_id` 增量 | ◐ |

### 3.2 校级/管理端比赛运营

前缀 `/api/school/live`；管理员/省级使用 `/api/admin/live`，同一批视图。

| 方法 | 路径 | 说明 | 前端状态 |
|---|---|---|---|
| GET | `/matches` | 比赛列表 | ✅ |
| POST | `/matches` | 新建比赛 | ✅ |
| GET | `/matches/{id}` | 比赛详情 | ✅ |
| PUT | `/matches/{id}` | 更新比赛（带 version） | ✅ |
| DELETE | `/matches/{id}` | 软删除 | ✅ |
| PATCH | `/matches/{id}/status` | 开始/结束比赛 | ✅ |
| PUT | `/matches/{id}/lineup` | 保存首发阵容 | ✅ |
| GET | `/matches/{id}/events` | 事件列表 | ✅ |
| POST | `/matches/{id}/events` | 新增事件（client_token 幂等） | ✅ |
| PUT | `/events/{id}` | 修改事件 | ✅ |
| DELETE | `/events/{id}` | 删除事件 | ✅ |
| GET | `/matches/{id}/referees` | 裁判列表 | ✅ |
| PUT | `/matches/{id}/referees` | 整体保存裁判组 | ✅ |
| GET | `/matches/{id}/files` | 赛事文件列表 | ✅ |
| POST | `/matches/{id}/files` | 上传赛事文件 | ✅ |
| DELETE | `/files/{id}` | 删除赛事文件 | ✅ |
| GET | `/files/{id}/download` | 下载赛事文件（二进制） | ✅ |
| PUT | `/matches/{id}/live-link` | 配置/清除直播链接 | ✅ |
| POST | `/matches/{id}/face-verify` | 人脸核验 | ✅ |
| GET | `/matches/{id}/face-verify-records` | 核验记录 | ✅ |

---

## 4. 运动员端

前缀 `/api/athlete`，role=athlete。

| 方法 | 路径 | 说明 | 前端状态 |
|---|---|---|---|
| GET | `/profile` | 本人运动员资料 | ◐ |
| PUT | `/profile` | 更新姓名/号码/位置 | ◐ |
| GET | `/matches` | 本人球队比赛 | ◐ |
| GET | `/stats` | 球队战绩与个人数据 | ○ |
| GET | `/standings` | 积分榜 | ○ |

---

## 5. 球员库

| 方法 | 路径 | 权限 | 说明 | 前端状态 |
|---|---|---|---|---|
| GET | `/api/players` | admin/province/city/county/school | 球员列表，支持 keyword/city/group/status | ✅ |
| GET | `/api/players/{id}` | 同上 | 档案 + 球队 + 赛季汇总 + 比赛明细 | ✅ |
| POST | `/api/players/{id}/publicize` | admin/province | 公示/取消公示 | ✅ |
| GET | `/api/players/mine/records` | 登录 | 本人球队比赛明细 | ✅ |

说明：出场分钟、首发、平均评分暂无采集来源，返回 0；进球、红黄牌由比赛事件聚合。

---

## 6. 组织管理

| 方法 | 路径 | 权限 | 说明 | 前端状态 |
|---|---|---|---|---|
| GET | `/api/admin/provinces` | admin | 省份列表 | ○ |
| POST | `/api/admin/provinces` | admin | 新建省份 | ○ |
| GET | `/api/admin/provinces/{id}` | admin | 省份详情 | ○ |
| PUT | `/api/admin/provinces/{id}` | admin | 更新省份 | ○ |
| DELETE | `/api/admin/provinces/{id}` | admin | 删除省份 | ○ |
| GET | `/api/admin/cities` | admin/city | 城市列表 | ○ |
| POST | `/api/admin/cities` | admin/city | 新建城市 | ○ |
| GET | `/api/admin/cities/{id}` | admin | 城市详情 | ○ |
| PUT | `/api/admin/cities/{id}` | admin | 更新城市 | ○ |
| DELETE | `/api/admin/cities/{id}` | admin | 删除城市 | ○ |
| GET | `/api/admin/schools` | admin | 学校列表 | ○ |
| POST | `/api/admin/schools` | admin | 新建学校 | ○ |
| GET | `/api/admin/schools/{id}` | admin | 学校详情 | ○ |
| PUT | `/api/admin/schools/{id}` | admin | 更新学校 | ○ |
| DELETE | `/api/admin/schools/{id}` | admin | 删除学校 | ○ |
| GET | `/api/admin/teams` | admin | 球队列表 | ○ |
| GET | `/api/city/schools` | 登录 | 本市学校列表 | ○ |

---

## 7. 关键错误码

| code | HTTP | 含义 |
|---|---|---|
| 0 | 200 | 成功 |
| 9 | 400 | 乐观锁冲突 |
| 10001 | 400/405 | 参数校验失败 / 方法不允许 |
| 10006 | 400 | 文件格式不支持 |
| 10007 | 400 | 文件超过 10MB |
| 20001 | 401 | 未登录/令牌失效 |
| 20002 | 400 | 账号或密码错误 |
| 20003 | 400 | 账号已禁用 |
| 20004 | 400/403 | 无操作权限 |
| 30001 | 404 | 资源不存在 |
| 40002 | 400 | 比赛已结束/状态非法 |
| 40009 | 400 | 重复提交/重复报名 |
| 90001 | 500/429 | 系统繁忙 |
