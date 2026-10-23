<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from './AppIcon.vue'

// 三端共用的可折叠侧边栏：菜单分组由各布局从路由 meta 生成后传入
// 折叠规则：同一时间只展开一个分组，进入新页面时自动展开该页所在的分组，
// 避免菜单全部平铺把页面撑出一大段空白；只有一个页面的分组直接渲染成菜单项
interface MenuItem {
  path: string
  title: string
}
interface MenuGroup {
  label: string
  items: MenuItem[]
}

const props = withDefaults(
  defineProps<{
    groups: MenuGroup[]
    variant?: 'admin' | 'super' | 'user'
  }>(),
  { variant: 'admin' },
)

const route = useRoute()
const openLabel = ref<string | null>(null)

function toggle(label: string) {
  openLabel.value = openLabel.value === label ? null : label
}

watch(
  () => route.path,
  (path) => {
    openLabel.value = props.groups.find((g) => g.items.some((i) => i.path === path))?.label ?? null
  },
  { immediate: true },
)
</script>

<template>
  <aside class="sidebar" :class="`variant-${variant}`">
    <div class="side-scroll">
      <template v-for="g in groups" :key="g.label">
        <!-- 只有一个页面的分组直接显示成菜单项，不再套一层分组标题 -->
        <router-link v-if="g.items.length === 1 && g.items[0]" :to="g.items[0].path" class="menu-item">
          {{ g.items[0].title }}
        </router-link>
        <div v-else class="menu-group">
          <button
            type="button"
            class="group-toggle"
            :aria-expanded="openLabel === g.label"
            @click="toggle(g.label)"
          >
            <span>{{ g.label }}</span>
            <AppIcon
              name="chevron-down"
              :size="14"
              class="chevron"
              :class="{ open: openLabel === g.label }"
            />
          </button>
          <div class="group-items" :class="{ closed: openLabel !== g.label }">
            <div class="group-clip">
              <router-link
                v-for="item in g.items"
                :key="item.path"
                :to="item.path"
                class="menu-item"
              >
                {{ item.title }}
              </router-link>
            </div>
          </div>
        </div>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 216px;
  flex-shrink: 0;
}

/* 菜单本体吸附在顶栏下方，超出视口时侧栏内部滚动，不再把整个页面撑高 */
.side-scroll {
  position: sticky;
  top: 56px;
  max-height: calc(100vh - 56px);
  overflow-y: auto;
  padding: 18px 12px 28px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
}

/* 相邻分组 / 独立菜单项之间留出间距 */
.side-scroll > * + * {
  margin-top: 14px;
}

/* 管理端（默认）：深绿底（纵向渐变增加层次） */
.variant-admin {
  background: linear-gradient(180deg, #123a27, var(--green-deeper));
}

/* 超管端：更深绿底 + 金色高亮 */
.variant-super {
  background: linear-gradient(180deg, #0d2b1f, #081d14);
}

.variant-super .menu-item.router-link-active {
  background: linear-gradient(135deg, #b98a1c, #d3a52e);
  box-shadow: 0 4px 12px rgba(185, 138, 28, 0.35);
}

/* 用户端：白底 */
.variant-user {
  background: #fff;
  border-right: 1px solid var(--line);
}

.variant-user .side-scroll {
  scrollbar-color: rgba(30, 122, 63, 0.3) transparent;
}

/* 分组标题用白色粗体（用户端为深色粗体），比组内菜单项更醒目，层级一目了然 */
.group-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  border-radius: 8px;
  transition: background 0.15s, color 0.15s;
}

.group-toggle:hover {
  background: rgba(255, 255, 255, 0.08);
}

.group-toggle:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.45);
  outline-offset: 2px;
}

.variant-user .group-toggle {
  color: var(--ink);
}

.variant-user .group-toggle:hover {
  background: var(--green-light);
  color: var(--green-dark);
}

.variant-user .group-toggle:focus-visible {
  outline-color: rgba(30, 122, 63, 0.45);
}

.chevron {
  transition: transform 0.2s;
  opacity: 0.75;
}

.chevron.open {
  transform: rotate(180deg);
}

/* 用 grid-template-rows 0fr/1fr 过渡实现展开收起的高度动画 */
.group-items {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.22s ease;
}

.group-items.closed {
  grid-template-rows: 0fr;
}

.group-clip {
  overflow: hidden;
  min-height: 0;
}

/* 组内菜单项缩进，和粗体的分组标题拉开层级 */
.group-clip .menu-item {
  padding-left: 24px;
}

.group-clip .menu-item + .menu-item {
  margin-top: 2px;
}

.menu-item {
  display: block;
  padding: 10px 12px;
  border-radius: 9px;
  font-size: 14px;
  color: #d5e4da;
  transition: background 0.15s, color 0.15s;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.menu-item.router-link-active {
  background: var(--grad-green);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(30, 122, 63, 0.35);
}

.variant-user .menu-item {
  color: var(--ink);
}

.variant-user .menu-item:hover {
  background: var(--green-light);
  color: var(--green-dark);
}

/* 用户端白底下的选中态：同款绿色渐变，白字才够对比 */
.variant-user .menu-item.router-link-active {
  color: #fff;
}

@media (prefers-reduced-motion: reduce) {
  .group-items,
  .chevron {
    transition: none;
  }
}

@media (max-width: 900px) {
  .sidebar {
    width: 170px;
  }
}
</style>
