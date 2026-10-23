<script setup lang="ts">
import type { RouteRecordRaw } from 'vue-router'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { userRoutes } from '../../routers/userRoutes'
import { useAuth, personaLabels } from '../../stores/auth'
import AppIcon from '../../components/common/AppIcon.vue'
import SideNav from '../../components/common/SideNav.vue'

const router = useRouter()
const auth = useAuth()

function handleLogout() {
  auth.logout()
  router.push('/')
}

// 从路由配置里读出菜单，保证菜单和路由只有一份配置来源
const children = (userRoutes[0]?.children ?? []) as RouteRecordRaw[]

interface MenuItem {
  path: string
  title: string
}
interface MenuGroup {
  label: string
  items: MenuItem[]
}

// 按当前登录身份过滤菜单：meta.personas 限定身份（球队负责人/学生/教练），不填 = 所有身份可见
const groups = computed<MenuGroup[]>(() => {
  const result: MenuGroup[] = []
  for (const child of children) {
    const personas = child.meta?.personas as string[] | undefined
    if (personas && (!auth.state.persona || !personas.includes(auth.state.persona))) {
      continue
    }
    const label = String(child.meta?.group ?? '功能')
    const item: MenuItem = {
      path: `/user/${child.path}`,
      title: String(child.meta?.title ?? String(child.name)),
    }
    const group = result.find((g) => g.label === label)
    if (group) {
      group.items.push(item)
    } else {
      result.push({ label, items: [item] })
    }
  }
  return result
})

// 顶栏：端标签旁显示身份 pill；右侧只显示账号，避免身份重复展示
const personaLabel = computed(() => (auth.state.persona ? personaLabels[auth.state.persona] : '球队负责人'))
</script>

<template>
  <div class="layout">
    <header class="topbar">
      <div class="topbar-inner">
        <router-link to="/" class="brand">
          <span class="brand-main">
            <AppIcon name="ball" :size="20" class="brand-ball" />
            绿茵汇
          </span>
          <span class="brand-tag user-tag">用户端</span>
          <span class="brand-identity">{{ personaLabel }}</span>
        </router-link>
        <div class="topbar-right">
          <span class="user-name">
            <AppIcon name="user" :size="15" />
            当前用户：{{ auth.state.account || personaLabel }}
          </span>
          <a href="/" class="exit-link" @click.prevent="handleLogout">退出系统</a>
        </div>
      </div>
    </header>

    <div class="layout-body">
      <SideNav :groups="groups" variant="user" />

      <main class="main-area">
        <router-view v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.topbar {
  /* 半透明毛玻璃顶栏：滚动时内容从底下穿过更通透 */
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(10px) saturate(1.3);
  -webkit-backdrop-filter: blur(10px) saturate(1.3);
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 0;
  z-index: 10;
}

.topbar-inner {
  height: 56px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 800;
  color: var(--green-dark);
  letter-spacing: 1px;
}

.brand-tag {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 999px;
  letter-spacing: 2px;
}

.user-tag {
  background: var(--green-light);
  color: var(--green-dark);
}

.brand-identity {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid #cfe0d3;
  background: #fff;
  color: var(--green-dark);
  letter-spacing: 0.5px;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 18px;
}

.user-name {
  font-size: 13px;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.exit-link {
  font-size: 13px;
  color: var(--green);
  font-weight: 600;
}

.exit-link:hover {
  text-decoration: underline;
}

.layout-body {
  flex: 1;
  display: flex;
  align-items: stretch;
}

.main-area {
  flex: 1;
  min-width: 0;
  padding: 24px;
}

/* 页面切换：轻微上浮淡入（mode out-in 避免新旧页面重叠跳动） */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: none;
  }
}

@media (max-width: 900px) {
  .user-name {
    display: none;
  }
}

@media (max-width: 600px) {
  .brand-identity {
    display: none;
  }
}
</style>
