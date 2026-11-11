# 前端 API 盘点（前后端联调用）

- 项目：`soccer-system`（Vue 3 + TypeScript + Vite）
- 盘点日期：2026-11-10
- 盘点范围：`src/api/index.ts`、`src/api/types.ts`、`src/api/live/*`、`src/api/mock/*`，以及 `src/user/pages`、`src/admin/pages`、`src/school/pages`、`src/super/pages`、`src/components/portal`、`src/components/common` 中的调用
- 参照后端：`soccer-database-main`（Django，`config/urls.py` 实际路由）与根目录《接口文档-ESP32-后端-前端对接.md》

## 0. 结论速览

| 指标 | 数值 |
|---|---|
| `index.ts` 导出的 API 对象 | **24 个** |
| API 方法总数 | **101 个**（接口定义在 `src/api/types.ts`） |
| 真实接口实现（live） | 仅 `liveAuthApi` 1 个对象（5 个方法） |
| 纯 mock 实现 | 23 个对象、96 个方法 |
| 前端有、后端无对应路由的模块 | 视觉进球判定、摄像设备、计分板端口、精彩瞬间、AI 报告、门户榜单/新闻/政策/进球记录、统计汇总、实名认证、校级本校信息 |
| 关键阻塞 | 除 `authApi` 外其余对象**没有 live 实现**；`liveAuthApi` 的登录契约（字段/路径/角色映射）与当前后端不一致 |

> 重要：`VITE_USE_MOCK=false` 目前**只切换认证**，其余 23 个对象在 `src/api/index.ts` 中被硬编码为 `mockXxxApi`，即使关闭 mock 仍走本地假数据。

---

## 1. 接口开关与请求层

### 1.1 开关

`src/api/index.ts:19`：

```ts
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
```

- 默认（未设置、空值、任意其它字符串）→ **mock**。
- 只有精确等于字符串 `'false'` 才走真实接口。
- `src/api/index.ts:21` 是唯一使用该开关的地方：

```ts
export const authApi: AuthApi = USE_MOCK ? mockAuthApi : liveAuthApi
```

其余对象（`tournamentApi`、`registrationApi`、`teamApi`、`playerApi`、`summaryApi`、`matchEventApi`、`reportApi`、`rankingApi`、`portalApi`、`identityApi`、`statsApi`、`momentApi`、`goalDetectionApi`、`cameraApi`、`publicLiveApi`、`schoolMatchApi`、`schoolLiveApi`、`scoreboardApi`、`schoolProfileApi`、`schoolTeamApi`、`teamRosterApi`、`schoolTournamentApi`、`schoolRegistrationApi`）全部直接指向 mock。

### 1.2 真实请求客户端 `src/api/live/client.ts`

| 项 | 现状 |
|---|---|
| 基地址 | `BASE_URL = import.meta.env.VITE_API_BASE \|\| ''`，同域部署留空 |
| 超时 | 8000 ms，`AbortController` 中断 |
| 令牌 | `sessionStorage['soccer-token']`，请求头 `Authorization: Bearer <token>` |
| 刷新令牌 | `sessionStorage['soccer-refresh-token']`，**只写入不使用，没有刷新流程** |
| 请求头 | 强制 `Content-Type: application/json`（不支持 FormData 上传） |
| 成功判定 | 响应体含 `code` 字段时要求 `code === 0`；无信封的响应直接返回 |
| 错误信息 | 读取 `message`；错误统一抛 `ApiError`，网络异常固定为 `ApiError(-1, '网络异常，请稍后重试')` |

### 1.3 环境变量切换入口

仓库内**没有** `.env` / `.env.local` / `.env.development` 文件，`env.d.ts` 只做类型声明：

```ts
readonly VITE_USE_MOCK?: string
readonly VITE_API_BASE?: string
```

联调时在 `soccer-system/` 下新建 `.env.local`：

```dotenv
VITE_USE_MOCK=false
VITE_API_BASE=http://127.0.0.1:8000
```

注意：

1. `BASE_URL` 与路径是字符串拼接，`VITE_API_BASE` **不要带结尾斜杠**（否则出现 `//api`）。
2. 修改后需重启 `vite dev`（环境变量在构建期注入）。
3. 跨域访问后端时，后端需放行该前端 Origin 并允许 `Authorization` 头。
4. 关闭 mock 后，`listDemoAccounts()` 返回空数组（`liveAuthApi` 实现），登录页不再显示演示账号。

### 1.4 附带的非 API 导出

| 导出 | 位置 | 用途 |
|---|---|---|
| `teamCompleteness(team)` | `src/api/teamCompleteness.ts` | 球队完善度 0-100 加权评分，报名资格校验 |
| `liveMatchOptions()` | `src/api/mock/liveGoal.ts:817` | 管理端比赛下拉（含校级数据裁剪） |
| `schoolTeamOptions()` | `src/api/mock/liveGoal.ts:902` | 校级举办比赛的球队下拉 |
| `LIVE_PLATFORMS` | `src/api/mock/liveGoal.ts:1031` | `['抖音','视频号','B站','其他']` |
| `ApiError` | `src/api/error.ts` | `code` + `message` |

---

## 2. 总览

| # | API 对象 | 领域 | 方法数 | 当前实现 | 后端是否存在对应路由 |
|---|---|---|---|---|---|
| 1 | `authApi` | 认证 | 5 | **混合**（`USE_MOCK` 决定 mock/live） | 部分（登录/注册/me/logout） |
| 2 | `tournamentApi` | 赛事 | 7 | mock | 部分（仅 `competitions` 列表） |
| 3 | `registrationApi` | 报名 | 6 | mock | 部分（提交方 + 市/省审核） |
| 4 | `teamApi` | 球队 | 2 | mock | 无（组织侧仅有管理员 `teams` 列表） |
| 5 | `teamRosterApi` | 球队人员 | 5 | mock | 无 |
| 6 | `playerApi` | 球员 | 4 | mock | 部分（`/api/athlete/*` 为本人视角） |
| 7 | `summaryApi` | 统计汇总 | 1 | mock | 部分（校级/省级 statistics） |
| 8 | `statsApi` | 统计汇总 | 2 | mock | 部分（同上，口径不同） |
| 9 | `matchEventApi` | 比赛事件 | 3 | mock | 无（后端事件按 `match_id` 维度） |
| 10 | `reportApi` | AI 报告 | 1 | mock | 无 |
| 11 | `rankingApi` | 榜单 | 1 | mock | 无（门户射手榜） |
| 12 | `portalApi` | 门户 | 5 | mock | 部分（仅比赛列表/详情/事件） |
| 13 | `identityApi` | 实名 | 4 | mock | 部分（校级/省级按 athlete id 审核） |
| 14 | `momentApi` | 精彩瞬间 | 6 | mock（localStorage + IndexedDB） | 无 |
| 15 | `goalDetectionApi` | 直播管理端 | 3 | mock | 无 |
| 16 | `cameraApi` | 直播管理端 | 2 | mock | 无 |
| 17 | `publicLiveApi` | 直播公众端 | 2 | mock | 无 |
| 18 | `schoolMatchApi` | 校级端 | 5 | mock | 有（`/api/school/live/matches`） |
| 19 | `schoolLiveApi` | 校级端 | 21 | mock | 有（事件/阵容/裁判/文件/直播链接/人脸核验） |
| 20 | `scoreboardApi` | 校级端 | 5 | mock | 无 |
| 21 | `schoolProfileApi` | 校级端 | 2 | mock | 无 |
| 22 | `schoolTeamApi` | 校级端 | 1 | mock | 无（`/api/admin/teams` 仅管理员） |
| 23 | `schoolTournamentApi` | 校级端 | 5 | mock | 无（校级赛事发布） |
| 24 | `schoolRegistrationApi` | 校级端 | 3 | mock | 无（后端 `school` 路由只有审核/统计/通知） |

---

## 3. 分领域清单

> “页面使用位置”中的路径均相对 `soccer-system/src/`，行号为当前代码行。
> “数据依赖”指 mock 实现读取/写入的本地存储或派生数据源。

### 3.1 认证

