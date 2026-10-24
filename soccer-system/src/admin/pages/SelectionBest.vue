<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, TableColumn } from '../../components/common/types'
import {
  createSelectionBest,
  deleteSelectionBest,
  errMsg,
  fetchSelectionBest,
  fetchSelectionScores,
  scoreNum,
  updateSelectionBest,
  type ApiSelectionBest,
} from '../../api/selection'

// 最佳球员遴选结果：按组别取遴选总分最高的球员生成结果，可公示/取消公示、删除。

const GROUP_OPTIONS = ['小学组', '中学组', '高中组', '高校组']

const GROUP_TO_API: Record<string, string> = {
  小学组: 'primary',
  中学组: 'middle',
  高中组: 'high',
  高校组: 'university',
}

const BEST_STATUS_DISPLAY: Record<string, string> = { pending: '待公示', publicized: '已公示' }

const columns: TableColumn[] = [
  { key: 'group', label: '组别', width: '100px' },
  { key: 'name', label: '最佳球员' },
  { key: 'team', label: '队伍' },
  { key: 'score', label: '综合得分', width: '100px' },
  { key: 'status', label: '公示状态', width: '100px' },
]

interface BestRow {
  id: number
  group: string
  name: string
  team: string
  score: string | number
  status: string
  statusCode: string
}

const rows = ref<BestRow[]>([])
const formKey = ref(0)
const formInitial = ref<Record<string, string>>({})

const formFields: FormField[] = [
  { key: 'group', label: '组别', type: 'select', options: GROUP_OPTIONS, placeholder: '选择要生成结果的组别' },
]

const placeholderRows = computed(() => GROUP_OPTIONS.map((g) => ({
  id: 0,
  group: g,
  name: rows.value.some((r) => r.group === g) ? '' : '待生成',
  team: '—',
  score: '—',
  status: '未生成',
  statusCode: 'none',
})))

const displayRows = computed(() => {
  // 未生成组别显示占位行，生成过的组别显示真实结果
  return GROUP_OPTIONS.map((g) => rows.value.find((r) => r.group === g) ?? placeholderRows.value.find((r) => r.group === g)!)
})

async function refresh() {
  const list = await fetchSelectionBest()
  if (!list) return // 后端不可用：保留当前数据
  rows.value = list.map((b: ApiSelectionBest) => ({
    id: b.id,
    group: b.group_type_display,
    name: b.player_name,
    team: b.team_name || '—',
    score: b.total,
    status: BEST_STATUS_DISPLAY[b.status] ?? b.status,
    statusCode: b.status,
  }))
}

onMounted(refresh)

async function onGenerate(data: Record<string, string>) {
  const groupName = data.group ?? ''
  if (!groupName) {
    alert('请选择组别')
    return
  }
  const groupApi = GROUP_TO_API[groupName] ?? 'primary'
  const existed = rows.value.find((r) => r.group === groupName)
  if (existed && existed.id !== 0) {
    alert(`${groupName}已有最佳球员结果（${existed.name}），如需更换请先删除`)
    return
  }
  try {
    const scores = (await fetchSelectionScores({ group_type: groupApi })) ?? []
    if (!scores.length) {
      alert(`${groupName}暂无遴选评分数据，请先在初选/复选评分中录入`)
      return
    }
    const top = scores.reduce((a, b) => (scoreNum(b.total) > scoreNum(a.total) ? b : a))
    await createSelectionBest({ group_type: groupApi, player: top.player, total: scoreNum(top.total) })
    formKey.value++
    await refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onAction(action: string, row: Record<string, unknown>) {
  const r = row as unknown as BestRow
  if (r.id === 0) {
    alert(`${r.group}尚未生成结果，请先在上方选择组别生成`)
    return
  }
  if (action === '公示/取消公示') {
    try {
      await updateSelectionBest(r.id, r.statusCode === 'publicized' ? 'pending' : 'publicized')
      await refresh()
    } catch (err) {
      alert(errMsg(err))
    }
    return
  }
  if (action === '删除') {
    if (!confirm(`确认删除${r.group}的最佳球员结果（${r.name}）？`)) return
    try {
      await deleteSelectionBest(r.id)
      await refresh()
    } catch (err) {
      alert(errMsg(err))
    }
  }
}
</script>

<template>
  <PageHeader title="最佳球员遴选结果" desc="按组别生成遴选总分最高的最佳球员，公示后对外可见" />

  <h3 class="section-title">生成结果</h3>
  <DataForm :key="formKey" :fields="formFields" submit-text="生成本组最佳球员" :initial="formInitial" @submit="onGenerate" />

  <h3 class="section-title">各组别结果</h3>
  <DataTable :columns="columns" :rows="displayRows" :actions="['公示/取消公示', '删除']" @action="onAction" />
</template>
