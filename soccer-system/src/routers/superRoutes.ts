import type { RouteRecordRaw } from 'vue-router'
import SuperLayout from '../super/components/SuperLayout.vue'
import { adminRoutes } from './adminRoutes'

// 超级管理员端 = 管理员端全部功能（直接复用 admin 的页面组件，不复制代码）
// + 省级审核专属（报名审核/报名信息管理/报名账号管理/赛事身份核验）
// + 系统管理专属（系统参数配置/跨区数据权限）
const adminChildren = adminRoutes[0]?.children ?? []

// 复用管理端内容页：去掉管理端控制台（超级管理员端有全省数据总览），
// 以及管理端的两个账户页（超级管理员端有自己的可编辑版账户管理页面）、
// 管理端的使用说明（超管端用自己的版本），并去掉路由 name 避免与 /admin 重名
const excludedPaths = ['dashboard', 'user-accounts', 'admin-accounts', 'usage-guide']
const reusedChildren: RouteRecordRaw[] = adminChildren
  .filter((child) => !excludedPaths.includes(child.path) && child.component)
  .map((child) => ({
    path: child.path,
    component: child.component!,
    meta: child.meta,
  }))

export const superRoutes: RouteRecordRaw[] = [
  {
    path: '/super',
    component: SuperLayout,
    redirect: '/super/dashboard',
    children: [
      // 概览（全省数据总览仪表盘）
      { path: 'dashboard', name: 'super-dashboard', component: () => import('../super/pages/SuperDashboard.vue'), meta: { title: '全省数据总览', group: '概览' } },
      // 账户管理（超级管理员专属：可管理管理员账户和用户账户）
      { path: 'admin-accounts', name: 'super-admin-accounts', component: () => import('../super/pages/SuperAdminAccounts.vue'), meta: { title: '管理员账户管理', group: '账户管理' } },
      { path: 'user-accounts', name: 'super-user-accounts', component: () => import('../super/pages/SuperUserAccounts.vue'), meta: { title: '用户账户管理', group: '账户管理' } },
      // 省级审核（省级审核端专属：报名资格终审等高权限功能）
      { path: 'registration-review', name: 'super-registration-review', component: () => import('../super/pages/RegistrationReview.vue'), meta: { title: '报名信息审核', group: '省级审核' } },
      { path: 'registration-manage', name: 'super-registration-manage', component: () => import('../super/pages/RegistrationManage.vue'), meta: { title: '报名信息管理', group: '省级审核' } },
      { path: 'registration-accounts', name: 'super-registration-accounts', component: () => import('../super/pages/RegistrationAccounts.vue'), meta: { title: '报名账号管理', group: '省级审核' } },
      { path: 'identity-verify', name: 'super-identity-verify', component: () => import('../super/pages/IdentityVerify.vue'), meta: { title: '赛事身份核验', group: '省级审核' } },
      // 系统管理（超级管理员专属）
      { path: 'system-config', name: 'super-system-config', component: () => import('../super/pages/SystemConfig.vue'), meta: { title: '系统参数配置', group: '系统管理' } },
      { path: 'data-permission', name: 'super-data-permission', component: () => import('../super/pages/DataPermission.vue'), meta: { title: '跨区数据权限', group: '系统管理' } },
      // 以下全部复用管理端页面
      ...reusedChildren,
      // 帮助（超管端自己的使用说明，放在侧栏最底部）
      { path: 'usage-guide', name: 'super-usage-guide', component: () => import('../super/pages/UsageGuide.vue'), meta: { title: '使用说明', group: '帮助' } },
    ],
  },
]