| 方法 | 签名 | 入参 / 返回类型 | 实现 | 页面使用位置 | 数据依赖 |
|---|---|---|---|---|---|
| `listDemoAccounts` | `(entry: LoginEntry): DemoAccount[]` | `LoginEntry` → `DemoAccount[]`（同步） | 混合 | `components/AuthPage.vue:46` | mock：`mock/auth.ts` 内置账号（仅 `import.meta.env.DEV` 生效）；live：返回 `[]` |
| `login` | `(input: LoginInput): Promise<LoginResult>` | `{ account, password, entry }` → `LoginResult` | 混合 | `components/AuthPage.vue:109`、`:124`（演示账号快捷登录） | mock：`soccer-login-guard`（失败 5 次锁 15 分钟）、`soccer-registered-users`、`soccer-session-store`；live：`POST /api/auth/login/` |
| `register` | `(input: RegisterInput): Promise<LoginResult>` | `{ username, password, email, school, schoolCode, persona }` → `LoginResult` | 混合 | `components/AuthPage.vue:168` | mock：PBKDF2 写入 `soccer-registered-users`、签发会话；live：`POST /api/auth/register/` |
| `restore` | `(): Promise<LoginResult \| null>` | — → `LoginResult \| null` | 混合 | `stores/auth.ts:93`（`routers/index.ts:86` 路由守卫调用） | mock：`sessionStorage['soccer-session']` + `soccer-session-store`（TTL 8h）；live：`GET /api/auth/me/` |
| `clearSession` | `(): void` | — → `void` | 混合 | `stores/auth.ts:111`（各 Layout 退出登录调用 `logout()`） | mock：清 `soccer-session`、`soccer-session-store` 中当前令牌；live：清 `soccer-token`/`soccer-refresh-token` |

`authApi` 是唯一“混合”对象；mock 侧不回传 `city/district` 到 `restore()`（`mock/auth.ts:190-200` 漏了这两个字段），刷新后管理员数据范围会丢失。

### 3.2 赛事

| 方法 | 签名 | 入参 / 返回类型 | 实现 | 页面使用位置 | 数据依赖 |
|---|---|---|---|---|---|
| `tournamentApi.list` | `(query?: TournamentQuery): Promise<Tournament[]>` | `{ level?, status?, keyword?, publishedOnly? }` → `Tournament[]` | mock | `user/pages/TournamentList.vue:164`、`user/pages/RegistrationForm.vue:265`、`admin/pages/TournamentManage.vue:157`、`admin/pages/MatchEntry.vue:99`、`school/pages/SchoolRegistrations.vue:76` | `localStorage['soccer-tournaments']`；`publishedOnly` 排除“未发布/已下架” |
| `tournamentApi.create` | `(input: TournamentInput): Promise<Tournament>` | `TournamentInput` → `Tournament` | mock | `admin/pages/TournamentManage.vue:194` | 同上；省级赛事仅 `super` 可建 |
| `tournamentApi.publish` | `(id: string): Promise<Tournament>` | `string` → `Tournament` | mock | `admin/pages/TournamentManage.vue:259` | 状态置“报名中”并开放报名 |
| `tournamentApi.offline` | `(id: string): Promise<Tournament>` | `string` → `Tournament` | mock | `admin/pages/TournamentManage.vue:262` | 状态置“已下架”，关闭报名 |
| `tournamentApi.setRegistration` | `(id: string, enabled: boolean): Promise<Tournament>` | `string, boolean` → `Tournament` | mock | `admin/pages/TournamentManage.vue:265`、`:268` | 报名中 ↔ 已截止 |
| `tournamentApi.getMaterial` | `(id: string): Promise<TournamentMaterial \| null>` | `string` → `TournamentMaterial \| null` | mock | `admin/pages/TournamentManage.vue:162` | `localStorage['soccer-tournament-materials']` |
| `tournamentApi.saveMaterial` | `(id: string, input: TournamentMaterialInput): Promise<TournamentMaterial>` | `string, { schedule, results, roster }` → `TournamentMaterial` | mock | `admin/pages/TournamentManage.vue:230` | 同上；仅校级赛事允许 |

### 3.3 报名

| 方法 | 签名 | 入参 / 返回类型 | 实现 | 页面使用位置 | 数据依赖 |
|---|---|---|---|---|---|
| `registrationApi.list` | `(query?: RegistrationQuery): Promise<Registration[]>` | `{ keyword?, group?, status?, city? }` → `Registration[]` | mock | `admin/pages/RegistrationFirstReview.vue:79`（普通管理员固定 `{ city: '成都市' }`） | `localStorage['soccer-registrations']` |
| `registrationApi.listMine` | `(): Promise<Registration[]>` | — → `Registration[]` | mock | `user/pages/MyRegistrations.vue:82`、`user/pages/TournamentList.vue:165`、`user/pages/UserDashboard.vue:219`、`components/HomePage.vue:226` | 按会话账号过滤 `ownerAccount` |
| `registrationApi.create` | `(input: RegistrationInput): Promise<Registration>` | `RegistrationInput` → `Registration` | mock | `user/pages/RegistrationForm.vue:242` | 校验赛事开放报名、报名时间、球队完善度、重复报名；写 `soccer-registrations` |
| `registrationApi.approve` | `(id: string, stage: 'city' \| 'province'): Promise<Registration>` | `string, 'city'\|'province'` → `Registration` | mock | `admin/pages/RegistrationFirstReview.vue:119`（市州）、`:122`（省级） | 状态机：待初审 → 已提交省级 → 已通过 |
| `registrationApi.reject` | `(id: string, reason: string, reviewer: string): Promise<Registration>` | `string, string, string` → `Registration` | mock | `admin/pages/RegistrationFirstReview.vue:143` | 必须填原因；置“已驳回”并允许重新提交 |
| `registrationApi.resubmit` | `(id: string): Promise<Registration>` | `string` → `Registration` | mock | `user/pages/MyRegistrations.vue:118`、`:129` | 仅“已驳回”可重提，回到“待初审”，`resubmitCount+1` |

### 3.4 球队 / 球员 / 教练

| 方法 | 签名 | 入参 / 返回类型 | 实现 | 页面使用位置 | 数据依赖 |
|---|---|---|---|---|---|
| `teamApi.getMine` | `(): Promise<Team \| null>` | — → `Team \| null` | mock | `user/pages/TeamInfo.vue:137`、`user/pages/TeamCoaches.vue:110`、`user/pages/TeamMembers.vue:214`、`user/pages/UserDashboard.vue:218`、`user/pages/RegistrationForm.vue:266` | `localStorage['soccer-teams']`，按 `ownerAccount` 匹配（一账号一队） |
| `teamApi.save` | `(input: TeamInput): Promise<Team>` | `TeamInput` → `Team` | mock | `user/pages/TeamInfo.vue:107` | 新增或更新本人球队；写 `soccer-teams` |
| `teamRosterApi.members` | `(teamId?: string \| null): Promise<TeamPlayer[]>` | `string \| null` → `TeamPlayer[]` | mock | `user/pages/TeamMembers.vue:87`、`school/pages/SchoolPersonnel.vue:128` | 读球队 `players`；用户只能读自己队，校级只能读本校队 |
| `teamRosterApi.saveMembers` | `(teamId: string \| null, list: TeamPlayerInput[]): Promise<TeamPlayer[]>` | `string \| null, TeamPlayerInput[]` → `TeamPlayer[]` | mock | `user/pages/TeamMembers.vue:104`、`:125`、`:143`、`school/pages/SchoolPersonnel.vue:198`、`:219` | 全量覆盖 `players`；限制 60 人、号码 1-99、身份证/姓名/号码唯一 |
| `teamRosterApi.coaches` | `(teamId?: string \| null): Promise<TeamCoach[]>` | `string \| null` → `TeamCoach[]` | mock | `user/pages/TeamCoaches.vue:58`、`school/pages/SchoolPersonnel.vue:127` | 读球队 `coaches` |
| `teamRosterApi.saveCoaches` | `(teamId: string \| null, list: TeamCoachInput[]): Promise<TeamCoach[]>` | `string \| null, TeamCoachInput[]` → `TeamCoach[]` | mock | `user/pages/TeamCoaches.vue:78`、`:98`、`school/pages/SchoolPersonnel.vue:151`、`:171` | 全量覆盖 `coaches`；最多 5 人 |
| `teamRosterApi.importMembers` | `(teamId: string \| null, rows: TeamPlayerInput[]): Promise<TeamImportResult>` | `string \| null, TeamPlayerInput[]` → `{ added, skipped, errors }` | mock | `user/pages/TeamMembers.vue:196`、`school/pages/SchoolPersonnel.vue:267` | 逐行校验，合法行追加，非法行计入 `errors`（最多 5 条） |
| `playerApi.list` | `(query?: PlayerQuery): Promise<Player[]>` | `{ keyword?, team?, city?, group?, status? }` → `Player[]` | mock | `admin/pages/PlayerManage.vue:50`、`admin/pages/MatchEntry.vue:99` | `localStorage['soccer-players']` + `soccer-match-events` 动态补录增量 |
| `playerApi.getDetail` | `(id: string): Promise<PlayerDetail>` | `string` → `PlayerDetail` | mock | `admin/pages/PlayerDetail.vue:96`、`admin/pages/PlayerManage.vue:56` | 球员档案 + 内置比赛明细 + 球队信息 + 补录事件增量 |
| `playerApi.setPublic` | `(id: string, publicized: boolean): Promise<Player>` | `string, boolean` → `Player` | mock | `admin/pages/PlayerManage.vue:87` | 状态改为“已公示/未公示” |
| `playerApi.myRecords` | `(): Promise<PlayerMatchRecord[]>` | — → `PlayerMatchRecord[]` | mock | `user/pages/MyStats.vue:81`、`user/pages/UserDashboard.vue:221` | 实名绑定球员优先 → 球队队长 → 球队首名球员 |

