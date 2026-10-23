# 省级中小学足球系统 · 管理员端 **后端 API 服务**（Django）

纯后端：**只提供 JSON API**，不含任何页面、模板、静态资源。
覆盖参赛管理（225–235）/ 遴选管理（236–247）/ 日志管理（248–249）共 25 个功能点：
**20 个业务接口 + 4 个基础接口**，全部返回统一 Result JSON。

技术栈：Python 3.12+ / Django 5.2 LTS / MySQL 8.0（InnoDB, utf8mb4）。
**不使用** DRF、Node、Vue/React、Redis、Celery —— 后端只依赖 Python + Django。

> 原「服务端渲染页面」实现已按要求移除，归档在
> `E:\省级中小学足球系统2.0\_archive_ui_20261023\`（`frontend/` + `page_views/` + `tests/test_pages.py`），
> 需要恢复界面时可直接取回。

---

## 1. 目录结构

```text
football_admin/
├── backend/
│   ├── manage.py                # 命令行入口（在 backend/ 下执行）
│   ├── config/                  # settings / urls / wsgi / asgi
│   ├── common/                  # Result、校验、中间件、trace_id、三通道日志、加密、缓存、导出、分页
│   ├── apps/
│   │   ├── core/                # 行政区划、字典、种子、冒烟、健康检查、错误处理
│   │   ├── accounts/            # 登录 / 当前用户 / 退出 / CSRF
│   │   ├── teams/               # 球队、成员、教练、比赛
│   │   ├── players/             # 球员遴选档案
│   │   ├── selection/           # 赛事、评分、汇总、导出、最佳球员结果
│   │   └── oplogs/              # 操作日志（只读）
│   ├── tests/                   # 116 项接口与模型测试
│   ├── scripts/init_db.sql
│   ├── .venv/  .env  .env.example  requirements.txt  .gitignore
│   ├── instance/                # 运行时密钥（gitignore）
│   └── logs/                    # business / exception / api 三通道日志
└── README.md
```

## 2. 启动

```powershell
cd E:\省级中小学足球系统2.0\football_admin\backend

.venv\Scripts\python.exe -m pip install -r requirements.txt   # 首次
mysql -uroot -p < scripts\init_db.sql                          # 建库（MySQL 已启动）
copy .env.example .env                                          # 首次
.venv\Scripts\python.exe manage.py migrate
.venv\Scripts\python.exe manage.py seed_demo                    # 幂等演示数据
.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

服务无首页：访问 `/` 会返回 `{"code":30001,"msg":"接口不存在"}`，这是预期行为。

## 3. 认证方式（Session + CSRF）

纯 API 仍然使用 Django Session + CSRF（计划书 1.4 / 13 章假设），调用顺序：

```powershell
# 1) 取 CSRF Token（同时下发 csrftoken Cookie）
curl -c cookies.txt http://127.0.0.1:8000/api/v1/auth/csrf

# 2) 登录（JSON）
curl -b cookies.txt -c cookies.txt -X POST http://127.0.0.1:8000/api/v1/auth/login `
  -H "Content-Type: application/json" -H "X-CSRFToken: <上一步返回的 csrf_token>" `
  -d '{"username":"admin","password":"admin123"}'

# 3) 带 Cookie 调业务接口
curl -b cookies.txt "http://127.0.0.1:8000/api/v1/teams?pageNum=1&pageSize=20"

# 4) 退出
curl -b cookies.txt -X POST http://127.0.0.1:8000/api/v1/auth/logout -H "X-CSRFToken: <token>"
```

> 所有写请求（POST/PUT/DELETE）必须带 `X-CSRFToken`，否则返回 `20005`。
> 用 Postman/Apifox 时：先 GET `/api/v1/auth/csrf`，把返回的 token 填到请求头。

## 4. 接口清单（`/api/v1`）

| # | 方法 | 路径 | 功能点 | 说明 |
| ---: | --- | --- | --- | --- |
| 1 | GET | `/auth/csrf` | 基础 | 下发 CSRF Token |
| 2 | POST | `/auth/login` | 基础 | 账号密码登录（JSON） |
| 3 | GET | `/auth/me` | 基础 | 当前登录用户 |
| 4 | POST | `/auth/logout` | 基础 | 退出登录 |
| 5 | GET | `/health` | 基础 | 健康检查（免登录） |
| 6 | GET | `/teams` | 225–228 | 球队列表：`region_id` / `category` / `keyword` / 分页 |
| 7 | GET | `/teams/{id}` | 225 | 球队详情 + 成员/教练数 + 最近 3 场 |
| 8 | PUT | `/teams/{id}` | 225 | 维护基础信息（name/region_id/category/org_name/intro/status） |
| 9 | PUT | `/teams/{id}/reset-password` | 229 | 重置球队账号密码（临时密码仅返回一次） |
| 10 | GET | `/teams/{id}/members` | 230 | 成员列表（身份证掩码） |
| 11 | GET | `/teams/{id}/coaches` | 231 | 教练列表（手机号/身份证掩码） |
| 12 | GET | `/teams/{id}/matches` | 232 | 比赛记录（is_home / result_text） |
| 13 | GET | `/players` | 233–235 | 档案列表：`keyword` / `id_card`（18 位精确）/ `team_id` / `category` |
| 14 | GET | `/players/{id}` | 233 | 档案详情 + 初选/复选评分 |
| 15 | GET | `/selection-scores` | 236/240 | 评分列表：`event_id` / `stage` / `category` / `team_id` / `keyword` |
| 16 | POST | `/selection-scores` | 236/240 | 新增评分（总分服务端计算） |
| 17 | PUT | `/selection-scores/{id}` | 237/241 | 修改评分（`version` 乐观锁，冲突 30008） |
| 18 | GET | `/selection-scores/summary` | 238/242 | 汇总（概览 + Top10 + 全局名次分页） |
| 19 | GET | `/selection-scores/export` | 239/243 | 导出 xlsx/csv（≤10000 行） |
| 20 | GET | `/selection-results` | 244 | 最佳球员结果 |
| 21 | POST | `/selection-results/generate` | 245–247 | 按组别生成 Top N（事务 + 行锁） |
| 22 | GET | `/operation-logs` | 248 | 日志列表（module/action/user_id/日期/keyword） |
| 23 | GET | `/operation-logs/{id}` | 249 | 日志详情（脱敏 params） |

