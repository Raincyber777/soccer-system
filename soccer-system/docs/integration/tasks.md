# 前后端联调任务清单

> 规格见 `docs/integration/spec.md`。按顺序执行，每项验证后再勾选。

## T1 后端环境

- [x] 在 `soccer-database-main` 创建 `.venv` 并安装 requirements（或等价依赖）。
- [x] `python manage.py check`、`migrate`、`seed_admin` 通过。
- [x] `python manage.py runserver 127.0.0.1:8000` 启动，`GET /api/health` 返回 `code=0`。

## T2 请求层基础设施

- [x] 重写 `src/api/live/client.ts`：`msg` 兼容、FormData、下载、无尾斜杠、token 工具、错误码透传。
- [x] 新增 `.env.local`（`VITE_USE_MOCK=false`、`VITE_API_BASE` 留空）。
- [x] `vite.config.ts` 增加 `/api` 代理到 `127.0.0.1:8000`。
- [x] `src/api/index.ts` 改为逐对象切换。

## T3 认证

- [x] 重写 `src/api/live/auth.ts`：手机号/邮箱分流、角色与 persona 映射、`profile` 映射、`me` 恢复、清会话。
- [x] 登录入口校验失败不落盘 token。
- [x] 浏览器验证：admin / 用户 / 校级三个入口登录与刷新恢复。

## T4 报名审核

- [x] 新增 `src/api/live/registration.ts`：市州/省级列表、通过、驳回、我的报名、重提。
- [x] 字段与状态映射（含 `player_count`、`reject_level_display`）。
- [x] 浏览器验证：市州初审列表、通过/驳回；省级终审；我的报名状态时间线。

## T5 校级比赛

- [x] 新增 `src/api/live/schoolMatch.ts`：列表/新建/编辑/开始/结束/删除；手动比分明确提示。
- [x] `phase` 由 `status` 推导，`version` 透传。
- [x] 浏览器验证：比赛列表、新建、编辑、状态流转、乐观锁冲突提示。

## T6 校级比赛运营

- [x] 新增 `src/api/live/schoolLive.ts`：事件、阵容、裁判、文件、直播链接、人脸核验、状态读取。
- [x] 事件类型/主客队/字段中文↔英文映射；文件上传 multipart；下载 Blob。
- [x] 浏览器验证：比赛详情各 Tab 操作与后端数据一致；已结束锁定提示正常。

## T7 门户赛程

- [x] 新增 `src/api/live/portal.ts`：`schedule` 接公众比赛列表，详情/事件接公众详情接口，其余方法保持 mock。
- [x] 首页赛程、门户赛程页展示后端数据，跳转详情正常。

## T8 文档

- [x] `docs/backend-integration-plan.md`：24 个对象对照表与缺口说明。
- [x] `docs/api/backend-api.md`：接口文档（方法/路径/权限/参数/响应/错误码/示例）。
- [x] `docs/api/openapi.json`：OpenAPI 3.0，含 Bearer、分页、统一信封。
- [x] `docs/api/apifox-environment.json`、`docs/api/apifox-tests.md`。

## T9 Apifox 测试

- [x] `scripts/apifox_smoke.py` 覆盖认证 → 报名 → 直播 → 运动员 → 组织。
- [x] 运行脚本并生成 `docs/api/smoke-result.md`（最终 59/59 通过）。
- [x] 尝试安装/运行 Apifox CLI；不可用时给出 Apifox 导入 OpenAPI 的逐步操作与预期结果。

## T10 回归

- [x] `npm run type-check` 通过。
- [x] `npm run build-only` 通过。
- [x] 浏览器复测登录、首页、校级比赛、报名审核；UI 样式无回归。
- [x] 记录未接通模块与阻塞原因（见 `docs/backend-integration-plan.md` 第 3 节）。

## T11 用户端报名提交修复

- [x] 后端新增 `GET/PUT /api/teams/mine`，补齐球队资料字段与球员/教练组返回。
- [x] 后端允许 `personal`（球队负责人）角色创建球队、提交报名。
- [x] 前端 `teamApi` 接 `/api/teams/mine`，`tournamentApi.list` 接 `/api/competitions`。
- [x] `registrationApi.create` 改为：创建草稿 → 上传盖章报名表 → 提交审核。
- [x] 报名表单新增盖章报名表上传框，未上传时阻止提交并提示。
- [x] 冒烟脚本扩展用户提交用例，结果 50/50 通过。
- [x] 用户层实测：负责人登录 → 球队 → 赛事 → 报名表单 → 未上传提示 → 提交成功 → 我的报名显示待初审。

## T12 球队成员维护

- [x] 后端新增 `GET/PUT /api/teams/{id}/athletes`、`GET/PUT /api/teams/{id}/coaches`。
- [x] 后端新增 `GET /api/school/teams`，校级端可读取本校球队。
- [x] `AthleteProfile` 增加 `birth_date`、`publicized`，新增 `TeamCoachProfile` 模型并迁移。
- [x] 前端 `teamRosterApi` 全部 5 个方法接后端，`schoolTeamApi` 接本校球队列表。
- [x] 用户层实测：成员页显示 6→7 名球员并新增成功；教练页显示并新增成功。
- [x] 校级层实测：本校人员页球队下拉、教练/球员随球队切换正常。

## T13 球员库

- [x] 后端新增 `/api/players` 列表、详情、公示开关、我的比赛明细。
- [x] 前端 `playerApi` 全部 4 个方法接后端。
- [x] 浏览器实测：球员管理列表 12 人，详情显示球队、统计与比赛记录。
- [x] 浏览器实测：公示操作后状态变为“已公示”。
- [x] 冒烟脚本扩展至 59 项，全部通过。

## T14 演示视频

- [x] 新增 `scripts/demo-video.mjs`：Playwright 自动操作 + CDP 逐帧录屏 + 页面内中文字幕。
- [x] 录制流程覆盖首页、负责人球队/报名、市州初审、省级终审、校级比赛运营、球员库、公众端收尾。
- [x] 生成 1440×900、约 4 分钟的 MP4（含静音音轨）。
- [x] 修复录屏过程中暴露的真实登录态与 mock 接口混用导致的 401 提示。