### 3.5 统计汇总

| 方法 | 签名 | 入参 / 返回类型 | 实现 | 页面使用位置 | 数据依赖 |
|---|---|---|---|---|---|
| `summaryApi.summary` | `(): Promise<DataSummary>` | — → `DataSummary` | mock | `admin/pages/DataSummary.vue:59` | 实时聚合 `soccer-teams`、`soccer-players`、`soccer-registrations`、`soccer-tournaments` |
| `statsApi.query` | `(query?: StatQuery): Promise<StatResult>` | `StatQuery` → `StatResult` | mock | `components/common/StatsPanel.vue:153`（被 `admin/pages/DataQuery.vue:17`、`school/pages/SchoolStats.vue:16` 引用） | 由球员比赛明细实时聚合；校级账号强制 `scope='school'` + 会话 `schoolCode` |
| `statsApi.options` | `(): Promise<StatOptions>` | — → `StatOptions` | mock | `components/common/StatsPanel.vue:174` | 由球队/球员/比赛明细去重生成下拉选项 |

### 3.6 比赛事件 / AI 报告

| 方法 | 签名 | 入参 / 返回类型 | 实现 | 页面使用位置 | 数据依赖 |
|---|---|---|---|---|---|
| `matchEventApi.list` | `(query?: MatchEventQuery): Promise<MatchEvent[]>` | `{ tournamentId?, playerId?, team?, type?, keyword? }` → `MatchEvent[]` | mock | `admin/pages/MatchEntry.vue:86`、`admin/pages/PlayerDetail.vue:97` | `localStorage['soccer-match-events']` |
| `matchEventApi.create` | `(input: MatchEventInput): Promise<MatchEvent>` | `MatchEventInput` → `MatchEvent` | mock | `admin/pages/MatchEntry.vue:133` | 校验赛事/场次/对阵/球员/类型/分钟（0-120）；写本地 |
| `matchEventApi.remove` | `(id: string): Promise<void>` | `string` → `void` | mock | `admin/pages/MatchEntry.vue:161` | 删除本地事件（不影响球员内置明细） |
| `reportApi.rankingReport` | `(): Promise<AiReport>` | — → `AiReport` | mock | `components/portal/PortalRankings.vue:86` | 规则化生成：聚合球员明细 + 补录事件 + 报名 + 球队完善度，无真实模型调用 |

### 3.7 榜单

| 方法 | 签名 | 入参 / 返回类型 | 实现 | 页面使用位置 | 数据依赖 |
|---|---|---|---|---|---|
| `rankingApi.scorers` | `(): Promise<ScorerRank[]>` | — → `ScorerRank[]` | mock | `components/HomePage.vue:208`、`components/portal/PortalRankings.vue:69` | `readPlayerTotals()`：比赛明细 + 补录进球/助攻，按进球、助攻、评分排序 |

### 3.8 实名认证

| 方法 | 签名 | 入参 / 返回类型 | 实现 | 页面使用位置 | 数据依赖 |
|---|---|---|---|---|---|
| `identityApi.mine` | `(): Promise<RealNameRecord \| null>` | — → `RealNameRecord \| null` | mock | `user/pages/IdentityVerify.vue:45`、`user/pages/MyStats.vue:81`、`user/pages/UserDashboard.vue:220`、`user/pages/RegistrationForm.vue:267` | `localStorage['soccer-real-names']`，按会话账号匹配 |
| `identityApi.submit` | `(input: RealNameInput): Promise<RealNameRecord>` | `{ name, idCard, phone? }` → `RealNameRecord` | mock | `user/pages/IdentityVerify.vue:28` | 18 位身份证校验；仅存脱敏值（前 4 + 后 4）；推导学校来自球队 |
| `identityApi.list` | `(query?: RealNameQuery): Promise<RealNameRecord[]>` | `{ status?, keyword? }` → `RealNameRecord[]` | mock | `super/pages/IdentityVerify.vue:66` | 按角色裁剪：省级全部、市州本市、校级本校 |
| `identityApi.review` | `(id: string, action: 'approve' \| 'reject', reason?: string): Promise<RealNameRecord>` | `string, 'approve'\|'reject', string?` → `RealNameRecord` | mock | `super/pages/IdentityVerify.vue:91`（通过）、`:112`（驳回） | 通过后按姓名 + 学校匹配球员并绑定 `account`；驳回必须填原因 |

> 前端只有超级管理员页面调用 `list/review`，校级/普通管理员没有实名审核入口。

### 3.9 精彩瞬间

| 方法 | 签名 | 入参 / 返回类型 | 实现 | 页面使用位置 | 数据依赖 |
|---|---|---|---|---|---|
| `momentApi.list` | `(query?: MomentQuery): Promise<MatchMoment[]>` | `{ status?, matchId? }` → `MatchMoment[]` | mock | `admin/pages/MomentsManage.vue:101` | `localStorage['soccer-moments']`；校级账号只返回本校比赛 |
| `momentApi.upload` | `(input: MomentInput, file: File): Promise<MatchMoment>` | `MomentInput, File` → `MatchMoment` | mock | `admin/pages/MomentsManage.vue:134` | 图片存 IndexedDB `soccer-moment-db`；校验 jpg/jpeg/png/webp、≤5MB；初始“待发布” |
| `momentApi.setStatus` | `(id: string, action: 'publish' \| 'offline'): Promise<MatchMoment>` | `string, 'publish'\|'offline'` → `MatchMoment` | mock | `admin/pages/MomentsManage.vue:168`、`:174` | 发布写 `published_at`，下架保留原值 |
| `momentApi.remove` | `(id: string): Promise<void>` | `string` → `void` | mock | `admin/pages/MomentsManage.vue:181` | 删除元数据与图片 |
| `momentApi.publicList` | `(matchId?: number): Promise<MatchMoment[]>` | `number?` → `MatchMoment[]` | mock | `components/HomePage.vue:207`、`components/portal/MatchDetail.vue:61` | 仅“已发布”，按发布时间倒序 |
| `momentApi.image` | `(id: string): Promise<Blob>` | `string` → `Blob` | mock | `components/HomePage.vue:186`、`components/portal/MatchDetail.vue:43`、`admin/pages/MomentsManage.vue:88` | 读 IndexedDB；无图时生成 SVG 封面 |

### 3.10 门户

