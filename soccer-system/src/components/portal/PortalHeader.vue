<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../../stores/auth'
import AppIcon from '../common/AppIcon.vue'
import AppModal from '../common/AppModal.vue'

// 门户公共头部：品牌、导航、登录区 + 功能说明弹窗，门户首页与公开浏览页共用
// 三个说明弹窗由头部自己持有：导航直接打开，首页 hero 按钮可通过 ref 调 openModal

type ModalKey = 'registration' | 'team' | 'publicity'

interface NavItem {
  label: string
  to?: string // 页面跳转项
  modal?: ModalKey // 弹窗项
}

const route = useRoute()
const auth = useAuth()

const navItems: NavItem[] = [
  { label: '首页', to: '/' },
  { label: '新闻政策', to: '/news' },
  { label: '赛程赛果', to: '/schedule' },
  { label: '榜单', to: '/rankings' },
  { label: '赛事报名', modal: 'registration' },
  { label: '球队管理', modal: 'team' },
  { label: '信息公示', modal: 'publicity' },
]

// 已登录用户右侧换成「进入工作台」，未登录显示登录 / 注册
const workbenchPath = computed(() => {
  if (auth.state.role === 'super') return '/super/dashboard'
  if (auth.state.role === 'admin') return '/admin/dashboard'
  if (auth.state.role) return '/user/dashboard'
  return ''
})

const activeModal = ref<ModalKey | null>(null)
const mobileOpen = ref(false)

// 路由变化时收起移动端菜单
watch(
  () => route.path,
  () => {
    mobileOpen.value = false
  },
)

function openModal(key: ModalKey) {
  activeModal.value = key
}

