import type { RouteRecordRaw } from 'vue-router'
import AdminLayout from '../admin/components/AdminLayout.vue'
import { schoolAdminChildren } from './schoolRoutes'

// 管理员端路由：meta.group 是侧边栏分组名，meta.title 是菜单名
// 普通管理员 = 市州级赛事管理角色（教育局/市足协等），负责本区域报名初审、账户日常管理与赛事运营（内容、直播、遴选、日志）；
// 报名终审、删除账户、管理员账户管理等省级高权限收口超级管理员端
export const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/admin',
    component: AdminLayout,
    redirect: '/admin/dashboard',
    children: [
      // 概览
      { path: 'dashboard', name: 'admin-dashboard', component: () => import('../admin/pages/AdminDashboard.vue'), meta: { title: '管理控制台', group: '概览' } },
      // 汇总数据：球队 / 球员 / 报名按市州与组别聚合
      { path: 'data-summary', name: 'admin-data-summary', component: () => import('../admin/pages/DataSummary.vue'), meta: { title: '汇总数据', group: '概览' } },
      // 数据查询：按时间、球队、比赛筛选，支持省 / 市 / 区 / 校范围
      { path: 'data-query', name: 'admin-data-query', component: () => import('../admin/pages/DataQuery.vue'), meta: { title: '数据查询', group: '概览' } },
      // 账户管理（普通管理员：用户账户限本区域日常操作——开户/编辑/重置密码/禁用启用；删除与管理员账户管理收口超级管理员）
      { path: 'user-accounts', name: 'admin-user-accounts', component: () => import('../admin/pages/UserAccountManage.vue'), meta: { title: '用户账户', group: '账户管理' } },
      // 实名认证审核：市州管理员审核本市队员实名信息
      { path: 'identity-review', name: 'admin-identity-review', component: () => import('../super/pages/IdentityVerify.vue'), meta: { title: '实名认证审核', group: '账户管理' } },
      { path: 'admin-accounts', name: 'admin-admin-accounts', component: () => import('../admin/pages/AdminAccountsView.vue'), meta: { title: '管理员账户（只读）', group: '账户管理' } },
      // 赛事管理（校级 / 市级 / 省级分类发布，市州管理员可发布校级与市级赛事）
      { path: 'tournament-manage', name: 'admin-tournament-manage', component: () => import('../admin/pages/TournamentManage.vue'), meta: { title: '赛事发布管理', group: '赛事管理' } },
      // 报名管理（市州初审 + 省级反向审核：通过 / 驳回原因 / 球队重新提交）
      { path: 'registration-first-review', name: 'admin-registration-first-review', component: () => import('../admin/pages/RegistrationFirstReview.vue'), meta: { title: '报名审核', group: '报名管理' } },
      // 球员管理
      { path: 'player-manage', name: 'admin-player-manage', component: () => import('../admin/pages/PlayerManage.vue'), meta: { title: '球员管理', group: '球员管理' } },
      // 单个球员全量统计：隐藏菜单，从球员管理列表进入
      { path: 'players/:id', name: 'admin-player-detail', component: () => import('../admin/pages/PlayerDetail.vue'), meta: { title: '球员全量统计', group: '球员管理', hidden: true } },
      // 教练员管理
      { path: 'coach-manage', name: 'admin-coach-manage', component: () => import('../admin/pages/CoachManage.vue'), meta: { title: '教练员管理', group: '教练员管理' } },
      // 参赛管理
      { path: 'team-manage', name: 'admin-team-manage', component: () => import('../admin/pages/TeamManage.vue'), meta: { title: '球队信息管理', group: '参赛管理' } },
      { path: 'selection-archive', name: 'admin-selection-archive', component: () => import('../admin/pages/SelectionArchive.vue'), meta: { title: '球员遴选档案', group: '参赛管理' } },
      // 遴选管理（初选/复选评分、汇总导出、最佳球员遴选结果）
      { path: 'selection-manage', name: 'admin-selection-manage', component: () => import('../admin/pages/SelectionManage.vue'), meta: { title: '初选评分', group: '遴选管理' } },
      { path: 'selection-second', name: 'admin-selection-second', component: () => import('../admin/pages/SelectionSecond.vue'), meta: { title: '复选评分', group: '遴选管理' } },
      { path: 'selection-best', name: 'admin-selection-best', component: () => import('../admin/pages/SelectionBest.vue'), meta: { title: '最佳球员遴选结果', group: '遴选管理' } },
      // 赛事直播管理
      { path: 'live-text', name: 'admin-live-text', component: () => import('../admin/pages/LiveText.vue'), meta: { title: '赛事图文直播', group: '赛事直播管理' } },
      { path: 'match-entry', name: 'admin-match-entry', component: () => import('../admin/pages/MatchEntry.vue'), meta: { title: '赛事信息录入', group: '赛事直播管理' } },
      { path: 'match-files', name: 'admin-match-files', component: () => import('../admin/pages/MatchFiles.vue'), meta: { title: '赛事文件管理', group: '赛事直播管理' } },
      { path: 'live-manage', name: 'admin-live-manage', component: () => import('../admin/pages/LiveManage.vue'), meta: { title: '直播链接管理', group: '赛事直播管理' } },
      // 视觉进球判定：AI 待审核队列与摄像设备（ROI 标定）
      { path: 'goal-review', name: 'admin-goal-review', component: () => import('../admin/pages/GoalReview.vue'), meta: { title: 'AI 进球待审核', group: '赛事直播管理' } },
      { path: 'live-cameras', name: 'admin-live-cameras', component: () => import('../admin/pages/CameraManage.vue'), meta: { title: '摄像设备', group: '赛事直播管理' } },
      // 赛事门户管理（市州管理员不承担门户新闻管理权，新闻管理收口超级管理员端）
      { path: 'policy-manage', name: 'admin-policy-manage', component: () => import('../admin/pages/PolicyManage.vue'), meta: { title: '政策管理', group: '赛事门户管理' } },
      { path: 'matchup-manage', name: 'admin-matchup-manage', component: () => import('../admin/pages/MatchupManage.vue'), meta: { title: '对阵信息', group: '赛事门户管理' } },
      { path: 'result-manage', name: 'admin-result-manage', component: () => import('../admin/pages/ResultManage.vue'), meta: { title: '赛果发布', group: '赛事门户管理' } },
      { path: 'moments-manage', name: 'admin-moments-manage', component: () => import('../admin/pages/MomentsManage.vue'), meta: { title: '精彩瞬间', group: '赛事门户管理' } },
      { path: 'lineup-manage', name: 'admin-lineup-manage', component: () => import('../admin/pages/LineupManage.vue'), meta: { title: '最佳阵容', group: '赛事门户管理' } },
      { path: 'carousel-manage', name: 'admin-carousel-manage', component: () => import('../admin/pages/CarouselManage.vue'), meta: { title: '轮播图管理', group: '赛事门户管理' } },
      { path: 'partner-manage', name: 'admin-partner-manage', component: () => import('../admin/pages/PartnerManage.vue'), meta: { title: '合作方管理', group: '赛事门户管理' } },
      { path: 'ranking-manage', name: 'admin-ranking-manage', component: () => import('../admin/pages/RankingManage.vue'), meta: { title: '榜单统计', group: '赛事门户管理' } },
      { path: 'match-stats', name: 'admin-match-stats', component: () => import('../admin/pages/MatchStats.vue'), meta: { title: '赛事统计', group: '赛事门户管理' } },
      // 日志管理
      { path: 'operation-logs', name: 'admin-operation-logs', component: () => import('../admin/pages/OperationLogs.vue'), meta: { title: '操作日志', group: '日志管理' } },
      // 帮助
      { path: 'usage-guide', name: 'admin-usage-guide', component: () => import('../admin/pages/UsageGuide.vue'), meta: { title: '使用说明', group: '帮助' } },
      // 校级管理员页面：同一管理员端布局与登录入口，仅校级账号可见
      { path: 'school', redirect: '/admin/school/dashboard', meta: { hidden: true, schoolOnly: true } },
      ...schoolAdminChildren.map((child) => ({
        ...child,
        meta: { ...child.meta, schoolOnly: true },
      })),
    ],
  },
]