| 方法 | 签名 | 入参 / 返回类型 | 实现 | 页面使用位置 | 数据依赖 |
|---|---|---|---|---|---|
| `portalApi.standings` | `(): Promise<StandingRow[]>` | — → `StandingRow[]` | mock | `components/HomePage.vue:209`、`components/portal/PortalRankings.vue:26` | `mock/portal.ts` 内置 11 行静态积分榜 |
| `portalApi.schedule` | `(): Promise<PortalMatch[]>` | — → `PortalMatch[]` | mock | `components/HomePage.vue:204`、`components/portal/PortalSchedule.vue:38`、`components/portal/MatchDetail.vue:58` | `readMatches()` → `localStorage['soccer-live-matches']` |
| `portalApi.news` | `(): Promise<PortalArticle[]>` | — → `PortalArticle[]` | mock | `components/HomePage.vue:206`、`components/portal/PortalNews.vue:22` | 自动生成 AI 战报 `soccer-portal-auto-news` + 内置 6 条新闻 |
| `portalApi.policies` | `(): Promise<PortalArticle[]>` | — → `PortalArticle[]` | mock | `components/portal/PortalNews.vue:22` | 内置 3 条政策 |
| `portalApi.matchNews` | `(matchId: number): Promise<PortalArticle[]>` | `number` → `PortalArticle[]` | mock | `components/portal/MatchDetail.vue:62` | 按 `matchId` 或标题/摘要中的球队名匹配，去重 |

### 3.11 直播公众端

| 方法 | 签名 | 入参 / 返回类型 | 实现 | 页面使用位置 | 数据依赖 |
|---|---|---|---|---|---|
| `publicLiveApi.goalDetections` | `(matchId: number): Promise<PublicGoalRecord[]>` | `number` → `PublicGoalRecord[]` | mock | `components/portal/MatchDetail.vue:59` | 只返回 `confirmed` 记录；不含证据/置信度/设备 |
| `publicLiveApi.matchReport` | `(matchId: number): Promise<MatchReport \| null>` | `number` → `MatchReport \| null` | mock | `components/portal/MatchDetail.vue:60` | `soccer-match-reports`；未结束返回 `null`；历史已结束比赛首次访问按事件即时生成（不落库） |

### 3.12 直播管理端（视觉进球判定 / 摄像设备）

| 方法 | 签名 | 入参 / 返回类型 | 实现 | 页面使用位置 | 数据依赖 |
|---|---|---|---|---|---|
| `goalDetectionApi.list` | `(query?: GoalDetectionQuery): Promise<PageResult<GoalDetection>>` | `{ status?, match_id?, page?, page_size? }` → `PageResult<GoalDetection>` | mock | `admin/pages/GoalReview.vue:76` | `soccer-goal-detections`；校级账号按本校比赛裁剪；分页默认 1/20，上限 100 |
| `goalDetectionApi.review` | `(id: number, action: 'confirm' \| 'reject'): Promise<GoalReviewResult>` | `number, 'confirm'\|'reject'` → `GoalReviewResult` | mock | `admin/pages/GoalReview.vue:152` | 审核不可逆（已审核抛 40009）；确认后写入 `soccer-live-scores`、`soccer-live-matches` 并联动比分 |
| `goalDetectionApi.evidence` | `(id: number, index: number): Promise<Blob>` | `number, number` → `Blob` | mock | `admin/pages/GoalReview.vue:116` | 按记录生成 SVG 证据图（真实接口应为 `image/jpeg`） |
| `cameraApi.list` | `(query?: CameraQuery): Promise<CameraDevice[]>` | `{ match_id?, status? }` → `CameraDevice[]` | mock | `admin/pages/CameraManage.vue:125` | `soccer-cameras`；附带 `pending_count` 统计 |
| `cameraApi.update` | `(id: number, input: CameraInput): Promise<CameraDevice>` | `number, CameraInput` → `CameraDevice` | mock | `admin/pages/CameraManage.vue:316` | 校验比赛存在、ROI、`match_id=null` 表示解绑；`disabled` 设备上报会被拒 |

### 3.13 校级端

#### 3.13.1 比赛（`schoolMatchApi`）

| 方法 | 签名 | 入参 / 返回类型 | 实现 | 页面使用位置 | 数据依赖 |
|---|---|---|---|---|---|
| `list` | `(): Promise<SchoolMatch[]>` | — → `SchoolMatch[]` | mock | `school/pages/SchoolDashboard.vue:22`、`school/pages/SchoolMatches.vue:85`、`school/pages/SchoolMatchDetail.vue:802`、`school/pages/SchoolMobileUpload.vue:76` | `soccer-live-matches`，仅主/客队属于本校 |
| `create` | `(input: SchoolMatchInput): Promise<SchoolMatch>` | `SchoolMatchInput` → `SchoolMatch` | mock | `school/pages/SchoolMatches.vue:216` | 至少一支本校球队；时间格式、场地长度校验 |
| `update` | `(id: number, input: SchoolMatchInput, version: number): Promise<SchoolMatch>` | `number, SchoolMatchInput, number` → `SchoolMatch` | mock | `school/pages/SchoolMatches.vue:215` | 乐观锁 `version`，已结束锁定 |
| `remove` | `(id: number): Promise<void>` | `number` → `void` | mock | `school/pages/SchoolMatches.vue:261` | 已结束锁定 |
| `setStatus` | `(id: number, action: 'start' \| 'finish'): Promise<SchoolMatch>` | `number, 'start'\|'finish'` → `SchoolMatch` | mock | `school/pages/SchoolMatches.vue:264` | 未开始→进行中→已结束；同步 phase |

#### 3.13.2 比赛运营（`schoolLiveApi`，21 个方法）

> 实现：21 个方法全部为 mock（`src/api/mock/liveGoal.ts:1615` 起），后续需按 `/api/school/live/*` 真实契约补 live 实现。

| 方法 | 签名 | 入参 / 返回类型 | 页面使用位置 | 数据依赖 |
|---|---|---|---|---|
| `events` | `(matchId: number): Promise<LiveMatchEvent[]>` | `number` → `LiveMatchEvent[]` | `school/pages/SchoolMatchDetail.vue:429`、`school/pages/SchoolMobileUpload.vue:81` | `soccer-live-events`，按分钟倒序 |
| `createEvent` | `(matchId: number, input: LiveEventInput): Promise<LiveMatchEvent>` | `number, LiveEventInput` → `LiveMatchEvent` | `school/pages/SchoolMatchDetail.vue:395`、`school/pages/SchoolMobileUpload.vue:143` | 仅“进行中”可录入；进球联动比分 |
| `updateEvent` | `(eventId: number, input: LiveEventInput): Promise<LiveMatchEvent>` | `number, LiveEventInput` → `LiveMatchEvent` | `school/pages/SchoolMatchDetail.vue:392` | 回滚旧进球比分后再按新值加分 |
| `removeEvent` | `(eventId: number): Promise<void>` | `number` → `void` | `school/pages/SchoolMatchDetail.vue:412`、`school/pages/SchoolMobileUpload.vue:165` | 删除进球事件时回退比分 |
| `lineup` | `(matchId: number): Promise<MatchLineup>` | `number` → `MatchLineup` | `school/pages/SchoolMatchDetail.vue:517` | `soccer-live-lineups`；无记录返回空阵容 |
| `saveLineup` | `(matchId: number, input: LineupInput, version: number): Promise<MatchLineup>` | `number, LineupInput, number` → `MatchLineup` | `school/pages/SchoolMatchDetail.vue:498` | 每侧最多 11 人、姓名/号码唯一；乐观锁 |
| `referees` | `(matchId: number): Promise<MatchReferee[]>` | `number` → `MatchReferee[]` | `school/pages/SchoolMatchDetail.vue:571` | `soccer-live-referees` |
| `saveReferees` | `(matchId: number, list: RefereeInput[]): Promise<MatchReferee[]>` | `number, RefereeInput[]` → `MatchReferee[]` | `school/pages/SchoolMatchDetail.vue:551` | 最多 4 人；主裁 1、助理 2、第四官员 1 |
| `files` | `(matchId: number): Promise<MatchFile[]>` | `number` → `MatchFile[]` | `school/pages/SchoolMatchDetail.vue:673` | `soccer-live-files` |
| `uploadFile` | `(matchId: number, category: MatchFileCategory, file: File): Promise<MatchFile>` | `number, MatchFileCategory, File` → `MatchFile` | `school/pages/SchoolMatchDetail.vue:628` | 元数据 localStorage，内容 IndexedDB `soccer-live-file-db`；pdf/jpg/jpeg/png ≤10MB |
| `removeFile` | `(fileId: string): Promise<void>` | `string` → `void` | `school/pages/SchoolMatchDetail.vue:657` | 删元数据 + 内容 |
| `downloadFile` | `(fileId: string): Promise<Blob>` | `string` → `Blob` | `school/pages/SchoolMatchDetail.vue:642` | 读 IndexedDB，失败走内存兜底 |
| `liveLink` | `(matchId: number): Promise<LiveLink \| null>` | `number` → `LiveLink \| null` | `school/pages/SchoolMatchDetail.vue:724` | `soccer-live-links` |
| `saveLiveLink` | `(matchId: number, input: LiveLinkInput): Promise<LiveLink>` | `number, { platform, url }` → `LiveLink` | `school/pages/SchoolMatchDetail.vue:697` | 平台必须在 `LIVE_PLATFORMS`，URL 必填 |
| `clearLiveLink` | `(matchId: number): Promise<void>` | `number` → `void` | `school/pages/SchoolMatchDetail.vue:713` | 删除链接 |
| `faceRecords` | `(matchId: number): Promise<FaceVerifyRecord[]>` | `number` → `FaceVerifyRecord[]` | `school/pages/SchoolMatchDetail.vue:793` | `soccer-live-face-records` |
| `verifyFace` | `(matchId: number, subject: string, photo: File): Promise<FaceVerifyRecord>` | `number, string, File` → `FaceVerifyRecord` | `school/pages/SchoolMatchDetail.vue:777` | 按姓名/文件名/大小生成稳定评分（60-99），≥75 通过 |
| `state` | `(matchId: number): Promise<MatchStateRecord>` | `number` → `MatchStateRecord` | `school/pages/SchoolMatchDetail.vue:124`、`school/pages/SchoolMobileUpload.vue:80`、`:112`、`:191` | `soccer-match-states` + 比赛当前比分/阶段 |
| `saveState` | `(matchId: number, input: MatchStateInput): Promise<SchoolMatch>` | `number, { home_score, away_score, phase }` → `SchoolMatch` | `school/pages/SchoolMatchDetail.vue:148`、`school/pages/SchoolMobileUpload.vue:106`、`:185` | 手动保底录入，来源标记 `manual`；已结束锁定 |
| `report` | `(matchId: number): Promise<MatchReport \| null>` | `number` → `MatchReport \| null` | `school/pages/SchoolMatchDetail.vue:281` | `soccer-match-reports` |
| `generateReport` | `(matchId: number): Promise<MatchReport>` | `number` → `MatchReport` | `school/pages/SchoolMatchDetail.vue:296` | 仅已结束可生成；同时写入 `soccer-portal-auto-news` |

