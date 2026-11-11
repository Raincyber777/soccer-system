# 绿茵汇项目接手说明

> 更新时间：2026-11-11
> 交接范围：`soccer-system` 前端 + `soccer-database-main` 后端
> 仓库：`http://github.com/Raincyber777/soccer-system.git`

---

## 1. 仓库与分支状态

| 项 | 说明 |
|---|---|
| 远程仓库 | `origin` → `https://github.com/Raincyber777/soccer-system.git` |
| 组内主分支 | `main`（`origin/main`） |
| 当前交接分支 | `main(old)`（`origin/main(old)`） |
| 本地其他分支 | `main`（跟踪 `origin/main`） |

### 1.1 当前分支为什么有两个前端目录

当前 `main(old)` 中存在两套前端目录：

- `soccer-system/`：本次联调使用的前端，已接入真实后端；
- `soccer-system/soccer-system/`：历史提交中误拷入的重复目录，结构与组内 `origin/main` 接近。

本次交接已把重复目录从 Git 索引移除，并加入根目录 `.gitignore`，**本地文件仍保留**。后续合并回 `main` 时，建议以 `origin/main` 的前端结构为基线，把本次联调中新增的 `src/api/live/*`、`src/api/mock/*`、报名/球队/球员库页面按模块迁入，不要直接覆盖。

### 1.2 Git 报错处理记录

截图中的错误：

```text
error: could not delete reference refs/remotes/origin/HEAD
fatal: bad object refs/remotes/origin/HEAD
```

原因是本地 `.git/refs/remotes/origin/HEAD` 文件损坏（内容为空白）。已执行：

```powershell
Remove-Item .git\refs\remotes\origin\HEAD
git fetch origin --prune
git remote set-head origin -a
```

如再次出现，可按同样方式处理，或执行：

```powershell
git remote set-head origin -d
git fetch origin --prune
git remote set-head origin -a
```

---

## 2. 目录说明

```text
.
├─ README.md                    # 项目介绍
├─ HANDOVER.md                  # 本文件
├─ API清单.md                   # 核心接口清单
├─ .gitignore                   # 仓库级忽略规则
├─ soccer-system/               # Vue 3 前端
│  ├─ src/api/
│  │  ├─ live/                  # 真实后端接口实现
│  │  ├─ mock/                  # 未接后端模块的本地模拟实现
│  │  ├─ index.ts               # USE_MOCK 开关与 API 导出
│  │  └─ types.ts               # 前端接口契约
│  ├─ src/user/                 # 用户端：球队、报名、运动员
│  ├─ src/admin/                # 市州/区县管理端
│  ├─ src/school/               # 校级端
│  ├─ src/super/                # 超级管理员端
│  ├─ docs/                     # 联调、API、OpenAPI、Apifox 文档
│  └─ scripts/                  # OpenAPI 生成、演示录屏
└─ soccer-database-main/        # Django 后端
   ├─ apps/accounts/            # 用户、运动员、教练档案
   ├─ apps/org/                 # 省市区县、学校、球队、教练组
   ├─ apps/registration/        # 赛事、报名、市区省审核
   ├─ apps/live/                # 比赛、事件、阵容、裁判、文件、直播
   ├─ apps/athlete/             # 运动员端、球员库
   ├─ config/                   # Django 路由与配置
   └─ scripts/                  # 冒烟测试、演示数据重置
```

---

## 3. 环境与启动

### 3.1 后端

```powershell
cd soccer-database-main

# 首次：创建虚拟环境
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 每次启动
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_admin
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

- 开发数据库：`soccer-database-main/db.sqlite3`（已忽略，不提交）
- 上传文件目录：`soccer-database-main/storage/private`（已忽略，不提交）
- 后端 Base URL：`http://127.0.0.1:8000`

### 3.2 前端

```powershell
cd soccer-system
npm install
npm run dev
```

`soccer-system/.env.local`：

```dotenv
VITE_USE_MOCK=false
VITE_API_BASE=http://127.0.0.1:8000
```

- `VITE_USE_MOCK=false` 时，已接入模块走真实后端，未接入模块继续走 mock；
- 修改环境变量后需要重启 Vite；
- 默认开发地址：`http://localhost:5173`。

### 3.3 数据库初始化与演示数据

```powershell
cd soccer-database-main
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_admin

# 重置演示报名与临时球员（可反复执行）
.\.venv\Scripts\python.exe scripts\reset_demo.py

# 前后端联调冒烟测试
.\.venv\Scripts\python.exe scripts\apifox_smoke.py
```

---

## 4. 测试账号

以下账号仅用于本地演示，生产环境必须删除或修改密码。

| 角色 | 账号 | 密码 | 入口 |
|---|---|---|---|
| 超级管理员 | `admin@ball.local` | `admin123` | `/admin/login` |
| 市州管理员 | `13600000001` | `pass1234` | `/admin/login` |
| 校级管理员 | `13700000001` | `pass1234` | `/admin/login` |
| 球队负责人 | `13500000001` | `pass1234` | `/login` |
| 教练 | `13900000001` | `pass1234` | `/login` |
| 运动员 | `13800000001` | `pass1234` | `/login` |

---

## 5. 已完成模块

### 5.1 前端已接真实后端

