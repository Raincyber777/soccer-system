import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../components/HomePage.vue'
import AuthPage from '../components/AuthPage.vue'
import { userRoutes } from './userRoutes'
import { adminRoutes } from './adminRoutes'
import { superRoutes } from './superRoutes'
import { useAuth, type UserRole, type UserPersona } from '../stores/auth'

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
    {
      path: '/login',
      name: 'login',
      component: AuthPage, // 登录注册页（登录/注册写在同一张卡片，用标签页切换）
      meta: { title: '登录' },
    },
    {
      path: '/register',
      name: 'register',
      component: AuthPage, // 同上，进入时默认显示注册标签
      meta: { title: '注册' },
    },
    // 门户公开浏览页：无需登录，游客可直接浏览（守卫只拦 /user /admin /super 前缀）
    { path: '/news', name: 'portal-news', component: () => import('../components/portal/PortalNews.vue'), meta: { title: '新闻政策' } },
    { path: '/schedule', name: 'portal-schedule', component: () => import('../components/portal/PortalSchedule.vue'), meta: { title: '赛程赛果' } },
    { path: '/rankings', name: 'portal-rankings', component: () => import('../components/portal/PortalRankings.vue'), meta: { title: '赛事榜单' } },
    ...userRoutes,
    ...adminRoutes,
    ...superRoutes,
    // 未匹配的路径统一回到首页
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// 动态权限拦截器：按路径前缀判断所属端，与登录角色不匹配一律回登录页；
// 用户端再按 meta.personas（球队负责人/学生/教练）限制页面直达
router.beforeEach((to) => {
  const path = to.path
  const auth = useAuth()

  // 公共页面直接放行；已登录时访问登录/注册页则送回对应端的工作台
  if (path === '/' || path === '/login' || path === '/register') {
    if (path !== '/' && auth.state.role) {
      return auth.state.role === 'super'
        ? '/super/dashboard'
        : auth.state.role === 'admin'
          ? '/admin/dashboard'
          : '/user/dashboard'
    }
    return true
  }

  const requiredRole: UserRole | null = path.startsWith('/user')
    ? 'user'
    : path.startsWith('/admin')
      ? 'admin'
      : path.startsWith('/super')
        ? 'super'
        : null

  if (!requiredRole) return true
  if (auth.state.role !== requiredRole) return '/login'

  // 用户端内的身份限制：不满足 meta.personas 的页面回工作台
  if (requiredRole === 'user') {
    const personas = to.meta.personas as UserPersona[] | undefined
    if (personas && (!auth.state.persona || !personas.includes(auth.state.persona))) {
      return '/user/dashboard'
    }
  }

  return true
})

// 标签页标题随路由变化：三端与公开页的路由都带 meta.title（菜单名），首页等无 meta 的用默认标题
const DEFAULT_TITLE = '绿茵汇 · 省级中小学足球赛事平台'
router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} · 绿茵汇` : DEFAULT_TITLE
})

export default router
