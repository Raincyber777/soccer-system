# 前后端联调规格（soccer-system × soccer-database-main）

> 状态：已实施并验证
> 日期：2026-11-10
> 依据：`docs/backend-api-inventory.md`、`docs/frontend-api-inventory.md`、后端实际路由与序列化器
> 目标：把前端已有页面逐个对照后端真实接口接通；补齐 API 接口文档与 OpenAPI；最后用 Apifox 跑通冒烟用例。**不改动已验收的首页/工作台视觉与布局。**

---

## 1. 范围与原则

### 1.1 本轮做

1. 请求层基础设施对齐后端契约（信封、错误码、JWT、multipart、无尾斜杠）。
2. 认证全量接通：手机号/邮箱分流、角色与身份映射、`me` 恢复、登出。
3. 报名审核链路接通：提交方「我的报名」、市州/省级列表与通过/驳回/重提。
4. 校级比赛与比赛运营接通：比赛列表/新建/编辑/状态；事件、阵容、裁判、文件、直播链接、人脸核验。
5. 门户赛程接通：公众比赛列表/详情/事件。
6. 每个 API 对象在 `src/api/index.ts` 独立切换；后端无对应接口的对象继续走 mock，并在文档写明原因。
7. 产出：联调对照表、API 接口文档、OpenAPI 3、Apifox 环境与测试用例、实测记录。

### 1.2 本轮不做（后端缺接口，保留 mock）

| 模块 | 缺失能力 |
|---|---|
| `summaryApi` / `statsApi` | 跨维度统计汇总 |
| `matchEventApi`（管理端按球员聚合） | 无对应聚合接口 |
| `reportApi` / `rankingApi` | AI 报告、门户射手榜/积分榜 |
| `momentApi` / `portalApi.news/policies/standings` | 新闻、政策、图集、积分榜 |
| `goalDetectionApi` / `cameraApi` / `scoreboardApi` | 视觉进球、摄像设备、计分板 |
| `schoolProfileApi` / `schoolTournamentApi` / `schoolRegistrationApi` | 校级本校信息、赛事发布、报名代管 |
| `identityApi` | 用户端实名提交；仅省级/校级审核接口存在，但前端列表契约不一致 |
| `tournamentApi.create/publish/offline/setRegistration/getMaterial/saveMaterial` | 后端 `Competition` 无等级/组别/报名时间/发布状态字段与写接口 |

> 以上对象在 `VITE_USE_MOCK=false` 时仍返回本地 mock 数据；页面不会因切换而空白。

---

## 2. 通用契约（实现基线）

| 项 | 约定 |
|---|---|
| Base URL | `VITE_API_BASE || ''`，本地 `http://127.0.0.1:8000` |
| 路径 | **一律无尾斜杠**，如 `/api/auth/login` |
| 信封 | `{ code, msg, data, success, trace_id }`；`code === 0` 为成功 |
| 错误 | 优先取 `msg`，兼容旧 `message`；HTTP 非 2xx 但 `code` 存在时以 `code` 为准 |
| 认证 | `Authorization: Bearer <access>`；access 8h、refresh 7d；无刷新端点，401/20001 时清会话并回登录页 |
| 分页 | Query `page/page_size`，`data = { list, next_page, total, page, page_size }` |
| 时间 | 直播模块 `YYYY-MM-DD HH:mm:ss`；其余 ISO 8601；前端展示层统一格式化 |
| 文件 | multipart 字段名 `file`；下载接口返回二进制，不套信封 |
| 令牌存储 | `sessionStorage['soccer-token']`、`sessionStorage['soccer-refresh-token']`（沿用） |

---

## 3. 模块对照与适配

### 3.1 认证 `authApi`（全量接通）

文件：`src/api/live/auth.ts`

| 前端方法 | 后端接口 | 适配要点 |
|---|---|---|
| `listDemoAccounts` | — | 返回 `[]` |
| `login` | `POST /api/admin/auth/login`（账号含 `@`）或 `POST /api/auth/login`（手机号） | `entry=user` 只允许 athlete/coach/personal；`entry=admin` 允许 admin/province/city/school |
| `register` | `POST /api/auth/register` | `username` 必须是 11 位手机号，作为 `phone`；`name` 取 `username`；`role` 按 persona 映射：`student→athlete`、`coach→coach`、`leader→personal` |
| `restore` | `GET /api/auth/me` | 令牌存在才请求；失败清令牌返回 `null` |
| `clearSession` | — | 清两个 token；不强制调用登出 |