// 点当前页导航时回到顶部（同路径 router-link 不会再触发跳转）
function onNavClick(item: NavItem) {
  if (item.to && route.path === item.to) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// 移动端菜单选择：先收起面板，弹窗项直接打开
function mobileSelect(item: NavItem) {
  mobileOpen.value = false
  if (item.modal) {
    openModal(item.modal)
    return
  }
  if (item.to && route.path === item.to) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

defineExpose({ openModal })
</script>

<template>
  <header class="navbar">
    <div class="nav-inner">
      <router-link to="/" class="brand">
        <AppIcon name="ball" :size="24" class="brand-ball" />
        <span class="brand-name">绿茵汇</span>
      </router-link>

      <nav class="nav-links">
        <template v-for="item in navItems" :key="item.label">
          <router-link
            v-if="item.to"
            :to="item.to"
            class="nav-link"
            :class="{ active: route.path === item.to }"
            @click="onNavClick(item)"
          >
            {{ item.label }}
          </router-link>
          <span v-else class="nav-link" @click="item.modal && openModal(item.modal)">
            {{ item.label }}
          </span>
        </template>
      </nav>

      <button
        type="button"
        class="menu-toggle"
        :aria-expanded="mobileOpen"
        aria-label="打开菜单"
        @click="mobileOpen = !mobileOpen"
      >
        <AppIcon :name="mobileOpen ? 'x' : 'menu'" :size="20" />
      </button>

      <div class="nav-actions">
        <router-link v-if="workbenchPath" :to="workbenchPath" class="btn btn-primary">进入工作台</router-link>
        <template v-else>
          <router-link to="/login" class="btn btn-ghost">登录</router-link>
          <router-link to="/register" class="btn btn-primary">注册</router-link>
        </template>
      </div>

      <Transition name="drop">
        <nav v-if="mobileOpen" class="mobile-nav">
          <template v-for="item in navItems" :key="item.label">
            <router-link
              v-if="item.to"
              :to="item.to"
              class="mobile-link"
              :class="{ active: route.path === item.to }"
              @click="mobileSelect(item)"
            >
              {{ item.label }}
            </router-link>
            <span v-else class="mobile-link" @click="mobileSelect(item)">{{ item.label }}</span>
          </template>
        </nav>
      </Transition>
    </div>
  </header>

  <!-- 功能入口弹窗：访客先了解流程，再引导登录 / 注册 -->
  <AppModal :open="activeModal === 'registration'" title="赛事报名" @close="activeModal = null">
    <p class="modal-lead">从组队到出赛的完整流程：</p>
    <ol class="flow-list">
      <li>球队负责人注册 / 登录，按学校标识码绑定所属学校</li>
      <li>在线填报赛事报名表，批量报送球员信息与照片</li>
      <li>上传盖章报名表、学籍验证等报名材料</li>
      <li>市州管理员初审 → 省级终审，审核进度实时可查</li>
      <li>审核通过进入公示，正式参赛</li>
    </ol>
    <p class="modal-tip">
      参赛组别：小学组 / 中学组 / 高中组 / 高校组（随学校学段自动限定）。
      报名属球队级操作，由球队负责人统一办理；队员可在「我的报名」查看进度。
    </p>
    <template #footer>
      <router-link to="/register" class="btn btn-ghost">去注册</router-link>
      <router-link to="/login" class="btn btn-primary">去登录</router-link>
    </template>
  </AppModal>

  <AppModal :open="activeModal === 'team'" title="球队与人员管理" @close="activeModal = null">
    <p class="modal-lead">球队与人员的日常维护：</p>
    <ul class="flow-list">
      <li>球队信息：绑定学校、参赛组别、队旗队徽与球队资料</li>
      <li>球员管理：负责人批量报送球员信息，运动员注册个人信息</li>
      <li>教练员：申报资质并上传等级证书，审核通过后带队参赛</li>
      <li>报名资料：盖章件导出与学籍验证材料上传</li>
    </ul>
    <p class="modal-tip">球队资料由球队负责人维护；运动员、教练员使用各自账号注册并维护个人信息。</p>
    <template #footer>
      <router-link to="/register" class="btn btn-ghost">去注册</router-link>
      <router-link to="/login" class="btn btn-primary">去登录</router-link>
    </template>
  </AppModal>

  <AppModal :open="activeModal === 'publicity'" title="信息公示" @close="activeModal = null">
    <p class="modal-lead">以下信息全部公开，无需登录即可浏览：</p>
    <ul class="flow-list">
      <li>赛程对阵与比赛结果（赛程赛果页）</li>
      <li>新闻动态与政策文件（新闻政策页）</li>
      <li>组别积分榜与射手榜（榜单页）</li>
    </ul>
    <p class="modal-tip">点击下方按钮直达对应公示页面；登录后可在用户端查看报名进度等个人信息。</p>
    <template #footer>
      <router-link to="/news" class="btn btn-ghost">新闻政策</router-link>
      <router-link to="/schedule" class="btn btn-ghost">赛程赛果</router-link>
      <router-link to="/rankings" class="btn btn-primary">赛事榜单</router-link>
    </template>
  </AppModal>
</template>

<style scoped>
.navbar {
  position: relative;
  background: #fff;
  border-bottom: 1px solid var(--line);
}

.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 22px;
  font-weight: 800;
  color: var(--green-dark);
  letter-spacing: 2px;
}

.brand-ball {
  color: var(--green);
}

.nav-links {
  display: flex;
  gap: 26px;
}

.nav-link {
  font-size: 15px;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.2s;
}

.nav-link:hover {
  color: var(--green);
}

.nav-link.active {
  color: var(--green);
  font-weight: 700;
}

.nav-actions {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 8px 22px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.6;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-ghost {
  border: 1.5px solid var(--green);
  color: var(--green);
}

.btn-ghost:hover {
  background: var(--green-light);
  border-color: var(--green-dark);
}

.btn-primary {
  background: var(--green-dark);
  color: #fff;
  border: 1.5px solid var(--green-dark);
  box-shadow: 0 2px 8px rgba(15, 47, 32, 0.18);
}

.btn-primary:hover {
  background: var(--green-deeper);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 47, 32, 0.25);
}

/* ===== 功能入口弹窗内容 ===== */
.modal-lead {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.flow-list {
  margin: 10px 0 0;
  padding-left: 20px;
  display: grid;
  gap: 8px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--muted);
}

.modal-tip {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--green-light);
  font-size: 13px;
  line-height: 1.7;
  color: var(--green-dark);
}

.menu-toggle {
  display: none;
}

@media (max-width: 900px) {
  .nav-links {
    display: none;
  }

  .menu-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: #fff;
    color: var(--green-dark);
    cursor: pointer;
  }

  /* 下拉式移动端菜单：盖在页面内容上，路由变化或选择后自动收起 */
  .mobile-nav {
    position: absolute;
    top: 64px;
    left: 0;
    right: 0;
    z-index: 30;
    background: #fff;
    border-bottom: 1px solid var(--line);
    box-shadow: 0 18px 30px rgba(15, 47, 32, 0.12);
    display: flex;
    flex-direction: column;
    padding: 10px 18px 14px;
  }

  .mobile-link {
    padding: 12px;
    border-radius: 10px;
    font-size: 15px;
    color: var(--ink);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .mobile-link:hover,
  .mobile-link.active {
    background: var(--green-light);
    color: var(--green-dark);
  }
}

.drop-enter-active,
.drop-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.drop-enter-from,
.drop-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (prefers-reduced-motion: reduce) {
  .drop-enter-active,
  .drop-leave-active {
    transition: none;
  }
}
</style>
