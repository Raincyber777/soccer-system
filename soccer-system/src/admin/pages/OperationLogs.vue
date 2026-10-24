<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'
import { fetchAuditLogs } from '../../api/system'

// 操作日志：后端按登录角色返回数据域（city 仅见本区域账号操作），支持关键字与日期过滤。

const searchFields: SearchField[] = [
  { key: 'keyword', label: '关键字', placeholder: '账号或操作内容' },
  { key: 'dateFrom', label: '开始日期', placeholder: 'YYYY-MM-DD' },
  { key: 'dateTo', label: '结束日期', placeholder: 'YYYY-MM-DD' },
]

const columns: TableColumn[] = [
  { key: 'time', label: '操作时间', width: '170px' },
  { key: 'account', label: '账号', width: '130px' },
  { key: 'role', label: '角色', width: '110px' },
  { key: 'action', label: '操作内容' },
  { key: 'ip', label: 'IP 地址', width: '130px' },
]

interface LogRow {
  time: string
  account: string
  role: string
  action: string
  ip: string
}

// 日志里 role 存角色 code，展示时转中文
const ROLE_DISPLAY: Record<string, string> = {
  admin: '系统管理员',
  province: '省级管理员',
  city: '市州审核员',
  school: '球队负责人',
  athlete: '运动员',
  coach: '教练员',
}

const rows = ref<LogRow[]>([
  { time: '2026-10-16 14:20', account: 'szyds_zq01', role: '球队负责人', action: '提交球队报名表（中学组）', ip: '10.12.3.44' },
  { time: '2026-10-16 11:05', account: 'gy_shi_zhen', role: '市州审核员', action: '驳回球队报名 1 份（材料不齐）', ip: '10.8.1.17' },
  { time: '2026-10-16 09:30', account: 'admin', role: '系统管理员', action: '发布赛事新闻「秋季联赛开赛公告」', ip: '10.0.0.8' },
  { time: '2026-10-15 17:12', account: 'admin', role: '系统管理员', action: '修改教练员身份信息（张建国）', ip: '10.0.0.8' },
  { time: '2026-10-15 16:44', account: 'gzsfdx_fc', role: '高校负责人', action: '批量上传球员照片 22 张', ip: '10.20.7.9' },
])

async function refresh(params?: Record<string, string>) {
  const query: Record<string, unknown> = {}
  if (params?.keyword) query.keyword = params.keyword.trim()
  if (params?.dateFrom) query.date_from = params.dateFrom.trim()
  if (params?.dateTo) query.date_to = params.dateTo.trim()
  const list = await fetchAuditLogs(query)
  if (!list) return // 后端不可用：保留演示数据
  rows.value = list.map((l) => ({
    time: l.created_at,
    account: l.account,
    role: ROLE_DISPLAY[l.role] ?? l.role,
    action: l.action,
    ip: l.ip || '—',
  }))
}

onMounted(() => refresh())

function onSearch(filters: Record<string, string>) {
  refresh(filters)
}
</script>

<template>
  <PageHeader title="操作日志" desc="记录并查看系统内用户的关键操作，便于审计追溯" />

  <p class="page-tip">
    日志按登录账号的数据域展示：市州账号仅可见本区域的操作记录，省级账号可见全省。支持按关键字与日期区间过滤。
  </p>

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable :columns="columns" :rows="rows" />
</template>