- 登录、注册、登出、`/api/auth/me` 恢复登录态
- 管理员/普通账号分流登录
- 我的球队资料读取与保存
- 球队球员名单、教练组读取与整体保存
- 赛事列表
- 报名创建、盖章报名表上传、提交审核
- 我的报名列表
- 市州初审、省级终审
- 校级比赛列表、新建、编辑、开始/结束、删除
- 校级比赛事件、阵容、裁判、文件、直播链接、人脸核验
- 球员库列表、详情、公示/取消公示
- 运动员本人比赛明细
- 门户赛程

### 5.2 仍为 mock 或未接后端

- 新闻、政策、榜单、精彩瞬间
- AI 比赛报告
- 计分板端口、摄像设备、视觉进球判定
- 部分校级赛事发布、校级报名代管
- 用户端实名认证提交
- 部分统计汇总/数据大屏
- 省市区县学校的管理端 CRUD 页面（后端接口存在，前端部分页面仍用本地数据）

---

## 6. 接口约定

### 6.1 响应信封

```json
{
  "code": 0,
  "msg": "success",
  "data": {},
  "success": true,
  "trace_id": "..."
}
```

- `code === 0` 表示成功；
- 错误时 `data` 为 `null`，`msg` 为中文说明；
- 审核接口以 `code` 为准，不要只看 HTTP 状态。

### 6.2 认证

- 请求头：`Authorization: Bearer <access>`
- 管理员：`POST /api/admin/auth/login`（邮箱 + 密码）
- 其他角色：`POST /api/auth/login`（手机号 + 密码）
- access 有效期 8 小时，refresh 7 天；
- **没有 refresh 换发接口**，过期只能重新登录。

### 6.3 路径与分页

- 所有接口路径**无尾斜杠**，例如 `/api/auth/login`，不是 `/api/auth/login/`；
- 列表分页参数：`page`、`page_size`（默认 20，最大 100）；
- 分页返回：`{ list, next_page, total, page, page_size }`。

### 6.4 时间与文件

- 直播模块时间：`YYYY-MM-DD HH:mm:ss`；
- 报名/运动员端时间：ISO 8601；
- multipart 文件字段：`file`（人脸核验为 `photo`）；
- 单文件上限 10MB；
- 下载接口返回二进制，不套 JSON 信封。

---

## 7. 测试与验证

| 项目 | 结果 |
|---|---|
| 后端冒烟测试 | 59/59 通过 |
| OpenAPI 路径 | 58 个 |
| 前端类型检查 | 通过 |
| 前端构建 | 通过 |
| 浏览器实测 | 管理员、校级、市州、教练、负责人流程通过 |

相关文件：

- `soccer-system/docs/api/backend-api.md`
- `soccer-system/docs/api/openapi.json`
- `soccer-system/docs/api/apifox-tests.md`
- `soccer-system/docs/api/smoke-result.md`
- `soccer-system/docs/backend-integration-plan.md`

---

## 8. 已知问题与注意事项

1. **两套前端目录**：当前分支的 `soccer-system/soccer-system/` 是历史重复目录，不要继续在其中开发；后续以 `origin/main` 的结构为准合并。
2. **报名提交前置条件**：必须已上传盖章报名表，球员名单完整且学籍材料齐全，否则提交会返回缺失清单。
3. **球员统计**：出场分钟、首发、平均评分暂无采集来源，接口返回 0；进球、红黄牌来自比赛事件。
4. **混合 mock**：未接后端页面会读取真实登录态兜底，但仍使用本地数据，不要误认为已落库。
5. **管理员入口**：管理员账号走普通登录会返回 `20004`；普通账号走管理员登录同理。
6. **禁用账号不踢下线**：已签发 JWT 在 8 小时内仍可调用接口。
7. **本地数据库不上传**：`db.sqlite3`、`storage/`、`.env.local`、日志、演示视频均已加入忽略规则。

---

## 9. 建议的下一步

1. 以 `origin/main` 为基线，合并本次 `main(old)` 的联调改动，清理重复前端目录。
2. 接入剩余 mock 模块：新闻/榜单/精彩瞬间、AI 报告、计分板、视觉判定。
3. 补齐用户端实名认证提交与省市区县组织管理页面。
4. 将开发数据库从 SQLite 切换到 PostgreSQL，补充生产环境配置与静态文件部署。
5. 删除演示账号，修改默认管理员密码，关闭 DEBUG。
6. 为关键接口补充自动化测试与 CI（类型检查、构建、冒烟测试）。

---

## 10. 关键文件索引

| 文件 | 用途 |
|---|---|
| `soccer-system/src/api/index.ts` | API 开关与统一导出 |
| `soccer-system/src/api/live/*` | 真实后端实现 |
| `soccer-system/src/api/mock/*` | 未接模块模拟实现 |
| `soccer-system/src/stores/auth.ts` | 登录态与角色恢复 |
| `soccer-database-main/config/urls.py` | 后端总路由 |
| `soccer-database-main/apps/registration/` | 赛事与报名审核 |
| `soccer-database-main/apps/live/` | 比赛与直播运营 |
| `soccer-database-main/apps/athlete/` | 运动员端与球员库 |
| `soccer-database-main/scripts/apifox_smoke.py` | 冒烟测试 |
| `soccer-database-main/scripts/reset_demo.py` | 演示数据重置 |