统一响应：

```json
{"code": 0, "msg": "获取成功", "data": {}, "success": true, "trace_id": "…"}
```

- 业务错误 HTTP 状态仍为 **200**，靠 `code` 表达；响应头同时返回 `X-Trace-Id`。
- 分页：`pageNum`（从 1）/ `pageSize`（默认 20，最大 100），返回 `{list,total,pageNum,pageSize}`。
- 导出成功返回文件流；失败返回 JSON。

## 5. 常用响应码

| code | 含义 | code | 含义 |
| ---: | --- | ---: | --- |
| 0 | 成功 | 30001 | 记录不存在 / 接口不存在 |
| 10001 | 参数错误 | 30003 | 数据已存在（重复评分） |
| 10002 | 必填缺失 | 30008 | 数据版本冲突（乐观锁） |
| 10003 | 格式错误 | 40001 | 业务失败（组别不一致、无评分数据、限流） |
| 10006 | 文件格式错误 | 40006 | 超出配额（导出 >10000 行） |
| 20001 | 未登录 | 60001 | 数据库异常 |
| 20005 | 无权限（含 CSRF 失败） | 90001 | 系统异常 |
| 20006 | 账号被禁用 | — | — |

## 6. 命令与验证

| 命令 | 用途 |
| --- | --- |
| `manage.py check` | 配置体检 |
| `manage.py check --deploy` | 生产安全体检（需 `DJANGO_DEBUG=0 DJANGO_SECURE=1`） |
| `manage.py migrate` | 建表 |
| `manage.py seed_demo` | 幂等种子 |
| `manage.py test --noinput` | **116 项**接口与模型测试 |
| `manage.py smoke_test` | 端到端冒烟 **PASS 41 / FAIL 0**（auth/teams/players/selection/logs） |

最近一次验证（2026-10-23，纯后端改造后）：

- `manage.py check` → `no issues (0 silenced)`
- `manage.py test --noinput` → `Ran 116 tests ... OK`
- `manage.py smoke_test` → `PASS 41 / FAIL 0`
- 实测：`/api/v1/health` 200、`/api/v1/auth/csrf` 下发 token、未登录 `/auth/me` 返回 20001、`/` 返回 30001 JSON

## 7. 演示账号

| 角色 | 账号 | 密码 |
| --- | --- | --- |
| 系统管理员 | `admin` | `admin123` |
| 评委甲 / 乙 | `judge_a` / `judge_b` | `admin123` |
| 球队账号 | `team_cd7` / `team_scu` … | `team123` |

## 8. 配置（`backend/.env`）

| 变量 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- |
| `SECRET_KEY` | 生产必填 | 自动生成 `backend/instance/secret_key.txt` | 会话/CSRF |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | 是 | `football_admin` / `fa_admin` / - | MySQL |
| `DB_HOST` / `DB_PORT` | 否 | `127.0.0.1` / `3306` | MySQL |
| `FIELD_ENCRYPTION_KEY` | 否 | 自动生成 `instance/field.key` | 身份证/手机号加密 |
| `ID_CARD_HASH_KEY` | 否 | 自动生成 `instance/hash.key` | 身份证检索哈希 |
| `SELECTION_TOP_N` | 否 | `5`（上限 11） | 最佳球员数量 |
| `MAX_EXPORT_ROWS` | 否 | `10000` | 导出行数上限 |
| `DJANGO_SECURE` | 否 | `0` | `1` 时启用 HTTPS 跳转 / HSTS / Secure Cookie |

## 9. 给前端接（任意技术栈）

- 全部接口为 JSON，返回结构固定；**不含 CORS 头**（同源部署即可）。若要与前端分离部署在别的域名，
  需额外加 CORS 支持（计划书技术白名单不允许 DRF，可手写 `Access-Control-Allow-*` 中间件，或由 Nginx 统一加头）。
- 前端只需：`GET /api/v1/auth/csrf` 拿 token → `POST /api/v1/auth/login` → 之后每次请求带 Cookie 与 `X-CSRFToken`。

## 10. 已知偏离

| 项 | 说明 |
| --- | --- |
| 界面 | 按用户要求**不做界面**；计划书第 7 章与 8 个页面未交付，相关实现已归档 `_archive_ui_20261023/` |
| Python | 计划书写 3.12，本机无 3.12，实装 3.13.0 + Django 5.2.18 |
| 导出 | 禁用 Celery 前提下采用流式 + 10000 行上限，非异步队列 |
| 鉴权 | Session + CSRF（非 Bearer Token） |
