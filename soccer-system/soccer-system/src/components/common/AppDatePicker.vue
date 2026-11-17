<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'

// 自研日期选择器：原生 <input type="date"> 的日历面板无法自定义样式，观感与主题脱节；
// 此组件提供与 AppSelect 一致观感的面板（周一起始、年/月切换、今日与选中高亮、可选范围限制、清空/今天）
const props = withDefaults(
  defineProps<{
    /** YYYY-MM-DD；空字符串或 undefined = 未选择 */
    modelValue?: string
    placeholder?: string
    /** 早于该日期（YYYY-MM-DD）不可选 */
    min?: string
    /** 晚于该日期（YYYY-MM-DD）不可选，如出生日期禁选未来 */
    max?: string
  }>(),
  { modelValue: '', placeholder: '请选择日期', min: '', max: '' },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

// 面板正在展示的年月
const now = new Date()
const viewYear = ref(now.getFullYear())
const viewMonth = ref(now.getMonth()) // 0-11

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'] // 周一起始

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function toStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

interface DayCell {
  date: string
  day: number
  inMonth: boolean
  isToday: boolean
  selected: boolean
  disabled: boolean
}

function makeCell(y: number, m: number, d: number, inMonth: boolean): DayCell {
  const date = toStr(y, m, d)
  return {
    date,
    day: d,
    inMonth,
    isToday: date === toStr(now.getFullYear(), now.getMonth(), now.getDate()),
    selected: props.modelValue === date,
    disabled: (props.min !== '' && date < props.min) || (props.max !== '' && date > props.max),
  }
}

// 当前面板的日历格子（周一起始，前后月补位到整周）
const cells = computed<DayCell[]>(() => {
  const y = viewYear.value
  const m = viewMonth.value
  const firstWeekday = (new Date(y, m, 1).getDay() + 6) % 7 // 周一=0
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const daysInPrev = new Date(y, m, 0).getDate()
  const list: DayCell[] = []
  const prevM = m === 0 ? 11 : m - 1
  const prevY = m === 0 ? y - 1 : y
  for (let i = firstWeekday - 1; i >= 0; i--) {
    list.push(makeCell(prevY, prevM, daysInPrev - i, false))
  }
  for (let d = 1; d <= daysInMonth; d++) {
    list.push(makeCell(y, m, d, true))
  }
  const nextM = m === 11 ? 0 : m + 1
  const nextY = m === 11 ? y + 1 : y
  let nextDay = 1
  while (list.length % 7 !== 0) {
    list.push(makeCell(nextY, nextM, nextDay++, false))
  }
  return list
})

const panelTitle = computed(() => `${viewYear.value} 年 ${viewMonth.value + 1} 月`)
const hasValue = computed(() => props.modelValue !== '' && props.modelValue !== undefined)
const display = computed(() => (hasValue.value ? props.modelValue : props.placeholder))

function prevYear() {
  viewYear.value--
}
function nextYear() {
  viewYear.value++
}
function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
}
function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
}

function toggle() {
  if (!open.value) {
    // 打开时定位到已选日期所在月份，未选则定位当月
    const base = props.modelValue || toStr(now.getFullYear(), now.getMonth(), now.getDate())
    const parts = base.split('-').map(Number)
    viewYear.value = parts[0] ?? now.getFullYear()
    viewMonth.value = (parts[1] ?? 1) - 1
  }
  open.value = !open.value
}

function pick(cell: DayCell) {
  if (cell.disabled) return
  emit('update:modelValue', cell.date)
  open.value = false
}

function pickToday() {
  const t = toStr(now.getFullYear(), now.getMonth(), now.getDate())
  if ((props.min !== '' && t < props.min) || (props.max !== '' && t > props.max)) return
  emit('update:modelValue', t)
  open.value = false
}

function clearValue() {
  emit('update:modelValue', '')
  open.value = false
}

// 点击组件外部或按 Esc 收起面板
function onDocPointerDown(e: PointerEvent) {
  if (root.value && !root.value.contains(e.target as Node)) {
    open.value = false
  }
}
onMounted(() => document.addEventListener('pointerdown', onDocPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointerDown))
</script>

