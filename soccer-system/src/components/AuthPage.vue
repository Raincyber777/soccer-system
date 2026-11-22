<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'
import AppIcon from './common/AppIcon.vue'
import LoginForm from './auth/LoginForm.vue'
import RegisterForm from './auth/RegisterForm.vue'

// 统一登录/注册页：卡片外壳 + 登录/注册标签页，表单逻辑分别在 LoginForm / RegisterForm 中
const route = useRoute()
const router = useRouter()

// /register 路径进来时默认显示注册页；点击标签同步路由，刷新/分享不丢状态
type Tab = 'login' | 'register'
const activeTab = ref<Tab>(route.path === '/register' ? 'register' : 'login')
watch(
  () => route.path,
  (p) => {
    activeTab.value = p === '/register' ? 'register' : 'login'
  },
)
watch(activeTab, (tab) => {
  const target = tab === 'register' ? '/register' : '/login'
  if (route.path !== target) router.replace(target)
})
</script>

<template>
  <div class="auth-page">
    <!-- 页面左上角：返回门户首页 -->
    <router-link to="/" class="auth-back" aria-label="返回首页">
      <AppIcon name="chevron-left" :size="16" />
      返回首页
    </router-link>

    <div class="auth-card">
      <!-- 顶部：品牌 -->
      <div class="auth-head">
        <router-link to="/" class="auth-brand">
          <AppIcon name="ball" :size="22" class="brand-ball" />
          绿茵汇
        </router-link>
      </div>

      <!-- 登录 / 注册标签页 -->
      <div class="auth-tabs">
        <button
          type="button"
          class="auth-tab"
          :class="{ active: activeTab === 'login' }"
          @click="activeTab = 'login'"
        >
          登录
        </button>
        <button
          type="button"
          class="auth-tab"
          :class="{ active: activeTab === 'register' }"
          @click="activeTab = 'register'"
        >
          注册
        </button>
      </div>

      <LoginForm v-if="activeTab === 'login'" />
      <RegisterForm v-else />
    </div>

    <!-- 背景装饰的大足球（线性图标，低透明度） -->
    <div class="bg-ball" aria-hidden="true">
      <AppIcon name="ball" :size="420" :stroke-width="1.2" />
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100%;
  background: linear-gradient(135deg, var(--green-deeper), var(--green) 130%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  position: relative;
  overflow: hidden;
}

/* 背景流动光雾：亮绿光斑在深绿底上缓慢漂移 */
.auth-page::before,
.auth-page::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  pointer-events: none;
  will-change: transform;
}

.auth-page::before {
  width: 520px;
  height: 520px;
  left: -120px;
  top: -140px;
  background: radial-gradient(circle, rgba(120, 220, 160, 0.16), transparent 66%);
  animation: auth-glow-a 40s ease-in-out infinite alternate;
}

.auth-page::after {
  width: 460px;
  height: 460px;
  right: -110px;
  bottom: -150px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.09), transparent 64%);
  animation: auth-glow-b 52s ease-in-out infinite alternate;
}

@keyframes auth-glow-a {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(160px, 110px) scale(1.14); }
  100% { transform: translate(70px, -60px) scale(0.95); }
}

@keyframes auth-glow-b {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-140px, -90px) scale(1.1); }
  100% { transform: translate(-50px, 100px) scale(0.92); }
}

@media (prefers-reduced-motion: reduce) {
  .auth-page::before,
  .auth-page::after {
    animation: none;
  }
}


/* 左上角返回门户首页 */
.auth-back {
  position: absolute;
  top: 22px;
  left: 22px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 9px 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  font-size: 14px;
  backdrop-filter: blur(4px);
  transition: background 0.2s;
  z-index: 2;
}

.auth-back:hover {
  background: rgba(255, 255, 255, 0.26);
}

/* 背景装饰的大足球（线性图标） */
.bg-ball {
  position: absolute;
  right: -70px;
  bottom: -90px;
  color: #fff;
  opacity: 0.06;
  pointer-events: none;
  line-height: 0;
}

.auth-card {
  width: min(460px, 100%);
  background: #fff;
  border-radius: 16px;
  padding: 32px 36px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  position: relative;
  z-index: 1;
}

.auth-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.auth-brand {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 20px;
  font-weight: 800;
  color: var(--green-dark);
  letter-spacing: 2px;
}

.brand-ball {
  color: var(--green);
}

/* 标签页 */
.auth-tabs {
  display: flex;
  gap: 28px;
  margin-top: 20px;
  border-bottom: 1px solid var(--line);
}

.auth-tab {
  background: none;
  border: none;
  padding: 10px 2px;
  font-size: 16px;
  color: var(--muted);
  cursor: pointer;
  border-bottom: 3px solid transparent;
  margin-bottom: -1px;
  transition: color 0.2s, border-color 0.2s;
}

.auth-tab.active {
  color: var(--ink);
  font-weight: 700;
  border-bottom-color: var(--green-dark);
}

</style>