角色映射（后端 → 前端）：

| 后端 `role` | 前端 `role` | `persona` | `label` |
|---|---|---|---|
| `admin`、`province` | `super` | — | 超级管理员端 |
| `city` | `admin` | — | 管理端 · 普通管理员 |
| `school` | `school` | — | 校级管理员端 |
| `athlete` | `user` | `student` | 用户端 · 学生运动员 |
| `coach` | `user` | `coach` | 用户端 · 教练员 |
| `personal` / 其他 | `user` | `leader` | 用户端 · 球队负责人 |

附加字段：
- `account` 取 `user.phone || user.email || user.name`。
- `schoolCode`：`user.profile.school_id` 转字符串；`schoolName` 取 `user.profile.name`。
- `city`：`user.profile.city_id` 对应城市名不在登录响应中，先留空；页面右上角不展示城市。
- `permissions`：直接透传 `user.permissions`。

登录入口校验：入口不符抛 `ApiError(1003)`，且不落盘 token。

### 3.2 报名 `registrationApi`（审核链路接通）

新文件：`src/api/live/registration.ts`

| 前端方法 | 后端接口 | 适配要点 |
|---|---|---|
| `list` | `GET /api/city/registrations` 或 `GET /api/province/registrations` | 按当前会话角色选择：`admin→city`、`super→province`；mock 仍用于其他角色 |
| `listMine` | `GET /api/registrations` | 仅 coach/school 可用；后端 20004 时回退 mock |
| `approve(id,'city')` | `POST /api/city/registrations/{id}/approve` | 成功后回读详情 |
| `approve(id,'province')` | `POST /api/province/registrations/{id}/approve` | 同上 |
| `reject` | `POST /api/city|province/registrations/{id}/reject` `{reason}` | `reviewer` 前端字段后端不接收，忽略 |
| `resubmit` | `POST /api/registrations/{id}/submit` | 仅驳回后可用 |
| `create` | 暂不接（无 team_id），抛 `ApiError(1002,'球队尚未接入后端，报名提交暂不可用')` | 页面展示该提示 |

字段映射（后端 → 前端 `Registration`）：

| 前端 | 后端 |
|---|---|
| `id` | `String(id)` |
| `tournamentId` | `String(competition)` |
| `tournamentName` | `competition_name` |
| `team` | `team_name` |
| `school` | `school_name` |
| `city` | `city_name` |
| `group` | `group_type_display` |
| `players` | `player_count` |
| `submitTime` | `submitted_at || created_at` |
| `status` | `draft/submitted/city_approved/reported→'待初审'`；`approved→'已通过'`；`rejected→'已驳回'` |
| `rejectReason` | `reject_reason` |
| `canResubmit` | `status==='rejected'` |
| `remark` | `reject_level_display`（补充展示驳回层级） |

### 3.3 校级比赛 `schoolMatchApi`（全量接通）

新文件：`src/api/live/schoolMatch.ts`，后端前缀 `/api/school/live`

| 前端方法 | 后端接口 | 适配要点 |
|---|---|---|
| `list` | `GET /matches?page_size=100` | 取 `data.list`；`phase` 由 `status` 推导：未开始→`not_started`、进行中→`first_half`、已结束→`finished` |
| `create` | `POST /matches` | `home_team_id/away_team_id` 转数字，空值传 `null`；`match_time` 原样 ISO |
| `update` | `PUT /matches/{id}` | 必带 `version`（乐观锁），冲突 code=9 抛给页面 |
| `remove` | `DELETE /matches/{id}` | 仅未开始比赛可删除，后端返回 40002 时透传提示 |
| `setStatus` | `PATCH /matches/{id}/status` | `start/finish`；`version` 取列表行 |

`group_type` 映射：`university/middle_school/primary_school` 前后端一致；`status` 映射 `not_started/live/finished`；`home_team_id` 后端为整型，前端 `string|null` → `String()`/`null`。

### 3.4 校级比赛运营 `schoolLiveApi`（部分接通）