#### 3.13.3 计分板端口（`scoreboardApi`）

| 方法 | 签名 | 入参 / 返回类型 | 实现 | 页面使用位置 | 数据依赖 |
|---|---|---|---|---|---|
| `get` | `(matchId: number): Promise<ScoreboardPort \| null>` | `number` → `ScoreboardPort \| null` | mock | `school/pages/SchoolMatchDetail.vue:193`、`:262` | `soccer-scoreboard-ports`；需 `live:match:update` 权限 |
| `bind` | `(matchId: number, deviceName: string): Promise<ScoreboardPort>` | `number, string` → `ScoreboardPort` | mock | `school/pages/SchoolMatchDetail.vue:208` | 复用已有 token，否则生成 `SB-<matchId>-XXXXXX` |
| `reset` | `(matchId: number): Promise<ScoreboardPort>` | `number` → `ScoreboardPort` | mock | `school/pages/SchoolMatchDetail.vue:220` | 重新生成 token，清空同步记录 |
| `unbind` | `(matchId: number): Promise<void>` | `number` → `void` | mock | `school/pages/SchoolMatchDetail.vue:231` | 删除端口 |
| `push` | `(input: ScoreboardPushInput): Promise<ScoreboardPushResult>` | `{ token, home_score, away_score, phase }` → `ScoreboardPushResult` | mock | `school/pages/SchoolMatchDetail.vue:256`（页面内模拟设备推送） | 凭 token 定位比赛，写状态来源 `scoreboard` |

#### 3.13.4 本校信息与球队

| 方法 | 签名 | 入参 / 返回类型 | 实现 | 页面使用位置 | 数据依赖 |
|---|---|---|---|---|---|
| `schoolProfileApi.get` | `(): Promise<SchoolProfile>` | — → `SchoolProfile` | mock | `school/pages/SchoolInfo.vue:33` | `soccer-school-profiles`，按会话 `schoolCode` |
| `schoolProfileApi.save` | `(input: SchoolProfileInput): Promise<SchoolProfile>` | `{ name, address, contact, phone }` → `SchoolProfile` | mock | `school/pages/SchoolInfo.vue:51` | 名称≤40、地址≤60、联系人≤20、手机号 11 位 |
| `schoolTeamApi.list` | `(): Promise<Team[]>` | — → `Team[]` | mock | `school/pages/SchoolTeams.vue:40`、`school/pages/SchoolRegistrations.vue:75`、`school/pages/SchoolPersonnel.vue:113` | `soccer-teams` 按 `schoolCode` 裁剪 |

#### 3.13.5 校级赛事与报名

| 方法 | 签名 | 入参 / 返回类型 | 实现 | 页面使用位置 | 数据依赖 |
|---|---|---|---|---|---|
| `schoolTournamentApi.list` | `(): Promise<Tournament[]>` | — → `Tournament[]` | mock | `school/pages/SchoolTournaments.vue:77` | 本校校级赛事（`level='school'` + 学校归属） |
| `schoolTournamentApi.create` | `(input: TournamentInput): Promise<Tournament>` | `TournamentInput` → `Tournament` | mock | `school/pages/SchoolTournaments.vue:94` | 主办单位取会话学校，写入 `schoolCode` |
| `schoolTournamentApi.publish` | `(id: string): Promise<Tournament>` | `string` → `Tournament` | mock | `school/pages/SchoolTournaments.vue:115` | 报名中 + 开放报名 |
| `schoolTournamentApi.offline` | `(id: string): Promise<Tournament>` | `string` → `Tournament` | mock | `school/pages/SchoolTournaments.vue:118` | 已下架 + 关闭报名 |
| `schoolTournamentApi.setRegistration` | `(id: string, enabled: boolean): Promise<Tournament>` | `string, boolean` → `Tournament` | mock | `school/pages/SchoolTournaments.vue:121`、`:124` | 报名中 ↔ 已截止 |
| `schoolRegistrationApi.list` | `(): Promise<Registration[]>` | — → `Registration[]` | mock | `school/pages/SchoolRegistrations.vue:74` | 本校球队负责人账号 + 学校名双向匹配 |
| `schoolRegistrationApi.create` | `(input: SchoolRegistrationInput): Promise<Registration>` | `{ tournamentId, tournamentName, teamId, players, leader?, phone?, coach?, remark? }` → `Registration` | mock | `school/pages/SchoolRegistrations.vue:112` | 服务端反查球队/学校/城市；校验完善度、赛事开放、重复报名 |
| `schoolRegistrationApi.resubmit` | `(id: string): Promise<Registration>` | `string` → `Registration` | mock | `school/pages/SchoolRegistrations.vue:139` | 仅本校被驳回报名 |

---

## 4. 字段契约汇总

### 4.1 认证

`LoginEntry = 'user' | 'admin'`

`LoginInput`：`account: string`、`password: string`、`entry: LoginEntry`

`DemoAccount`：`role: UserRole`、`persona?: UserPersona`、`icon: string`、`label: string`、`account: string`、`password: string`、`schoolCode?`、`schoolName?`、`permissions?: string[]`、`city?`、`district?`

`LoginResult`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `role` | `'user' \| 'admin' \| 'super' \| 'school'` | 前端工作台路由依据 |
| `persona` | `'leader' \| 'student' \| 'coach'` | 仅用户端 |
| `account` | `string` | 账号 |
| `label` | `string` | 顶栏展示文案 |
| `schoolCode` / `schoolName` | `string?` | 校级账号绑定学校 |
| `permissions` | `string[]?` | 权限点，校级端菜单/接口校验 |
| `city` / `district` | `string?` | 管理员数据范围 |

`RegisterInput`：`username`、`password`、`email`、`school`、`schoolCode`、`persona`

### 4.2 赛事

`TournamentLevel = 'school' | 'city' | 'province'`

`TournamentStatus = '未发布' | '报名中' | '已截止' | '已下架'`

`Tournament`：`id`、`name`、`level`、`group`、`organizer`、`signStart`、`signEnd`、`status`、`registrationEnabled`、`createdBy`、`createdAt`、`schoolCode?`

