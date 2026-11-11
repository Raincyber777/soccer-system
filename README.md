# 绿茵汇 · 校园足球赛事管理平台

面向省、市、县、校四级的校园足球赛事一体化管理平台，覆盖公众观赛、球队管理、赛事报名、市州初审、省级终审、校级比赛运营和球员档案管理。

## 项目简介

绿茵汇将原本分散的赛事组织流程整合到同一套系统中：

- 公众可以查看赛程、赛果和赛事动态；
- 球队负责人可以维护球队、球员和教练组，并在线提交报名；
- 市州、省级管理员完成两级审核；
- 校级管理员可以运营本校比赛，维护比赛事件、阵容、裁判、文件和直播链接；
- 管理员可以统一检索球员档案、赛季数据和逐场记录。

项目由 Vue 3 前端与 Django REST Framework 后端组成，核心业务流程已接通真实接口。

## 核心功能

### 公众门户
- 首页赛事现场、报名中赛事、资讯与榜单
- 门户赛程、比赛详情
- 公众端无需登录即可浏览

### 球队中心
- 球队资料与完善度
- 球员名单新增、删除、批量导入
- 教练组维护
- 球队报名资格自查

### 赛事报名
- 赛事列表与报名入口
- 报名资格校验
- 盖章报名表上传
- 报名草稿、提交审核
- 我的报名与审核进度

### 多级审核
- 市州管理员初审
- 初审通过后自动报送省级
- 省级管理员终审
- 审核状态全流程留痕

### 校级比赛运营
- 本校比赛列表
- 比赛事件维护，进球联动比分
- 首发阵容
- 裁判组配置
- 赛事文件与直播链接
- 按学校数据域隔离

### 球员库
- 按姓名、球队、城市、组别、公示状态检索
- 球员全量档案
- 赛季汇总与逐场记录
- 一键公示 / 取消公示

## 技术栈

### 前端
- Vue 3
- TypeScript
- Vite
- Vue Router
- Playwright（自动化测试与演示录屏）

### 后端
- Python
- Django
- Django REST Framework
- SimpleJWT
- SQLite（开发环境）

### 接口与文档
- OpenAPI 3
- Apifox 联调
- 冒烟测试脚本

## 目录结构

```text
.
├─ soccer-system/          # Vue 3 前端
│  ├─ src/
│  │  ├─ api/              # 真实接口与 mock 实现
│  │  ├─ user/             # 用户端
│  │  ├─ admin/            # 市州/区县管理端
│  │  ├─ school/           # 校级端
│  │  ├─ super/            # 超级管理员端
│  │  └─ components/       # 公共组件与门户
│  └─ docs/                # 联调方案、接口文档、OpenAPI
└─ soccer-database-main/   # Django 后端
   ├─ apps/                # 认证、组织、报名、直播、运动员等
   ├─ config/              # 路由与配置
   └─ scripts/             # 初始化、冒烟测试、演示数据
```

## 快速开始

### 1. 启动后端

```bash
cd soccer-database-main
python -m venv .venv

# Windows
.venv\Scripts\activate

pip install -r requirements.txt
python manage.py migrate
python manage.py seed_admin
python manage.py runserver 127.0.0.1:8000
```

### 2. 启动前端

```bash
cd soccer-system
npm install
npm run dev
```

如需连接本地后端，在 `soccer-system/.env.local` 中配置：

```dotenv
VITE_USE_MOCK=false
VITE_API_BASE=http://127.0.0.1:8000
```

修改环境变量后需要重启 Vite。

## 文档

- [接手说明](./HANDOVER.md)
- [API 清单](./API清单.md)
- [后端接口详细文档](./soccer-system/docs/api/backend-api.md)
- [OpenAPI 定义](./soccer-system/docs/api/openapi.json)
- [Apifox 测试指南](./soccer-system/docs/api/apifox-tests.md)
- [前后端联调对照表](./soccer-system/docs/backend-integration-plan.md)

## 联调与测试

```bash
# 前端类型检查
cd soccer-system
npm run type-check

# 前端构建
npm run build-only
```

后端提供冒烟测试脚本，覆盖认证、球队、赛事报名、两级审核、校级比赛运营、球员库和权限隔离等核心链路：

```bash
cd soccer-database-main
.venv\Scripts\python scripts\apifox_smoke.py
```

## 开发状态

已接通真实后端的模块：

- 登录认证与权限恢复
- 我的球队、球员名单、教练组
- 赛事列表
- 报名创建、盖章表上传、提交审核
- 我的报名
- 市州初审、省级终审
- 校级比赛列表与比赛运营
- 球员库列表、详情、公示
- 门户赛程

以下展示型模块仍保留本地模拟数据，便于独立预览：

- 新闻、政策、榜单、精彩瞬间
- AI 报告
- 计分板与视觉进球判定
- 部分校级赛事发布与报名代管

## 说明

本项目为校园足球赛事管理场景的教学与工程实践项目。开发环境默认使用 SQLite，生产部署建议切换 PostgreSQL，并关闭调试模式、修改默认管理员密码。
