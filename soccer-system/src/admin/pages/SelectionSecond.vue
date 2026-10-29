<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataForm from '../../components/common/DataForm.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'
import {
  errMsg,
  fetchSelectionScores,
  scoreNum,
  selectionStageDisplay,
  updateSelectionScore,
  type ApiSelectionScore,
  type ScoreValue,
} from '../../api/selection'

// 遴选复选：对初选通过的球员进行复选评分（覆盖技评/体能分数）、复选通过/淘汰、
// 汇总统计与导出（前端生成 CSV，Excel/WPS 可直接打开）。

const searchFields: SearchField[] = [
  { key: 'group', label: '组别', type: 'select', options: ['小学组', '中学组', '高中组', '高校组'] },
]

const GROUP_TO_API: Record<string, string> = {
  小学组: 'primary',
  中学组: 'middle',
  高中组: 'high',
  高校组: 'university',
}

const columns: TableColumn[] = [
  { key: 'name', label: '球员', width: '100px' },
  { key: 'team', label: '队伍' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'skill', label: '技评得分', width: '90px' },
  { key: 'physical', label: '体能得分', width: '90px' },
  { key: 'total', label: '总分', width: '80px' },
  { key: 'status', label: '状态', width: '100px' },
]

interface ScoreRow {
  id: number
  name: string
  team: string
  group: string
  groupType: string
  skill: ScoreValue
  physical: ScoreValue
  total: ScoreValue
  status: string
  statusCode: string
}

const allRows = ref<ScoreRow[]>([])
const rows = ref<ScoreRow[]>([])
const editingId = ref<number | null>(null)
const formKey = ref(0)
const formInitial = ref<Record<string, string>>({})
const filters = ref<Record<string, string>>({})

const formFields = [
  { key: 'skill', label: '复选技评得分', type: 'number' as const, placeholder: '0-100' },
  { key: 'physical', label: '复选体能得分', type: 'number' as const, placeholder: '0-100' },
]

function applyFilter() {
  // 组别为后端已筛 + 前端兜底过滤
  rows.value = allRows.value.filter((r) => r.statusCode === 'first_passed' || r.statusCode === 'second_passed')
}

async function refresh(params?: Record<string, string>) {
  const query: Record<string, unknown> = {}
  if (params?.group) query.group_type = GROUP_TO_API[params.group] ?? ''
  const list = await fetchSelectionScores(query)
  if (!list) return // 后端不可用：保留当前数据
  allRows.value = list.map((s: ApiSelectionScore) => ({
    id: s.id,
    name: s.player_name,
    team: s.player_team || '—',
    group: s.group_type_display,
    groupType: s.group_type,
    skill: s.technical,
    physical: s.physical,
    total: s.total,
    status: selectionStageDisplay(s.status),
    statusCode: s.status,
  }))
  applyFilter()
}

onMounted(() => refresh())

function onSearch(f: Record<string, string>) {
  filters.value = f
  refresh(f)
}

async function onSave(data: Record<string, string>) {
  if (editingId.value === null) return
  const skill = Number(data.skill)
  const physical = Number(data.physical)
  if (Number.isNaN(skill) || Number.isNaN(physical) || skill < 0 || physical < 0) {
    alert('请填写有效的技评/体能得分（≥0）')
    return
  }
  try {
    await updateSelectionScore(editingId.value, { technical: skill, physical })
    editingId.value = null
    formInitial.value = {}
    formKey.value++
    await refresh(filters.value)
  } catch (err) {
    alert(errMsg(err))
  }
}

async function setStatus(row: ScoreRow, status: string, confirmText: string) {
  if (!confirm(confirmText)) return
  try {
    await updateSelectionScore(row.id, { status })
    await refresh(filters.value)
  } catch (err) {
    alert(errMsg(err))
  }
}

function onSummary() {
  if (!rows.value.length) {
    alert('暂无复选名单数据')
    return
  }
  const totals = rows.value.map((r) => scoreNum(r.total))
  const avg = totals.reduce((a, b) => a + b, 0) / totals.length
  const top = rows.value.reduce((a, b) => (scoreNum(b.total) > scoreNum(a.total) ? b : a))
  alert(
    `复选汇总：共 ${rows.value.length} 人｜平均总分 ${avg.toFixed(1)}｜最高分 ${top.name}（${scoreNum(top.total)} 分，${top.group}）`,
  )
}

function onExport() {
  if (!rows.value.length) {
    alert('暂无数据可导出')
    return
  }
  const head = ['球员', '队伍', '组别', '技评得分', '体能得分', '总分', '状态']
  const lines = rows.value.map((r) =>
    [r.name, r.team, r.group, String(r.skill), String(r.physical), String(r.total), r.status].join(','),
  )
  const csv = '﻿' + [head.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '复选评分汇总.csv'
  a.click()
  URL.revokeObjectURL(url)
}

async function onAction(action: string, row: Record<string, unknown>) {
  const r = row as unknown as ScoreRow
  if (action === '评分') {
    editingId.value = r.id
    formInitial.value = { skill: String(r.skill), physical: String(r.physical) }
    formKey.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  if (action === '复选通过') {
    if (r.statusCode !== 'first_passed') {
      alert(`该球员状态为「${r.status}」，无需操作`)
      return
    }
    await setStatus(r, 'second_passed', `确认「${r.name}」复选通过、入选集训名单？`)
    return
  }
  if (action === '未通过') {
    await setStatus(r, 'rejected', `确认「${r.name}」复选未通过？`)
    return
  }
  if (action === '汇总') onSummary()
  if (action === '导出') onExport()
}
</script>

<template>
  <PageHeader title="复选评分" desc="对初选通过球员进行复选评分与通过/淘汰，支持汇总统计与导出" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <h3 v-if="editingId" class="section-title">复选评分</h3>
  <DataForm v-if="editingId" :key="formKey" :fields="formFields" submit-text="保存复选分数" :initial="formInitial" @submit="onSave" />

  <h3 class="section-title">复选名单（{{ rows.length }}）</h3>
  <DataTable
    :columns="columns"
    :rows="rows"
    :actions="['评分', '复选通过', '未通过', '汇总', '导出']"
    @action="onAction"
  />
</template>