`TournamentInput`：`name`、`level`、`group`、`organizer`、`signStart`、`signEnd`

`TournamentMaterial`：`tournamentId`、`schedule: boolean`、`results: boolean`、`roster: boolean`、`uploadedAt`

### 4.3 报名

`RegistrationStatus = '待初审' | '已提交省级' | '已通过' | '已驳回'`

`Registration`：`id`、`tournamentId`、`tournamentName`、`team`、`school`、`city`、`group`、`players: number`、`submitTime`、`status`、`ownerAccount`、`leader?`、`phone?`、`coach?`、`remark?`、`rejectReason?`、`rejectBy?`、`rejectTime?`、`canResubmit: boolean`、`resubmitCount: number`

`RegistrationInput`：`tournamentId`、`tournamentName`、`team`、`school`、`city`、`group`、`players`、`leader?`、`phone?`、`coach?`、`remark?`

`SchoolRegistrationInput`：`tournamentId`、`tournamentName`、`teamId`、`players`、`leader?`、`phone?`、`coach?`、`remark?`

### 4.4 球队 / 球员 / 教练

`Team`：`id`、`name`、`city`、`school`、`schoolCode`、`district?`、`group`、`foundTime`、`captain`、`intro`、`flagUploaded`、`logoUploaded`、`photoUploaded`、`honorUploaded`、`ownerAccount`、`updatedAt`、`coaches?: TeamCoach[]`、`players?: TeamPlayer[]`

`TeamPlayer`：`id`、`name`、`idCard`（脱敏）、`birthDate`、`position: '门将'\|'后卫'\|'中场'\|'前锋'`、`jerseyNo: number`、`photoUploaded`

`TeamCoach`：`id`、`name`、`category: '专职教练员'\|'体育教师兼任'\|'社会足球从业者'`、`level`、`phone`

`TeamCompleteness`：`score: 0-100`、`complete: boolean`、`missing: string[]`

`Player`：`id`、`name`、`idCard`、`teamId`、`team`、`school`、`city`、`group`、`jerseyNo`、`position`、`birthDate`、`height`、`weight`、`status: '已公示'\|'待审核'\|'未公示'`、`account?`

`PlayerMatchRecord`：`id`、`date`、`tournamentName`、`opponent`、`score`、`result: '胜'\|'平'\|'负'`、`starts: boolean`、`minutes`、`goals`、`assists`、`yellowCards`、`redCards`、`rating`

`PlayerSeasonStats`：`matches`、`starts`、`minutes`、`goals`、`assists`、`yellowCards`、`redCards`、`avgRating`、`goalsPerMatch`、`winRate`

`PlayerTournamentStats`：`tournamentName`、`matches`、`goals`、`assists`、`minutes`、`avgRating`

`PlayerDetail`：`player: Player`、`team: Team \| null`、`season: PlayerSeasonStats`、`tournaments: PlayerTournamentStats[]`、`matches: PlayerMatchRecord[]`

### 4.5 比赛事件 / AI 报告

`MatchEventType = '进球' | '助攻' | '黄牌' | '红牌' | '换人'`

`MatchEvent`：`id`、`tournamentId`、`tournamentName`、`matchLabel`、`home`、`away`、`playerId`、`playerName`、`team`、`type`、`minute`、`note?`、`createdBy`、`createdAt`

`AiReportSection`：`title`、`content`

`AiReport`：`title`、`generatedAt`、`scope`、`summary`、`sections: AiReportSection[]`、`highlights: string[]`

`MatchReport`：`match_id: number`、`title`、`generated_at`、`home`、`away`、`score`、`phase_display`、`summary`、`sections`、`highlights`、`published: boolean`

### 4.6 榜单 / 门户

`ScorerRank`：`rank`、`name`、`team`、`group`、`goals`、`assists`

`StandingRow`：`rank`、`team`、`group`、`played`、`win`、`draw`、`loss`、`gf`、`ga`、`diff: string`、`points`

`PortalMatch`：`id: number`、`match`、`group`、`home`、`score: string`、`away`、`time`、`venue`、`status: string`（中文文案）、`phase?: string`（中文文案）

`PortalArticle`：`tag`、`title`、`source`、`date`、`summary`、`body: string[]`、`matchId?`、`autoGenerated?`

### 4.7 实名

`RealNameStatus = '待审核' | '已认证' | '已驳回'`

`RealNameRecord`：`id`、`account`、`name`、`idCardMasked`、`phone`、`status`、`submittedAt`、`reviewedAt: string \| null`、`reviewedBy`、`rejectReason: string \| null`、`playerId: string \| null`、`playerName: string \| null`、`schoolCode`、`schoolName`、`city`、`district`

`RealNameInput`：`name`、`idCard`、`phone?`

### 4.8 统计汇总

`StatRange = 'all' | 'week' | 'month'`；`DataScopeLevel = 'province' | 'city' | 'district' | 'school'`

`StatQuery`：`range?`、`scope?`、`city?`、`district?`、`schoolCode?`、`team?`、`match?`

`StatTotals`：`matches`、`goals`、`assists`、`yellowCards`、`redCards`

`StatPlayerRow`：`playerId`、`name`、`team`、`school`、`city`、`matches`、`goals`、`assists`、`yellowCards`、`redCards`

`StatMatchRow`：`id`、`date`、`opponent`、`score`、`result`、`playerId`、`playerName`、`team`、`goals`、`assists`、`yellowCards`、`redCards`

`StatOptions`：`cities: string[]`、`districts: string[]`、`schools: { code, name, city, district }[]`、`teams: string[]`、`matches: string[]`

`StatResult`：`totals`、`players: StatPlayerRow[]`、`matches: StatMatchRow[]`、`scopeLabel`、`rangeLabel`、`generatedAt`

`SummaryRow`：`key`、`teams`、`players`、`registrations`、`approved`、`pending`、`rejected`、`approvalRate`

`DataSummary`：`teamTotal`、`playerTotal`、`registrationTotal`、`approvedTotal`、`pendingTotal`、`rejectedTotal`、`approvalRate`、`byCity: SummaryRow[]`、`byGroup: SummaryRow[]`、`tournamentLevels: { level, label, total, open }[]`、`generatedAt`

### 4.9 精彩瞬间

`MomentCategory = '精彩瞬间' | '进球' | '庆祝' | '花絮'`

`MomentStatus = '待发布' | '已发布' | '已下架'`

`MatchMoment`：`id`、`match_id: number`、`match_name`、`title`、`category`、`description`、`photographer`、`status`、`created_at`、`published_at: string \| null`

`MomentInput`：`match_id`、`title`、`category`、`description?`、`photographer?`

### 4.10 Live 系列

`GoalStatus = 'pending' | 'confirmed' | 'rejected'`；`GoalSide = 'home' | 'away'`

`GoalDetection`：`id: number`、`match_id`、`match_name`、`camera_id`、`camera_name`、`goal_side`、`goal_side_display`、`scoring_side`、`scoring_side_display`、`occurred_at`、`minute`、`confidence: string`（如 `"0.7800"`）、`ball_track_id: number \| null`、`status`、`status_display`、`evidence_count`、`model_version`、`reviewed_by_name`、`reviewed_at`、`match_event_id`、`created_at`

`GoalReviewResult`：`id`、`status`、`match_event_id`、`minute`、`scoring_side`、`live_home_score`、`live_away_score`、`reviewed_by_name`、`reviewed_at`

`PageResult<T>`：`total`、`page`、`page_size`、`pages`、`results: T[]`

`CameraStatus = 'online' | 'offline' | 'disabled'`

`CameraDevice`：`id`、`device_id`（12 位）、`name`、`match_id`、`match_name`、`stream_url`、`status`、`status_display`、`last_seen_at`、`home_roi: RoiPolygon \| null`、`away_roi: RoiPolygon \| null`、`pending_count`

`RoiPolygon`：`polygon: [number, number][]`（归一化 0~1，原点左上）

`CameraInput`：`name`、`match_id`、`stream_url`、`home_roi`、`away_roi`、`status`

`PublicGoalRecord`：`id`、`minute`、`scoring_side`、`scoring_side_display`、`occurred_at`

`SchoolGroupType = 'university' | 'middle_school' | 'primary_school'`

`SchoolMatchStatus = 'not_started' | 'live' | 'finished'`