<template>
  <div ref="root" class="app-date-picker" :class="{ open }">
    <button
      type="button"
      class="picker-trigger"
      :aria-expanded="open"
      aria-label="选择日期"
      @click="toggle"
      @keydown.esc="open = false"
    >
      <span class="picker-text" :class="{ placeholder: !hasValue }">{{ display }}</span>
      <AppIcon name="calendar" :size="15" class="picker-icon" />
    </button>

    <Transition name="drop">
      <div v-if="open" class="picker-panel" role="dialog" aria-label="日期选择面板">
        <div class="panel-head">
          <button type="button" class="nav-btn" aria-label="上一年" @click="prevYear">
            <AppIcon name="chevrons-left" :size="14" />
          </button>
          <button type="button" class="nav-btn" aria-label="上一月" @click="prevMonth">
            <AppIcon name="chevron-left" :size="14" />
          </button>
          <span class="panel-title">{{ panelTitle }}</span>
          <button type="button" class="nav-btn" aria-label="下一月" @click="nextMonth">
            <AppIcon name="chevron-right" :size="14" />
          </button>
          <button type="button" class="nav-btn" aria-label="下一年" @click="nextYear">
            <AppIcon name="chevrons-right" :size="14" />
          </button>
        </div>

        <div class="week-row">
          <span v-for="w in WEEK_LABELS" :key="w" class="week-label">{{ w }}</span>
        </div>

        <div class="day-grid">
          <button
            v-for="c in cells"
            :key="c.date"
            type="button"
            class="day-cell"
            :class="{ out: !c.inMonth, today: c.isToday && !c.selected, selected: c.selected, disabled: c.disabled }"
            :disabled="c.disabled"
            :aria-selected="c.selected"
            @click="pick(c)"
          >
            {{ c.day }}
          </button>
        </div>

        <div class="panel-foot">
          <button type="button" class="foot-btn" @click="clearValue">清空</button>
          <button type="button" class="foot-btn" @click="pickToday">今天</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.app-date-picker {
  position: relative;
  width: 100%;
}

.picker-trigger {
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

.app-date-picker.open .picker-trigger,
.picker-trigger:focus-visible {
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(30, 122, 63, 0.12);
  outline: none;
}

.picker-text.placeholder {
  color: var(--muted);
}

.picker-icon {
  color: var(--muted);
  flex-shrink: 0;
}

.picker-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 40;
  width: 288px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(20, 60, 40, 0.16);
  padding: 12px;
}

@media (max-width: 700px) {
  .picker-panel {
    width: min(288px, calc(100vw - 48px));
  }
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.panel-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--green-dark);
  letter-spacing: 1px;
}

.nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.nav-btn:hover {
  background: var(--green-light);
  color: var(--green-dark);
}

.week-row,
.day-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-top: 10px;
}

.week-label {
  text-align: center;
  font-size: 12px;
  color: var(--muted);
  padding: 4px 0;
}

.day-cell {
  height: 30px;
  border: none;
  background: none;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  color: var(--ink);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.day-cell:hover {
  background: var(--green-light);
  color: var(--green-dark);
}

.day-cell.out {
  color: #b9c4bc;
}

.day-cell.today {
  box-shadow: inset 0 0 0 1.5px var(--green);
  color: var(--green-dark);
  font-weight: 600;
}

.day-cell.selected,
.day-cell.selected:hover {
  background: var(--green);
  color: #fff;
  font-weight: 700;
}

.day-cell.disabled,
.day-cell.disabled:hover {
  color: #ccd5cf;
  text-decoration: line-through;
  cursor: not-allowed;
  background: none;
}

.panel-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  border-top: 1px dashed var(--line);
  padding-top: 8px;
}

.foot-btn {
  border: none;
  background: none;
  font-size: 12.5px;
  font-family: inherit;
  color: var(--muted);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
}

.foot-btn:hover {
  color: var(--green-dark);
  background: var(--green-light);
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
