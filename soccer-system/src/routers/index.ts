import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../components/HomePage.vue'
import AuthPage from '../components/AuthPage.vue'
import { userRoutes } from './userRoutes'
import { adminRoutes } from './adminRoutes'
import { superRoutes } from './superRoutes'
import { schoolMobileRoute, legacySchoolRedirect } from './schoolRoutes'
import { useAuth, type UserRole, type UserPersona } from '../stores/auth'
import type { LoginEntry } from '../api'

// 总路由表：公共页面 + 用户端(/user) + 管理员端(/admin) + 超级管理员端(/super)
// 各端页面较多，全部使用懒加载，访问时才加载对应页面
const router = createRouter({
  history: createWebHistory(),
  // 路由切换后回到页面顶部（门户多页浏览需要）
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage, // 门户首页
    },
    // 两入口登录：普通用户与管理员完全拆分；
    // 管理员入口由普通管理员和超级管理员共用，登录后按角色进入各自工作台
    {
      path: '/login',
      name: 'login',
      component: AuthPage,
      meta: { title: '用户登录', entry: 'user' },
    },
    {
      path: '/register',
      name: 'register',
      component: AuthPage, // 用户端注册，进入时默认显示注册标签
      meta: { title: '用户注册', entry: 'user' },
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: AuthPage,
      meta: { title: '管理员登录', entry: 'admin' },
    },
    // 旧超管登录地址保留兼容，统一回到管理员入口
    { path: '/super/login', redirect: '/admin/login' },
    // 门户公开浏览页：无需登录，游客可直接浏览（守卫只拦 /user /admin /super 前缀）
    { path: '/news', name: 'portal-news', component: () => import('../components/portal/PortalNews.vue'), meta: { title: '新闻政策' } },
    { path: '/schedule', name: 'portal-schedule', component: () => import('../components/portal/PortalSchedule.vue'), meta: { title: '赛程赛果' } },
    { path: '/rankings', name: 'portal-rankings', component: () => import('../components/portal/PortalRankings.vue'), meta: { title: '赛事榜单' } },
    // 比赛详情：公开端已确认进球记录（免登）
    { path: '/matches/:id', name: 'portal-match-detail', component: () => import('../components/portal/MatchDetail.vue'), meta: { title: '比赛详情' } },
    ...userRoutes,
    ...adminRoutes,
    ...superRoutes,
    schoolMobileRoute,
    // 旧校级端地址兼容：统一跳转到管理员端 /admin/school/...
    legacySchoolRedirect,
    // 未匹配的路径统一回到首页
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// 登录入口与工作台映射：用户端走 /login；校级、普通、超管共用 /admin/login
const PORTAL_LOGIN: Record<UserRole, string> = {
  user: '/login',
  admin: '/admin/login',
  super: '/admin/login',
  school: '/admin/login',
}
const PORTAL_DASHBOARD: Record<UserRole, string> = {
  user: '/user/dashboard',
  admin: '/admin/dashboard',
  super: '/super/dashboard',
  school: '/admin/school/dashboard',
}

const ADMIN_ROLES: UserRole[] = ['admin', 'super', 'school']

// 动态权限拦截器：按路径前缀判断所属端，未登录回本端登录页；
// 已登录访问其他端的受保护页则送回自己的工作台，避免跨端串页；
// 校级管理员进入管理员端，但只能访问 /admin/school 下的本校页面
router.beforeEach(async (to) => {
  const path = to.path
  const auth = useAuth()

  // 先恢复登录态：会话由认证接口校验令牌后回填，路由守卫不再信任可被篡改的本地 role 字段
  await auth.restore()
  const role = auth.state.role

  // 登录 / 注册页：已登录用户只能回到自己的工作台；
  // 普通用户即使猜到管理员登录地址，也不会看到其他入口的登录页
  const entry = to.meta.entry as LoginEntry | undefined
  if (entry) {
    if (!role) return true
    return PORTAL_DASHBOARD[role]
  }

  const isAdminArea = path.startsWith('/admin')
  const isSchoolArea = path.startsWith('/admin/school')

  if (isAdminArea) {
    if (!role) return PORTAL_LOGIN.admin
    if (!ADMIN_ROLES.includes(role)) return PORTAL_DASHBOARD[role]
    // 校级账号不能访问管理端其他页面；普通/超管也不能进入校级专属页面
    if (role === 'school' && !isSchoolArea) return PORTAL_DASHBOARD.school
    if (role !== 'school' && isSchoolArea) return PORTAL_DASHBOARD[role]
  }

  const requiredRole: UserRole | null = path.startsWith('/user')
    ? 'user'
    : path.startsWith('/super')
      ? 'super'
      : null

  if (requiredRole) {
    if (!role) return PORTAL_LOGIN[requiredRole]
    if (role !== requiredRole) return PORTAL_DASHBOARD[role]
  }

  // 路由级角色标记：superOnly 页面只允许超级管理员直达
  if (to.meta.superOnly && role !== 'super') return PORTAL_DASHBOARD[role ?? 'user']

  // 校级页面按权限点放行：缺少权限的页面回到校级工作台
  const permission = to.meta.permission as string | undefined
  if (role === 'school' && permission && !auth.state.permissions.includes(permission)) {
    return PORTAL_DASHBOARD.school
  }

  // 用户端内的身份限制：不满足 meta.personas 的页面回工作台
  if (requiredRole === 'user') {
    const personas = to.meta.personas as UserPersona[] | undefined
    if (personas && (!auth.state.persona || !personas.includes(auth.state.persona))) {
      return '/user/dashboard'
    }
  }

  return true
})

// 标签页标题随路由变化：各工作台与公开页的路由都带 meta.title（菜单名），首页等无 meta 的用默认标题
const DEFAULT_TITLE = '绿茵汇 · 省级中小学足球赛事平台'
router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} · 绿茵汇` : DEFAULT_TITLE
})

export default router