新文件：`src/api/live/schoolLive.ts`

| 前端方法 | 后端接口 | 状态 |
|---|---|---|
| `events` | `GET /matches/{id}/events` | ✅ 字段适配：`type` 中文↔英文、`side`↔`team_side`、`note`↔`content` |
| `createEvent` / `updateEvent` / `removeEvent` | `POST/PUT/DELETE /matches/{id}/events`、`/events/{id}` | ✅ 创建带 `client_token`（uuid） |
| `lineup` / `saveLineup` | `GET/PUT /matches/{id}/lineup` | ✅ `lineup_home/away` ↔ `home/away`，`no`↔`jersey_no` |
| `referees` / `saveReferees` | `GET/PUT /matches/{id}/referees` | ✅ `role` 中文↔英文，`phone` 后端不存，忽略 |
| `files` / `uploadFile` / `removeFile` / `downloadFile` | `/matches/{id}/files`、`/files/{id}` | ✅ `type` 中文↔英文；下载走 `fetch` + Blob |
| `liveLink` / `saveLiveLink` / `clearLiveLink` | `GET/PUT /matches/{id}/live-link` | ✅ 后端只有 url，`platform` 由前端固定「其他」 |
| `faceRecords` / `verifyFace` | `GET/POST /matches/{id}/face-verify` | ✅ multipart：`player_name`、`player_no`、`photo` |
| `state` | `GET /matches/{id}` | ✅ 由 `home_score/away_score/status` 组装；`source='system'` |
| `saveState` | 暂不接 | 后端无手动比分/阶段接口，抛明确提示 |
| `report` / `generateReport` | 暂不接 | 后端无 AI 报告，返回 `null` / 抛提示 |

### 3.5 门户赛程 `portalApi.schedule`（接通）

新文件：`src/api/live/portal.ts`，混合对象：

| 方法 | 后端 | 说明 |
|---|---|---|
| `schedule` | `GET /api/public/live/matches?page_size=100` | 映射为 `PortalMatch`；`id` 转 string，`round` 取 `group_type_label`，`status` 由 `status_label` 映射 |
| `news/policies/standings/matchNews` | mock | 后端无接口，保持 mock |
| `matchDetail`（若类型有） | `GET /api/public/live/matches/{id}` | 详情与事件事件用真实数据 |

`src/api/index.ts` 用对象展开：`{ ...mockPortalApi, schedule: liveSchedule, matchDetail: liveDetail }`。

### 3.6 切换策略

`src/api/index.ts` 改为按对象切换，而不是全局 mock：

```ts
export const authApi = USE_MOCK ? mockAuthApi : liveAuthApi
export const registrationApi = USE_MOCK ? mockRegistrationApi : liveRegistrationApi
export const schoolMatchApi = USE_MOCK ? mockSchoolMatchApi : liveSchoolMatchApi
export const schoolLiveApi = USE_MOCK ? mockSchoolLiveApi : liveSchoolLiveApi
export const portalApi = USE_MOCK ? mockPortalApi : livePortalApi
// 其余对象保持 mock，注释写明后端缺口
```

`VITE_USE_MOCK=false` 时上述 5 个对象走真实接口，其余仍为 mock。

---

## 4. 基础设施改动

### 4.1 `src/api/live/client.ts`

- `Envelope` 增加 `msg?`、`success?`、`trace_id?`，错误信息读 `msg || message`。
- `Content-Type` 仅在 body 非 `FormData` 时设置。
- 新增 `apiGet/apiPost/apiPut/apiPatch/apiDelete/apiUpload/apiDownload` 辅助函数。
- `request` 保留 8s 超时；`apiUpload` 15s；`apiDownload` 返回 `Blob`，若响应为 JSON 信封则解析并抛错。
- `BASE_URL` 去掉结尾 `/`，路径不以 `/` 开头时自动补。
- 暴露 `getToken/setTokens/clearTokens`。

### 4.2 环境

新建 `soccer-system/.env.local`：

```dotenv
VITE_USE_MOCK=false
VITE_API_BASE=http://127.0.0.1:8000
```

