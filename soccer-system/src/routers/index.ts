import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../components/HomePage.vue'

// 路由表：后续新增页面就在这里加一条即可
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage, // 首页
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../components/LoginPage.vue'), // 登录页（懒加载）
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../components/RegisterPage.vue'), // 注册页（懒加载）
    },
  ],
})

export default router
