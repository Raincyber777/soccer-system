import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../components/HomePage.vue'
import AuthPage from '../components/AuthPage.vue'
import { userRoutes } from './userRoutes'
import { useAuth, type UserPersona } from '../stores/auth'

// 总路由表：公开门户（首页/登录注册/新闻政策/赛程赛果/榜单）+ 用户端(/user)
// 管理端（管理员/超级管理员）拆分至独立项目 soccer-system-admin，登录入口完全分离
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
    // 门户公开浏览页：无需登录，游客可直接浏览（守卫只拦 /user 前缀）
    { path: '/news', name: 'portal-news', component: () => import('../components/portal/PortalNews.vue'), meta: { title: '新闻政策' } },
    { path: '/schedule', name: 'portal-schedule', component: () => import('../components/portal/PortalSchedule.vue'), meta: { title: '赛程赛果' } },
    { path: '/rankings', name: 'portal-rankings', component: () => import('../components/portal/PortalRankings.vue'), meta: { title: '赛事榜单' } },
    ...userRoutes,
    // 未匹配的路径统一回到首页
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// 动态权限拦截器：用户端按登录角色限制（仅 user），页面级再按 meta.personas
// （球队负责人/学生/教练）限制直达；管理端账号属于独立管理后台项目，此处不识别
router.beforeEach((to) => {
  const path = to.path
  const auth = useAuth()

  // 公共页面直接放行；已登录用户访问登录/注册页送回用户端工作台
  if (path === '/' || path === '/login' || path === '/register') {
    if (path !== '/' && auth.state.role) {
      // 残留的管理端登录态属于管理后台项目，在本项目里直接清除
      if (auth.state.role === 'user') return '/user/dashboard'
      auth.logout()
    }
    return true
  }

  if (path.startsWith('/user')) {
    if (auth.state.role !== 'user') return '/login'
    // 用户端内的身份限制：不满足 meta.personas 的页面回工作台
    const personas = to.meta.personas as UserPersona[] | undefined
    if (personas && (!auth.state.persona || !personas.includes(auth.state.persona))) {
      return '/user/dashboard'
    }
  }

  return true
})

// 标签页标题随路由变化：用户端与公开页的路由都带 meta.title（菜单名），首页等无 meta 的用默认标题
const DEFAULT_TITLE = '绿茵汇 · 省级中小学足球赛事平台'
router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} · 绿茵汇` : DEFAULT_TITLE
})

export default router
