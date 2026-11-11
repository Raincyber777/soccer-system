<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'

// 自研下拉选择：原生 <select> 的弹出面板无法自定义样式，观感生硬；
// 此组件对齐成熟组件库的交互观感（展开动画、悬停高亮、选中态、箭头旋转），样式贴合主题
const props = defineProps<{
  /** 允许 undefined：调用方常以 Record 索引取值（noUncheckedIndexedAccess 下为 string | undefined） */
  modelValue?: string
  options: string[]
  placeholder?: string
  /** 有值时在菜单顶部显示一个清空选项（如搜索栏的「全部」），点击后置空 */
  clearText?: string
  /** 紧凑尺寸（搜索栏等小空间场景） */
  compact?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function toggle() {
  open.value = !open.value
}

function choose(option: string) {
  emit('update:modelValue', option)
  open.value = false
}

// 点击组件外部时收起面板
function onDocPointerDown(e: PointerEvent) {
  if (root.value && !root.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('pointerdown', onDocPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointerDown))

const current = computed(() => props.modelValue ?? '')
const hasValue = computed(() => current.value !== '')
const display = computed(() => (hasValue.value ? current.value : (props.placeholder ?? '请选择')))
</script>

<template>
  <div ref="root" class="app-select" :class="{ open, compact }">
    <button
      type="button"
      class="select-trigger"
      :aria-expanded="open"
      :aria-label="placeholder ?? '下拉选择'"
      @click="toggle"
      @keydown.esc="open = false"
    >
      <span class="select-text" :class="{ placeholder: !hasValue }">{{ display }}</span>
      <AppIcon name="chevron-down" :size="15" class="select-chevron" />
    </button>
    <Transition name="drop">
      <ul v-if="open" class="select-menu" role="listbox">
        <li
          v-if="clearText !== undefined"
          class="select-option clear-option"
          role="option"
          :aria-selected="!hasValue"
          @click="choose('')"
        >
          {{ clearText }}
        </li>
        <li
          v-for="option in options"
          :key="option"
          class="select-option"
          :class="{ selected: option === current }"
          role="option"
          :aria-selected="option === current"
          @click="choose(option)"
        >
          {{ option }}
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.app-select {
  position: relative;
  width: 100%;
}

.select-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border: 1.5px solid #d8e2da;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  font-family: inherit;
  color: var(--ink);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.app-select.open .select-trigger,
.select-trigger:focus-visible {
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(30, 122, 63, 0.12);
  outline: none;
}

.app-select.compact .select-trigger {
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
}

.select-text.placeholder {
  color: var(--muted);
}

.select-chevron {
  color: var(--muted);
  flex-shrink: 0;
  transition: transform 0.2s;
}

.app-select.open .select-chevron {
  transform: rotate(180deg);
}

.select-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 30;
  margin: 0;
  padding: 6px;
  list-style: none;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(20, 60, 40, 0.16);
  max-height: 264px;
  overflow-y: auto;
}

.select-option {
  padding: 9px 10px;
  border-radius: 7px;
  font-size: 14px;
  color: var(--ink);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.app-select.compact .select-option {
  padding: 7px 9px;
  font-size: 13px;
}

.select-option:hover {
  background: var(--green-light);
  color: var(--green-dark);
}

.select-option.selected {
  background: var(--green-light);
  color: var(--green);
  font-weight: 600;
}

.select-option.clear-option {
  color: var(--muted);
  border-bottom: 1px dashed var(--line);
  margin-bottom: 2px;
}

/* 面板展开收起动画 */
.drop-enter-active,
.drop-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.drop-enter-from,
.drop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
