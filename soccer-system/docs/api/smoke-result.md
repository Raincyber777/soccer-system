# Apifox 冒烟测试结果

- 时间：2026-11-10 21:25:48
- Base URL：http://127.0.0.1:8000
- 通过：59 / 59
- 失败：0

## 明细

| 结果 | 用例 |
|---|---|
| PASS | GET /api/health |
| PASS | POST /api/auth/register |
| PASS | POST /api/auth/login（手机号） |
| PASS | GET /api/auth/me |
| PASS | POST /api/admin/auth/login（邮箱） |
| PASS | 教练登录 |
| PASS | 运动员登录 |
| PASS | GET /api/teams/mine（教练球队） |
| PASS | GET /api/competitions 含可报名赛事 |
| PASS | POST /api/registrations（用户提交报名） |
| PASS | POST 盖章报名表上传 |
| PASS | POST 提交报名审核 |
| PASS | GET /api/competitions |
| PASS | GET /api/registrations（我的报名） |
| PASS | GET 球队球员名单 |
| PASS | PUT 保存球队球员名单 |
| PASS | GET 球队教练组 |
| PASS | PUT 保存球队教练组 |
| PASS | GET /api/players（球员库） |
| PASS | GET /api/players/{id} |
| PASS | POST 球员公示 |
| PASS | POST 取消球员公示 |
| PASS | GET /api/players/mine/records |
| PASS | GET /api/city/registrations |
| PASS | POST /api/city/registrations/{id}/approve |
| PASS | POST /api/city/registrations/{id}/report |
| PASS | POST /api/province/registrations/{id}/approve |
| PASS | GET /api/public/live/matches |
| PASS | GET /api/public/live/matches/{id} |
| PASS | GET /public/live/matches/{id}/events |
| PASS | GET /api/school/live/matches |
| PASS | POST /api/school/live/matches |
| PASS | PUT 比赛版本冲突（code=9） |
| PASS | PUT 比赛更新 |
| PASS | PATCH 开始比赛 |
| PASS | POST 新增进球事件 |
| PASS | GET 比赛事件 |
| PASS | DELETE 事件 |
| PASS | PUT 裁判 |
| PASS | PUT 阵容 |
| PASS | PUT 直播链接 |
| PASS | POST 文件非法格式（10006） |
| PASS | POST 文件上传 |
| PASS | GET 文件下载 |
| PASS | DELETE 文件 |
| PASS | POST 人脸核验 |
| PASS | GET 人脸核验记录 |
| PASS | PATCH 结束比赛 |
| PASS | DELETE 已结束比赛（40002） |
| PASS | DELETE 未开始比赛（清理） |
| PASS | GET /api/athlete/profile |
| PASS | GET /api/athlete/matches |
| PASS | GET /api/athlete/stats |
| PASS | GET /api/athlete/standings |
| PASS | GET /api/admin/provinces |
| PASS | GET /api/admin/cities |
| PASS | GET /api/admin/schools |
| PASS | GET /api/admin/teams |
| PASS | 个人账号访问管理端（20004） |