后端需允许 `http://localhost:5173` 跨域（`config/settings.py` 已有 `CORS_ALLOW_ALL_ORIGINS` 则无需改；否则加 `django-cors-headers` 或 Vite proxy）。**优先用 Vite proxy**：`vite.config.ts` 增加 `/api -> http://127.0.0.1:8000`，`.env.local` 的 `VITE_API_BASE` 留空，避免 CORS。

---

## 5. 文档与 Apifox

1. `docs/backend-integration-plan.md`：24 个前端对象 × 后端接口对照表，标注可接/缺后端/字段差异。
2. `docs/api/backend-api.md`：按模块列出方法、路径、权限、Query、Body、响应字段、错误码、示例。
3. `docs/api/openapi.json`：OpenAPI 3.0，覆盖本轮实际接入的接口 + 后端核心接口（认证/报名/直播/运动员/组织），含 Bearer 安全方案与分页 schema。
4. `docs/api/apifox-environment.json`：`baseUrl=http://127.0.0.1:8000`、`token` 变量。
5. `docs/api/apifox-tests.md`：Apifox 导入 OpenAPI → 选择环境 → 按「认证 → 赛事/报名 → 直播 → 运动员 → 组织」顺序执行；附预期 code。
6. `scripts/apifox_smoke.py`：与 Apifox 用例同序的 HTTP 冒烟脚本，记录实际结果到 `docs/api/smoke-result.md`。若本机可安装 Apifox CLI，再用 `apifox run` 复跑同一 OpenAPI。

---

## 6. 验收标准

### 6.1 命令

- `npm run type-check` 通过。
- `npm run build-only` 通过。
- 后端 `python manage.py check`、`migrate`、`seed_admin`、`runserver` 正常。
- `python scripts/apifox_smoke.py` 全部 PASS（允许无数据接口返回空列表）。

### 6.2 浏览器（VITE_USE_MOCK=false）

1. 管理员 `admin@ball.local/admin123` 登录进入超管端；用户 `13800000001/pass1234` 登录进入用户端；校级账号登录进入校级端。
2. 登录后刷新页面，`/api/auth/me` 恢复角色与权限点，不跳回登录页。
3. 首页赛程区块展示后端公众比赛；比赛详情能打开。
4. 校级「比赛管理」列表显示后端比赛；新建/编辑/开始/结束可用；详情页事件、阵容、裁判、文件、直播链接、人脸核验可用。
5. 市州管理员「报名初审」显示后端报名单，通过/驳回后状态与后端一致。
6. 控制台无未捕获异常；UI 样式、字号、布局与当前版本一致。

### 6.3 文档

- 对照表 24 个对象全部有结论（接通/保持 mock + 原因）。
- OpenAPI 可被 Apifox 无警告导入，接口数与文档一致。
- 冒烟结果与 Apifox 用例一一对应。

---

## 7. 风险与处理

| 风险 | 处理 |
|---|---|
| 后端未初始化数据库/账号 | 用 `python -m venv .venv` 安装依赖、`migrate`、`seed_admin`；失败则记录阻塞并继续前端适配 |
| 角色登录入口不一致 | 仅手机号走 `/api/auth/login`，仅邮箱走 `/api/admin/auth/login`；其余组合给出明确提示 |
| 后端字段与前端类型不一致 | 全部在 `live/*.ts` 适配，不污染页面组件 |
| 时间格式不一致 | 适配层统一转 `YYYY-MM-DD HH:mm:ss`，展示层不再二次处理 |
| 切换真实接口导致无后端页面空白 | 未接模块继续 mock；`index.ts` 逐对象切换 |
| 校级账号无 live 权限点 | seed 校级账号默认带 13 个权限点；无权限时页面提示 20004 |
| 报名创建不可用 | 明确提示「球队尚未接入后端」，避免静默失败 |

---

## 8. 交付物清单

- 代码：`src/api/live/{client,auth,registration,schoolMatch,schoolLive,portal}.ts`、`src/api/index.ts`、`.env.local`、`vite.config.ts`（proxy）。
- 文档：`docs/backend-integration-plan.md`、`docs/api/backend-api.md`、`docs/api/openapi.json`、`docs/api/apifox-environment.json`、`docs/api/apifox-tests.md`、`docs/api/smoke-result.md`。
- 脚本：`scripts/apifox_smoke.py`。
- 验证：type-check、build、后端冒烟、浏览器截图/记录。