`MatchPhase = 'not_started' | 'first_half' | 'half_time' | 'second_half' | 'finished'`

`SchoolMatch`：`id`、`group_type`、`group_type_display`、`home_team_id: string \| null`、`away_team_id`、`home_team_name`、`away_team_name`、`match_time`、`venue`、`status`、`status_display`、`phase`、`phase_display`、`home_score`、`away_score`、`version`、`created_by`

`SchoolMatchInput`：`group_type`、`home_team_id`、`away_team_id`、`home_team_name`、`away_team_name`、`match_time`、`venue?`

`MatchSide = 'home' | 'away'`；`LiveEventType = '进球' | '黄牌' | '红牌' | '换人' | '文字'`

`LiveMatchEvent`：`id`、`match_id`、`type`、`minute`、`side`、`side_display`、`player_name`、`note: string \| null`、`created_by`、`created_at`

`LineupPlayer`：`id`、`name`、`jersey_no: number`、`position`

`MatchLineup`：`match_id`、`home: LineupPlayer[]`、`away: LineupPlayer[]`、`version`、`updated_at`

`MatchReferee`：`id`、`name`、`role: '主裁判'\|'助理裁判'\|'第四官员'`、`phone`

`MatchFileCategory = '签到表' | '记录确认单' | '裁判报告单'`

`MatchFile`：`id`、`match_id`、`category`、`name`、`size`、`uploaded_by`、`uploaded_at`

`LiveLink`：`match_id`、`platform`、`url`、`updated_by`、`updated_at`

`FaceVerifyStatus = '通过' | '未通过'`

`FaceVerifyRecord`：`id`、`match_id`、`subject`、`status`、`score`、`operator`、`verified_at`

`MatchStateRecord`：`match_id`、`home_score`、`away_score`、`phase`、`phase_display`、`source: 'manual'\|'scoreboard'\|'event'\|'system'`、`source_display`、`updated_by`、`updated_at`

`ScoreboardPort`：`match_id`、`device_name`、`token`、`enabled`、`last_sync_at`、`last_sync_by`

`ScoreboardPushInput`：`token`、`home_score`、`away_score`、`phase`

`ScoreboardPushResult`：`match_id`、`match_name`、`home_score`、`away_score`、`phase`、`phase_display`、`synced_at`

`SchoolProfile`：`school_code`、`name`、`city`、`address`、`contact`、`phone`、`updated_at`

---

## 5. 缺口与联调风险

### 5.1 前端有、后端可能没有对应接口

以下按 `soccer-database-main/config/urls.py` 的真实路由判断（后端只有 `accounts / athlete / common / live / org / registration` 五个 app）：

| 前端模块 | 前端方法 | 后端现状 | 影响页面 |
|---|---|---|---|
| 视觉进球判定 | `goalDetectionApi` 全部 3 个 | 无 `vision` app、无判定/证据模型与路由（接口文档 6.6 已注明） | `admin/pages/GoalReview.vue` |
| 摄像设备 | `cameraApi` 全部 2 个 | 无 CameraDevice 表与路由；`/api/device/vision/config`、`/heartbeat` 标注“后端待实现” | `admin/pages/CameraManage.vue` |
| 计分板端口 | `scoreboardApi` 全部 5 个 | 无 token 端口与推送端点 | `school/pages/SchoolMatchDetail.vue` |
| 精彩瞬间 | `momentApi` 全部 6 个 | 无 moments 模型、无图片存储 | 门户首页、比赛详情、`admin/pages/MomentsManage.vue` |
| AI 报告 | `reportApi.rankingReport`、`schoolLiveApi.report/generateReport`、`publicLiveApi.matchReport` | 无报告模型与生成端点 | 门户榜单、校级比赛详情、门户比赛详情 |
| 门户榜单/新闻/政策 | `portalApi.standings/news/policies/matchNews`、`rankingApi.scorers` | 后端无 `/api/portal/*`，无新闻/政策/积分/射手榜路由 | 门户首页、榜单、新闻 |
| 直播公众端进球记录 | `publicLiveApi.goalDetections` | 无进球判定数据源，公开端只有比赛/事件 | 门户比赛详情 |
| 统计汇总 | `summaryApi.summary`、`statsApi.query/options` | 只有 `/api/school/statistics`、`/api/city/registrations/summary`、`/api/province/registrations/statistics`，口径与 `DataSummary/StatResult` 不一致 | `admin/pages/DataSummary.vue`、`DataQuery.vue`、`school/pages/SchoolStats.vue` |
| 实名认证 | `identityApi` 4 个 | 只有按 `athlete_id`/`coach_id` 的审核端点，无“当前账号实名记录/提交”端点 | 用户端实名页、`super/pages/IdentityVerify.vue` |
| 校级本校信息 | `schoolProfileApi.get/save` | 有 `SchoolProfile` 模型，但无 `/api/school/profile` 路由 | `school/pages/SchoolInfo.vue` |
| 校级本校球队 | `schoolTeamApi.list` | 只有管理员 `/api/admin/teams`，无校级只读端点 | 校级球队/报名/人员页 |
| 校级赛事发布 | `schoolTournamentApi` 5 个 | 后端 `competitions` 只有列表，无创建/发布/下架端点 | `school/pages/SchoolTournaments.vue` |
| 校级报名 | `schoolRegistrationApi` 3 个 | 校级路由只有审核/统计/通知/日志，无本校报名列表与代报名 | `school/pages/SchoolRegistrations.vue` |
| 球队信息维护 | `teamApi`、`teamRosterApi` | 无球队/球员/教练自助维护端点（org 仅管理员读列表） | 用户端球队/人员/报名 |
| 赛事资料上传 | `tournamentApi.getMaterial/saveMaterial` | 无赛事资料模型/端点 | `admin/pages/TournamentManage.vue` |
| 球员公示 | `playerApi.setPublic` | 无端点 | `admin/pages/PlayerManage.vue` |

### 5.2 后端已有、前端尚未接入的接口（可优先补齐页面）

| 后端路由 | 用途 | 前端现状 |
|---|---|---|
| `/api/auth/register`、`/api/auth/login`、`/api/admin/auth/login`、`/api/auth/logout`、`/api/auth/me` | 认证 | 仅 `liveAuthApi` 部分接入 |
| `/api/competitions`、`/api/registrations*` | 提交方报名 | 未接入 |
| `/api/city/registrations*` | 市州审核/统计/导出 | 未接入 |
| `/api/province/registrations*`、`/api/province/athletes|coaches|accounts|logs` | 省级审核/账号/日志 | 未接入（超级管理员页面多为静态数据） |
| `/api/school/athletes|coaches/<id>/verify`、`/api/school/statistics`、`/api/school/notifications`、`/api/school/audit-logs` | 校级审核/统计/通知/日志 | 未接入 |
| `/api/admin/live/*`、`/api/school/live/*` | 比赛 CRUD、状态、阵容、事件、裁判、文件、直播链接、人脸核验 | 前端有同能力，但走 mock，且字段/枚举不一致 |
| `/api/public/live/matches*` | 门户比赛列表/详情/事件 | 前端 `portalApi.schedule` 走 mock，未接 |
| `/api/admin/provinces|cities|schools|teams`、`/api/city/schools` | 行政区划/学校/球队 | 前端学校选择器用本地 `src/data/sichuan-schools.ts` |
| `/api/athlete/profile|matches|stats|standings` | 运动员本人视角 | 前端用 `playerApi.myRecords` + 本地统计 |

### 5.3 字段与枚举差异风险

#### A. 认证（高风险）

| 项 | 前端 | 后端 |
|---|---|---|
| 登录入参 | `{ account, password, entry }` | `LoginSerializer`：`{ phone, password }`；管理员 `AdminLoginSerializer`：`{ email, password }` |
| 登录路径 | `/api/auth/login/`（带尾斜杠） | `/api/auth/login`（**无尾斜杠**，带 `/` 会 404；POST 不走 APPEND_SLASH） |
| 管理员入口 | 与用户共用 `authApi.login` | 独立 `/api/admin/auth/login` |
| 返回用户字段 | `id, username, role, role_display, persona, real_name, unit_name` | `id, name, phone, email, role, role_display, status, status_display, is_admin, permissions, profile, date_joined` |
| 角色映射 | `mapUser` 把 `school` → `role:'user', persona:'leader'` | 后端 `role='school'` 应进入校级端（前端 `UserRole` 有 `'school'`） |
| 其它角色 | 未处理 `county`、`personal` | 后端有 `county`、`personal`，会落到 `default` 分支 |
| 注册入参 | `{ username, password, email, school, schoolCode, persona }` | 只接受 `{ name, phone, password, role }`，`role` 仅 `personal/coach/athlete` |
| 令牌 | `access` + `refresh` 存 sessionStorage，无刷新逻辑 | 返回 `token`/`access`/`refresh`/`token_type`/`user` |

