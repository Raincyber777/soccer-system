import type { RouteRecordRaw } from 'vue-router'

// 校级管理员页面：挂载在管理员端 /admin/school 下，复用管理端布局与登录入口
// meta.schoolOnly 标记只在校级账号登录时出现在管理端菜单，普通/超级管理员不可访问
export const schoolAdminChildren: RouteRecordRaw[] = [
  {
    path: 'school/dashboard',
    name: 'school-dashboard',
    component: () => import('../school/pages/SchoolDashboard.vue'),
    meta: { title: '校级工作台', group: '概览' },
  },
  {
    path: 'school/stats',
    name: 'school-stats',
    component: () => import('../school/pages/SchoolStats.vue'),
    meta: { title: '本校数据', group: '概览' },
  },
  {
    path: 'school/matches',
    name: 'school-matches',
    component: () => import('../school/pages/SchoolMatches.vue'),
    meta: { title: '本校比赛', group: '比赛运营', permission: 'live:match:view' },
  },
  {
    path: 'school/tournaments',
    name: 'school-tournaments',
    component: () => import('../school/pages/SchoolTournaments.vue'),
    meta: { title: '校级赛事', group: '赛事管理' },
  },
  {
    path: 'school/matches/:id',
    name: 'school-match-detail',
    component: () => import('../school/pages/SchoolMatchDetail.vue'),
    meta: { title: '比赛运营', group: '比赛运营', permission: 'live:match:view', hidden: true },
  },
  {
    path: 'school/registrations',
    name: 'school-registrations',
    component: () => import('../school/pages/SchoolRegistrations.vue'),
    meta: { title: '本校报名', group: '赛事报名' },
  },
  {
    path: 'school/teams',
    name: 'school-teams',
    component: () => import('../school/pages/SchoolTeams.vue'),
    meta: { title: '本校球队', group: '学校管理' },
  },
  {
    path: 'school/personnel',
    name: 'school-personnel',
    component: () => import('../school/pages/SchoolPersonnel.vue'),
    meta: { title: '本校人员', group: '学校管理' },
  },
  {
    path: 'school/info',
    name: 'school-info',
    component: () => import('../school/pages/SchoolInfo.vue'),
    meta: { title: '本校信息', group: '学校管理' },
  },
  {
    path: 'school/usage-guide',
    name: 'school-usage-guide',
    component: () => import('../school/pages/UsageGuide.vue'),
    meta: { title: '使用说明', group: '帮助' },
  },
]

// 手机端上传：独立全屏页面，不套用管理端侧栏，现场用手机直接打开
export const schoolMobileRoute: RouteRecordRaw = {
  path: '/admin/school/mobile/:id',
  name: 'school-mobile-upload',
  component: () => import('../school/pages/SchoolMobileUpload.vue'),
  meta: { title: '手机端上传', permission: 'live:event:manage', schoolOnly: true },
}

/** 兼容旧地址：/school/... 统一跳到管理员端 /admin/school/... */
export const legacySchoolRedirect: RouteRecordRaw = {
  path: '/school/:pathMatch(.*)*',
  redirect: (to) => {
    const rest = to.path.replace(/^\/school/, '')
    return rest ? `/admin/school${rest}` : '/admin/school/dashboard'
  },
}
