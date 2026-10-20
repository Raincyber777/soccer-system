<script setup lang="ts">
import type { TableColumn } from './types'

// 通用演示表格：传入列配置和行数据即可，状态列自动渲染成彩色标签
defineProps<{
  columns: TableColumn[]
  rows: Record<string, unknown>[]
  actions?: string[]
}>()

const emit = defineEmits<{
  (e: 'action', action: string, row: Record<string, unknown>): void
}>()

const OK_WORDS = ['已通过', '已发布', '已上架', '已生效', '已核验', '已归档', '已公示']
const PENDING_WORDS = ['待审核', '审核中', '报名中', '进行中', '待核验', '未开始']
const FAIL_WORDS = ['已驳回', '未通过', '已下架', '已删除', '已失效']

function isStatusColumn(label: string) {
  return label.includes('状态')
}

function badgeClass(value: unknown): string {
  const v = String(value ?? '')
  if (OK_WORDS.includes(v)) return 'badge ok'
  if (PENDING_WORDS.includes(v)) return 'badge pending'
  if (FAIL_WORDS.includes(v)) return 'badge fail'
  return 'badge plain'
}
</script>

<template>
  <div class="table-card">
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
            暂无数据（演示占位，接入后端后显示真实数据）
          </td>
        </tr>
        <tr v-for="(row, index) in rows" :key="index">
          <td v-for="c in columns" :key="c.key">
            <span v-if="isStatusColumn(c.label)" :class="badgeClass(row[c.key])">
              {{ row[c.key] }}
            </span>
            <template v-else>{{ row[c.key] }}</template>
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
</template>

<style scoped>
.table-card {
  background: #fff;
  border-radius: 12px;
  padding: 8px 16px;
  box-shadow: 0 4px 14px rgba(20, 60, 40, 0.05);
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th {
  text-align: left;
  padding: 12px 10px;
  color: var(--green-dark);
  border-bottom: 2px solid var(--green-light);
  white-space: nowrap;
}

.data-table td {
  padding: 11px 10px;
  border-bottom: 1px solid #eef1ee;
  color: var(--ink);
  word-break: break-all;
  max-width: 240px;
}

.data-table tbody tr:hover {
  background: #f7faf7;
}

.th-actions,
.td-actions {
  white-space: nowrap;
}

.empty-cell {
  text-align: center;
  color: var(--muted);
  padding: 28px 10px;
}
</style>
