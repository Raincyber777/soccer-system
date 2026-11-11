# 前后端接口对照表

> 前端：`soccer-system`（Vue 3） · 后端：`soccer-database-main`（Django DRF）
> 日期：2026-11-10
> 结论标记：✅ 已接通 · 🟡 部分接通 · ⛔ 后端缺接口，保留 mock

## 1. 总览

| # | 前端 API 对象 | 方法数 | 结论 | 后端接口 |
|---|---|---|---|---|
| 1 | `authApi` | 5 | ✅ | `/api/auth/*`、`/api/admin/auth/login` |
| 2 | `tournamentApi` | 7 | 🟡 仅 `list` 接后端；写接口与等级/报名时间字段仍缺 | `GET /api/competitions` |
| 3 | `registrationApi` | 6 | ✅ 含用户端创建/上传盖章表/提交审核 | `/api/registrations`、`/api/city|province/registrations/*` |
| 4 | `teamApi` | 2 | ✅ | `/api/teams/mine` |
| 5 | `teamRosterApi` | 5 | ✅ | `/api/teams/{id}/athletes`、`/coaches` |
| 6 | `playerApi` | 4 | ✅ 列表/详情/公示/我的明细；详细评分暂缺 | `/api/players*` |
| 7 | `summaryApi` | 1 | ⛔ | 无跨维度汇总 |
| 8 | `statsApi` | 2 | ⛔ | 仅校级/省级统计，契约不同 |
| 9 | `matchEventApi` | 3 | ⛔ | 事件按比赛维度，无球员聚合 |
| 10 | `reportApi` | 1 | ⛔ | 无 AI 报告 |
| 11 | `rankingApi` | 1 | ⛔ | 无门户射手榜 |
| 12 | `portalApi` | 5 | 🟡 仅 `schedule` 可接 | `GET /api/public/live/matches` |
| 13 | `identityApi` | 4 | ⛔ | 无用户端实名提交/列表 |
| 14 | `momentApi` | 6 | ⛔ | 无精彩瞬间 |
| 15 | `goalDetectionApi` | 3 | ⛔ | 无视觉进球 |
| 16 | `cameraApi` | 2 | ⛔ | 无摄像设备 |
| 17 | `publicLiveApi` | 2 | ⛔ | 无进球记录/AI 报告 |
| 18 | `schoolMatchApi` | 5 | ✅ | `/api/school/live/matches*` |
| 19 | `schoolLiveApi` | 21 | 🟡 19 个方法可接，报告/手动比分缺 | `/api/school/live/*` |
| 20 | `scoreboardApi` | 5 | ⛔ | 无计分板端口 |
| 21 | `schoolProfileApi` | 2 | ⛔ | 无本校信息读写 |
| 22 | `schoolTeamApi` | 1 | ✅ | `GET /api/school/teams` |
| 23 | `schoolTournamentApi` | 5 | ⛔ | 无校级赛事发布 |
| 24 | `schoolRegistrationApi` | 3 | ⛔ | 无校级报名代管 |

## 2. 已接通明细

### 2.1 认证 `authApi`

| 前端方法 | 后端 | 字段适配 |
|---|---|---|
| `login` | `POST /api/auth/login`（手机号） / `POST /api/admin/auth/login`（邮箱） | `phone/email + password`；返回 `access/refresh/user` |
| `register` | `POST /api/auth/register` | `username` 必须是手机号，映射 `name/phone`；persona → role |
| `restore` | `GET /api/auth/me` | 返回 `user`，映射 role/persona/profile |
| `clearSession` | — | 清 `soccer-token`、`soccer-refresh-token`、`soccer-role` |
| `listDemoAccounts` | — | 返回 `[]` |

角色映射：

| 后端 | 前端 |
|---|---|
| `admin` / `province` | `super` |
| `city` | `admin` |
| `school` | `school` |
| `athlete` | `user` + `student` |
| `coach` | `user` + `coach` |
| `personal` | `user` + `leader` |

### 2.2 报名 `registrationApi`

| 前端方法 | 后端 | 说明 |
|---|---|---|
| `list` | `GET /api/city/registrations` → 失败再试 `GET /api/province/registrations` | 角色不匹配时回退 mock |
| `listMine` | `GET /api/registrations` | coach/school |
| `approve(id,'city')` | `POST /api/city/registrations/{id}/approve` + `/report` | 通过后自动报送，对齐前端「已提交省级」 |
| `approve(id,'province')` | `POST /api/province/registrations/{id}/approve` | 终审通过 |
| `reject` | 按列表状态选 `city` 或 `province` 的 `/reject` | Body `{reason}` |
| `resubmit` | `POST /api/registrations/{id}/submit` | 驳回后重提 |
| `create` | `POST /api/registrations` + `/stamped-form` + `/submit` | 创建草稿 → 上传盖章表 → 提交审核；缺材料时返回后端缺失清单 |

状态映射：`draft/submitted/city_approved → 待初审`；`reported → 已提交省级`；`approved → 已通过`；`rejected → 已驳回`。

### 2.2.1 我的球队 `teamApi`

