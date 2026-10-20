import type { RouteRecordRaw } from 'vue-router'
import AdminLayout from '../admin/components/AdminLayout.vue'

// 管理员端路由：meta.group 是侧边栏分组名，meta.title 是菜单名
// 普通管理员 = 市州/高校组审核员与赛事运营人员，负责日常运营（内容、直播、遴选、日志）；
// 报名审核等省级高权限功能已收口到超级管理员端
export const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/admin',
    component: AdminLayout,
    redirect: '/admin/dashboard',
    children: [
      // 概览
      { path: 'dashboard', name: 'admin-dashboard', component: () => import('../admin/pages/AdminDashboard.vue'), meta: { title: '管理控制台', group: '概览' } },
      // 账户管理（普通管理员：只能创建/删除用户账户；管理员账户仅可查看）
      { path: 'user-accounts', name: 'admin-user-accounts', component: () => import('../admin/pages/UserAccountManage.vue'), meta: { title: '用户账户管理', group: '账户管理' } },
      { path: 'admin-accounts', name: 'admin-admin-accounts', component: () => import('../admin/pages/AdminAccountsView.vue'), meta: { title: '管理员账户（只读）', group: '账户管理' } },
      // 球员管理
      { path: 'player-manage', name: 'admin-player-manage', component: () => import('../admin/pages/PlayerManage.vue'), meta: { title: '球员管理', group: '球员管理' } },
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
      // 赛事门户管理
      { path: 'news-manage', name: 'admin-news-manage', component: () => import('../admin/pages/NewsManage.vue'), meta: { title: '新闻管理', group: '赛事门户管理' } },
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
    ],
  },
]
