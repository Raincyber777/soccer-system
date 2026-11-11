# Apifox 测试指南

## 1. 导入

1. 打开 Apifox，进入目标项目 →「设置」→「导入数据」→「OpenAPI / Swagger」。
2. 选择 `docs/api/openapi.json`，导入模式选「新建接口」，覆盖策略选「合并」。
3. 导入成功后应看到 10 个目录、50 个接口。
4. 「环境管理」→ 新建环境「本地」：
   - `baseUrl` = `http://127.0.0.1:8000`
   - `token` = 留空
   - `adminEmail` = `admin@ball.local`
   - `adminPassword` = `admin123`
   - 也可直接导入 `docs/api/apifox-environment.json`（Postman 环境格式，Apifox 支持导入）。
5. 「目录设置」→「Auth」→ 选择 `Bearer Token`，值填 `{{token}}`；或逐个接口在 Header 中加 `Authorization: Bearer {{token}}`。

## 2. 测试顺序与预期

> 先启动后端：`python manage.py runserver 127.0.0.1:8000`。
> 除健康检查、注册、登录、公众直播外，均需先登录并保存 token。

| # | 用例 | 预期 code | 说明 |
|---|---|---|---|
| 1 | `GET /api/health` | 0 | 服务存活 |
| 2 | `POST /api/auth/register` | 0 | 手机号唯一，role=personal |
| 3 | `POST /api/auth/login` | 0 | 用刚注册手机号；把返回的 `data.access` 写入环境变量 `token` |
| 4 | `GET /api/auth/me` | 0 | 校验 token |
| 5 | `POST /api/admin/auth/login` | 0 | 管理员邮箱登录，另存 `adminToken` |
| 6 | `GET /api/competitions` | 0 | 需登录 |
| 7 | `GET /api/registrations` | 0 | coach/school；无数据返回空 list |
| 8 | `GET /api/city/registrations` | 0 | 市州账号；管理员可直通 |
| 9 | `POST /api/city/registrations/{id}/approve` | 0 | 状态变 `city_approved` |
| 10 | `POST /api/city/registrations/{id}/report` | 0 | 状态变 `reported` |
| 11 | `POST /api/province/registrations/{id}/approve` | 0 | 状态变 `approved` |
| 12 | `GET /api/public/live/matches` | 0 | 免登，`data.list` 为数组 |
| 13 | `GET /api/public/live/matches/{id}` | 0 | 取列表第一条 id |
| 14 | `GET /api/public/live/matches/{id}/events` | 0 | `since_id=999999` 返回空数组 |
| 15 | `POST /api/school/live/matches` | 0 | 带 `adminToken`；至少一支球队存在 |
| 16 | `PUT /api/school/live/matches/{id}` | 0 | 先取详情里的 `version` |
| 17 | `PATCH /api/school/live/matches/{id}/status` | 0 | `start`，状态变 `live` |
| 18 | `POST /api/school/live/matches/{id}/events` | 0 | `client_token` 用 uuid，主队进球比分 +1 |
| 19 | `PUT /api/school/live/matches/{id}/referees` | 0 | 最多 4 名，主裁 1 名 |
| 20 | `PUT /api/school/live/matches/{id}/lineup` | 0 | 带最新 `version` |
| 21 | `PUT /api/school/live/matches/{id}/live-link` | 0 | URL 合法 |
| 22 | `POST /api/school/live/matches/{id}/files` | 0 | multipart：`type=sign_in`、`file=pdf` |
| 23 | `POST /api/school/live/matches/{id}/face-verify` | 0 | multipart：`player_name`、`photo` |
| 24 | `GET /api/athlete/profile` | 0 | 运动员账号 |
| 25 | `GET /api/athlete/matches` | 0 | 无球队时 list 为空 |
| 26 | `GET /api/athlete/stats` | 0 | — |
| 27 | `GET /api/athlete/standings` | 0 | — |
| 28 | `GET /api/admin/provinces` | 0 | 管理员 |
| 29 | `GET /api/admin/cities` | 0 | 管理员 |
| 30 | `GET /api/admin/schools` | 0 | 管理员 |
| 31 | `GET /api/admin/teams` | 0 | 管理员 |
| 32 | 用个人 token 调 `GET /api/admin/provinces` | 20004 | 权限隔离 |

## 3. 断言建议

- 所有接口：`json.code === 0` 且 `json.trace_id` 存在。
- 登录：`json.data.access` 非空；`json.data.user.role` 符合账号类型。
- 分页：`json.data.list` 为数组，含 `total/page/page_size/next_page`。
- 报名状态：按 `submitted → city_approved → reported → approved` 递进。
- 比赛：创建后 `version` 存在；错误 version 更新返回 `code=9`；已结束写操作返回 `40002`。
- 事件：重复 `client_token` 返回 `40009`；进球事件后 `home_score`/`away_score` 变化。
- 权限：非管理员访问管理端返回 `code=20004`。

## 4. 一键冒烟

如果不想手工点，可在后端目录运行：

```powershell
.venv\Scripts\python.exe scripts\apifox_smoke.py
```

脚本会准备学校/球队/教练/运动员/赛事数据，并按上表顺序执行，结果写入 `soccer-system/docs/api/smoke-result.md`。

## 5. Apifox CLI（可选）

Apifox CLI 已可通过 `npx --yes apifox-cli --version` 使用（当前 2.2.12），但 `apifox run` 只接受 **Apifox 导出的场景用例/测试套件文件**，且需要登录 Apifox 账号；本机未安装桌面端、无登录态，因此本次未用 CLI 直跑。已验证的替代方案是 `scripts/apifox_smoke.py`（45/45 通过），接口顺序与上表完全一致。

在 Apifox GUI 中导入 OpenAPI 后，可直接按上表顺序调试；若要生成 CLI 可运行的文件：

1. Apifox 中新建「测试场景」→ 按上表添加接口步骤 → 保存。
2. 场景右上角「导出」→ 选择 Apifox CLI 格式。
3. 执行：

```powershell
npx apifox-cli run <导出的场景文件>.apifox-cli.json --env-var "baseUrl=http://127.0.0.1:8000" -r "cli,html"
```