| 前端方法 | 后端 | 说明 |
|---|---|---|
| `getMine` | `GET /api/teams/mine` | 教练/球队负责人取自己执教的球队；返回球员与教练组 |
| `save` | `PUT /api/teams/mine` | 更新/创建球队资料，字段对齐前端完善度校验 |

### 2.2.2 球队成员 `teamRosterApi`

| 前端方法 | 后端 | 说明 |
|---|---|---|
| `members` | `GET /api/teams/{id}/athletes` | 球员名单，含脱敏身份证、出生日期、位置、球衣号 |
| `saveMembers` | `PUT /api/teams/{id}/athletes` | 整体保存，新增/更新/删除一次完成 |
| `coaches` | `GET /api/teams/{id}/coaches` | 教练组；无自定义成员时回退主教练档案 |
| `saveCoaches` | `PUT /api/teams/{id}/coaches` | 整体替换教练组 |
| `importMembers` | 读取后合并并 `PUT` | 按姓名+身份证去重，返回新增/跳过数量 |

### 2.2.3 球员库 `playerApi`

| 前端方法 | 后端 | 说明 |
|---|---|---|
| `list` | `GET /api/players` | 支持 keyword/city/group/status；按角色裁剪学校/城市 |
| `getDetail` | `GET /api/players/{id}` | 档案 + 球队 + 赛季汇总 + 比赛明细 |
| `setPublic` | `POST /api/players/{id}/publicize` | `{publicized: boolean}` |
| `myRecords` | `GET /api/players/mine/records` | 运动员本人球队的比赛明细 |

> 出场分钟、首发、评分等字段后端暂无采集来源，当前返回 0；进球/红黄牌来自比赛事件。

### 2.3 校级比赛 `schoolMatchApi`

| 前端方法 | 后端 | 说明 |
|---|---|---|
| `list` | `GET /api/school/live/matches?page_size=100` | `phase` 由 `status` 推导 |
| `create` | `POST /api/school/live/matches` | 球队 id 转数字，至少一支本校球队 |
| `update` | `PUT /api/school/live/matches/{id}` | 带 `version`，冲突 code=9 |
| `remove` | `DELETE /api/school/live/matches/{id}` | 软删除 |
| `setStatus` | `PATCH /api/school/live/matches/{id}/status` | `start/finish` |

### 2.4 校级比赛运营 `schoolLiveApi`

| 能力 | 后端 | 结论 |
|---|---|---|
| 事件列表/新增/修改/删除 | `/matches/{id}/events`、`/events/{id}` | ✅ 类型中英映射 |
| 阵容读取/保存 | `GET /matches/{id}` + `PUT /matches/{id}/lineup` | ✅ |
| 裁判读取/保存 | `GET/PUT /matches/{id}/referees` | ✅ 无手机号字段 |
| 文件列表/上传/删除/下载 | `/matches/{id}/files`、`/files/{id}` | ✅ multipart + Blob |
| 直播链接读取/保存/清除 | `GET /matches/{id}` + `PUT /matches/{id}/live-link` | ✅ 仅 URL |
| 人脸核验记录/核验 | `/face-verify-records`、`/face-verify` | ✅ multipart |
| 比分与阶段读取 | `GET /matches/{id}` | ✅ 阶段由状态推导 |
| 手动比分/阶段保存 | — | ⛔ 后端无接口 |
| AI 报告读取/生成 | — | ⛔ 后端无接口 |

### 2.5 门户 `portalApi`

| 方法 | 后端 | 结论 |
|---|---|---|
| `schedule` | `GET /api/public/live/matches?page_size=100` | ✅ |
| `news` / `policies` / `standings` / `matchNews` | — | ⛔ 保留 mock |

## 3. 后端缺口清单（按优先级）

| 优先级 | 缺口 | 影响页面 |
|---|---|---|
| P0 | 赛事（Competition）等级/组别/报名时间/发布状态 + 写接口 | 赛事管理、赛事列表字段不完整 |
| P1 | 用户端实名提交与查询 | 实名认证、报名资格提示 |
| P1 | 校级本校信息/赛事发布/报名代管 | 校级端部分页面 |
| P1 | 新闻/政策/榜单/精彩瞬间 | 门户首页、榜单页 |
| P2 | 视觉进球、摄像设备、计分板、AI 报告 | 直播运营增强 |

## 4. 字段差异与处理位置

| 差异 | 处理 |
|---|---|
| 信封 `message` vs `msg` | `src/api/live/client.ts` |
| 路径带尾斜杠 | 全部 live 模块改为无尾斜杠 |
| 时间格式 ISO vs `YYYY-MM-DD HH:mm:ss` | 适配层原样透传，展示层格式化 |
| 报名状态英文 vs 中文 | `src/api/live/registration.ts` |
| 事件/裁判/文件枚举英文 vs 中文 | `src/api/live/schoolLive.ts` |
| 比赛 phase 缺失 | `src/api/live/schoolMatch.ts` 由 status 推导 |
| 球队 id number vs string | `schoolMatch` / `schoolLive` 适配层转换 |
