<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TableColumn } from './types'

// 通用数据表格：传入列配置和行数据即可，状态列自动渲染成彩色标签
// 超过 pageSize 行自动出现分页器（纯前端分页，接入后端后可换成接口分页）
const props = withDefaults(
  defineProps<{
    columns: TableColumn[]
    rows: Record<string, unknown>[]
    actions?: string[]
    pageSize?: number
  }>(),
  { pageSize: 10 },
)

const emit = defineEmits<{
  (e: 'action', action: string, row: Record<string, unknown>): void
}>()

const OK_WORDS = ['已通过', '已发布', '已上架', '已生效', '已核验', '已归档', '已公示', '已结束']
const PENDING_WORDS = ['待审核', '待初审', '待终审', '待市州初审', '待省级终审', '审核中', '报名中', '进行中', '待核验', '未开始', '直播中', '已延期']
const FAIL_WORDS = ['已驳回', '未通过', '已下架', '已删除', '已失效', '已禁用']

function isStatusColumn(label: string) {
  return label.includes('状态')
}

/** 空值统一显示「—」，不留空白单元格（0 等合法值不受影响） */
function cellText(value: unknown): unknown {
  return value === null || value === undefined || value === '' ? '—' : value
}

function badgeClass(value: unknown): string {
  const v = String(value ?? '')
  if (OK_WORDS.includes(v)) return 'badge ok'
  if (PENDING_WORDS.includes(v)) return 'badge pending'
  if (FAIL_WORDS.includes(v)) return 'badge fail'
  return 'badge plain'
}

// 分页：不足一页时整块隐藏，与现有小数据量页面无缝兼容
const page = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(props.rows.length / props.pageSize)))
const pagedRows = computed(() => {
  if (props.rows.length <= props.pageSize) return props.rows
  const start = (page.value - 1) * props.pageSize
  return props.rows.slice(start, start + props.pageSize)
})

// 搜索 / 筛选后行数据变化时回到第一页
watch(
  () => props.rows,
  () => {
    page.value = 1
  },
)

function goTo(p: number) {
  page.value = Math.min(Math.max(1, p), totalPages.value)
}
</script>

<template>
  <div class="table-card">
    <div class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th
              v-for="c in columns"
              :key="c.key"
              :style="c.width ? { width: c.width } : undefined"
            >
              {{ c.label }}
            </th>
            <th v-if="actions && actions.length" class="th-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!rows.length">
            <td class="empty-cell" :colspan="columns.length + (actions?.length ? 1 : 0)">
              暂无数据
            </td>
          </tr>
          <tr v-for="(row, index) in pagedRows" :key="(page - 1) * props.pageSize + index">
            <td v-for="c in columns" :key="c.key">
              <span v-if="isStatusColumn(c.label)" :class="badgeClass(row[c.key])">
                {{ cellText(row[c.key]) }}
              </span>
              <template v-else>{{ cellText(row[c.key]) }}</template>
            </td>
            <td v-if="actions?.length" class="td-actions">
              <button
                v-for="a in actions"
                :key="a"
                type="button"
                class="table-btn"
                @click="emit('action', a, row)"
              >
                {{ a }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="rows.length > pageSize" class="pager">
      <span class="pager-info">共 {{ rows.length }} 条 · 第 {{ page }} / {{ totalPages }} 页</span>
      <div class="pager-btns">
        <button type="button" class="pager-btn" :disabled="page === 1" @click="goTo(page - 1)">上一页</button>
        <button type="button" class="pager-btn" :disabled="page === totalPages" @click="goTo(page + 1)">下一页</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.table-card {
  background: #fff;
  border: 1px solid #eef1ee;
  border-radius: 14px;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.table-scroll {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th {
  text-align: left;
  padding: 13px 14px;
  background: #f7faf7;
  color: var(--green-dark);
  font-weight: 700;
  border-bottom: 1px solid #e7eee8;
  white-space: nowrap;
}

.data-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #f0f3ef;
  color: var(--ink);
  word-break: break-all;
  max-width: 240px;
}

.data-table tbody tr {
  transition: background 0.15s;
}

.data-table tbody tr:hover {
  background: #f6faf6;
}

.th-actions,
.td-actions {
  white-space: nowrap;
}

/* 操作按钮做成描边小胶囊，比纯文字链接更好点 */
.table-btn {
  border: 1px solid #d9e6dc;
  background: #fff;
  color: var(--green-dark);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 999px;
  margin: 2px 4px 2px 0;
  transition: border-color 0.15s, background 0.15s;
}

.table-btn:hover {
  border-color: var(--green);
  background: var(--green-light);
}

.empty-cell {
  text-align: center;
  color: var(--muted);
  padding: 28px 10px;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-top: 1px solid #f0f3ef;
  background: #fcfdfc;
}

.pager-info {
  font-size: 12px;
  color: var(--muted);
}

.pager-btns {
  display: flex;
  gap: 8px;
}

.pager-btn {
  border: 1px solid #d9e6dc;
  background: #fff;
  color: var(--green-dark);
  font-size: 12px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.pager-btn:hover:not(:disabled) {
  border-color: var(--green);
  background: var(--green-light);
}

.pager-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