#### B. 赛事 / 报名

| 项 | 前端 | 后端 |
|---|---|---|
| 赛事状态 | `未发布/报名中/已截止/已下架` | `CompetitionStatus`：`open/closed`（报名中/已截止） |
| 赛事字段 | `level/group/organizer/signStart/signEnd/registrationEnabled/createdBy/createdAt/schoolCode` | `id/name/year/status/status_display/created_at` |
| 报名状态 | `待初审/已提交省级/已通过/已驳回` | `draft/submitted/city_approved/reported/approved/rejected` + `reject_level`(city/province) |
| 审核动作 | `approve(id, stage)` / `reject(id, reason, reviewer)` | 市州：`approve`、`reject`、`report` 分开；省级：`approve`、`reject`；市州通过后需 `report` 才进入省审 |
| 报名字段 | `tournamentId/tournamentName/team/school/city/group/players/submitTime/ownerAccount/...` | `competition/competition_name/team/team_name/school_name/school_county/city_id/city_name/group_type/status/...`；`players` 由后端统计 |
| 统计口径 | `pending` = 非通过/非驳回 | 后端有 `draft/city_approved/reported` 多个中间态，需映射 |

#### C. 比赛事件 / 直播

| 项 | 前端 | 后端 |
|---|---|---|
| 事件类型 | `进球/助攻/黄牌/红牌/换人/文字`（中文） | `goal/yellow/red/substitution/text`（英文，**无“助攻”**） |
| 事件字段 | `tournamentId/matchLabel/home/away/playerId/createdBy/createdAt` | `type/minute/team_side/player_name/player_no/related_player_name/content/client_token/athlete_id` |
| 事件 ID | `string`（`ev-xxx`） | `int` |
| 比分字段 | `live_home_score/live_away_score`（审核返回） | 比赛详情直接 `home_score/away_score`，无 `live_*` |
| 比赛阶段 | `phase`：`not_started/first_half/half_time/second_half/finished` | **无 phase 字段**（模型只有 `status`） |
| 比赛状态文案 | 门户 `PortalMatch.status` 为中文（“已结束/进行中/未开始”） | 返回 `status`（英文枚举）+ `status_label`（中文） |
| 阵容字段 | `home/away`，球员 `{ id, name, jersey_no: number, position }` | `lineup_home/lineup_away`，球员 `{ name, no: string, position?, is_captain? }`（无 id） |
| 裁判角色 | `主裁判/助理裁判/第四官员` | `chief/assistant(边裁)/fourth` |
| 文件类别 | `签到表/记录确认单/裁判报告单` | `sign_in/record_confirm/referee_report` |
| 人脸结果 | `通过/未通过` | `pass/fail/pending` |
| 比赛 ID | `number` | `int`（一致） |
| `version` | 前端 `version` 初始 1 | 后端初始 0（乐观锁冲突风险） |

#### D. 通用

| 项 | 前端 | 后端 | 影响 |
|---|---|---|---|
| 响应信封 | `{ code, data, message }` | `{ code, msg, data, success, trace_id }` | 失败时前端取不到文案，退化成“请求失败” |
| 分页 | `PageResult { total, page, page_size, pages, results }` | `{ list, next_page, total, page, page_size }` | 列表取 `results` 会得到 `undefined` |
| 日期 | mock 统一 `YYYY-MM-DD HH:mm`；`occurred_at` 为 ISO `T` | `YYYY-MM-DD HH:MM:SS` | `slice(0,16)` / `slice(11,16)` 对 ISO 与空格混用需兼容 |
| 文件 / 图片 | 全部 `Blob`（图片、下载文件） | FileField URL + `media` 静态目录（仅 DEBUG 暴露） | 真实接入需改为 URL 或统一 blob 适配层 |
| 上传 | mock 直接收 `File`；`request()` 固定 JSON 头 | 后端多为 multipart | live 实现需单独 `FormData` 分支 |
| 学校/球队 ID | `schoolCode` 12 位字符串；`teamId` 字符串 | 学校/球队以自增 `id` 为主键，`school_code` 为字段 | 校级裁剪、报名、比赛关联需加映射 |
| 错误码 | 前端本地错误码（1001/1003/20004/40009…） | 后端 `ResponseCode` 数值不同 | 页面按 code 分支（如 40009）会失效，需统一 |
| 数据所有权 | mock 用 `ownerAccount` / `schoolCode` 从会话裁剪 | 后端用 `request.user` + `school_profile.school_id` | 前端入参中的学校字段不可信，需后端忽略 |

### 5.4 其他实现层风险

1. `liveAuthApi.login` 先请求再 `assertEntry`，入口校验失败时虽未落 token，但后端已签发令牌，且前端未登出。
2. mock 会话 `restore()` 丢失 `city/district`，刷新后管理员统计范围会退回空。
3. `USE_MOCK` 只作用于认证，联调时容易出现“登录是真的、数据是假的”混合状态，需在页面或网络层加显式标识。
4. `mock/liveGoal.ts` 同时承担“公众端比赛数据源、校级比赛数据源、门户赛程数据源”，真实接入时三处需要统一到后端的 `Match` 模型。
5. 图片/文件 Blob 方案在真实接口下不再适用，`URL.createObjectURL` 需替换为后端 URL，且要处理鉴权（受保护文件需带 token 拉取）。
6. 前端多处用中文字符串做状态判断（如 `status === '已结束'`、`type === '进球'`），后端英文枚举接入时必须先做映射层，不能直接透传。

---

## 6. 首批接入建议

按“后端已具备 + 页面主链路 + 影响面”排序：

1. **认证（`authApi`）**：先修契约——登录改 `phone/email + password`、区分 `/api/admin/auth/login`、去掉尾斜杠、按后端 `UserSerializer` 重写 `mapUser`、补 `school` 角色与 `schoolCode/schoolName` 映射；同时让 `restore()` 回填 `city/district`。
2. **赛事 + 报名（`tournamentApi` / `registrationApi`）**：后端 `competitions` 与三级报名审核链路已存在，是业务主流程；需新增 live 实现并把中文状态映射为后端枚举，补分页适配。
3. **校级比赛运营（`schoolMatchApi` + `schoolLiveApi` 的事件/阵容/状态/裁判/文件/直播链接/人脸核验）**：后端 `/api/school/live/*` 已完整覆盖，优先接 `matches`、`events`、`lineup`、`status`、`files`、`face-verify`；同步解决 `phase`（后端无字段）与枚举差异。
4. **门户赛程/比赛详情（`portalApi.schedule` + 公开端 `public/live`）**：后端 `/api/public/live/matches*` 可直接替换 mock，先把 `portalApi` 的 `PortalMatch` 映射做好（`status_label`、`match_time`、`group_type_label`）。
5. 暂缓：视觉进球判定、摄像设备、计分板、精彩瞬间、AI 报告、统计汇总、实名、校級赛事发布/报名、球队人员维护——后端需先建模型与路由，否则只能继续 mock。

---

## 附录：相关文件索引

| 文件 | 作用 |
|---|---|
| `src/api/index.ts` | API 对象装配、`USE_MOCK` 开关、类型再导出 |
| `src/api/types.ts` | 全部接口与数据模型定义（101 个方法契约） |
| `src/api/live/client.ts` | fetch 封装、Bearer、信封解析、8s 超时 |
| `src/api/live/auth.ts` | 真实认证实现 |
| `src/api/mock/*.ts` | 各领域 mock 实现 |
| `src/api/teamCompleteness.ts` | 球队完善度规则（报名前置校验） |
| `src/api/error.ts` | `ApiError` |
| `src/stores/auth.ts` | 登录态与 `restore/logout` 调用点 |
| `src/routers/index.ts` | 路由守卫调用 `auth.restore()` |
