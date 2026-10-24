<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, TableColumn } from '../../components/common/types'
import {
  createResult,
  deleteResult,
  errMsg,
  fetchAdminMatches,
  publishResult,
} from '../../api/manage'
import type { ApiMatch } from '../../api/types'

// 赛果发布管理：赛果随对阵数据返回（match.result 嵌套），
// 录入比分创建赛果后端会自动完赛并推断获胜方；发布/撤回控制门户是否展示

const columns: TableColumn[] = [
  { key: 'match', label: '场次' },
  { key: 'score', label: '比分', width: '110px' },
  { key: 'group', label: '组别', width: '100px' },
  { key: 'time', label: '发布时间', width: '160px' },
  { key: 'status', label: '发布状态', width: '100px' },
]

interface ResultRow {
  /** 赛果记录 id（删除/发布用） */
  id: number | null
  /** 对阵 id（编辑比分定位用） */
  matchId: number | null
  match: string
  score: string
  group: string
  time: string
  status: string
}

const rows = ref<ResultRow[]>([
  { id: null, matchId: null, match: '高校组 第 1 轮：四川大学 vs 川师大队', score: '2 : 0', group: '高校组', time: '2026-10-18 17:00', status: '已发布' },
  { id: null, matchId: null, match: '小学组 第 1 轮：实小少年队 vs 城关小学', score: '5 : 2', group: '小学组', time: '2026-10-12 11:30', status: '已发布' },
  { id: null, matchId: null, match: '中学组 第 2 轮：一中 vs 师大附中', score: '1 : 1', group: '中学组', time: '2026-10-19 17:10', status: '未发布' },
])

function matchLabel(m: ApiMatch): string {
  return `${m.group_type_display} ${m.round_name}：${m.home_team_name} vs ${m.away_team_name}`.trim()
}

async function refresh() {
  const list = await fetchAdminMatches()
  if (!list) return // 后端不可用：保留演示数据
  const withResult = list.filter((m) => m.result)
  if (!withResult.length) {
    rows.value = []
    return
  }
  rows.value = withResult.map((m) => ({
    id: m.result!.id,
    matchId: m.id,
    match: matchLabel(m),
    score: `${m.result!.home_score} : ${m.result!.away_score}`,
    group: m.group_type_display,
    time: (m.result!.published_at || '').slice(0, 16),
    status: m.result!.is_published ? '已发布' : '未发布',
  }))
}

onMounted(refresh)

// ---------- 录入赛果：下拉列出还没有赛果的对阵 ----------

const pendingMatches = ref<ApiMatch[]>([])
const matchOptions = computed(() => pendingMatches.value.map(matchLabel))
const formFields: FormField[] = [
  { key: 'match', label: '选择对阵', type: 'select' },
  { key: 'homeScore', label: '主队得分', type: 'number' },
  { key: 'awayScore', label: '客队得分', type: 'number' },
]

async function loadPending() {
  const list = await fetchAdminMatches()
  if (list) pendingMatches.value = list.filter((m) => !m.result)
}

onMounted(loadPending)

async function onSubmit(data: Record<string, string>) {
  const label = data.match ?? ''
  const idx = matchOptions.value.indexOf(label)
  const selected = idx >= 0 ? pendingMatches.value[idx] : undefined
  if (!selected) {
    alert('请选择要录入赛果的对阵（后端不可用时无法录入）')
    return
  }
  const home = Number(data.homeScore)
  const away = Number(data.awayScore)
  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
    alert('比分应为非负整数')
    return
  }
  try {
    await createResult({ match: selected.id, home_score: home, away_score: away, is_published: true })
    await Promise.all([refresh(), loadPending()])
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onAction(action: string, row: Record<string, unknown>) {
  const id = Number(row.id ?? 0)
  if (!id) {
    alert('当前为离线演示数据，无法操作')
    return
  }
  if (action === '发布') {
    try {
      // 未发布 → 发布；已发布 → 撤回（门户立即隐藏，积分榜同步剔除）
      await publishResult(id, row.status !== '已发布')
      await refresh()
    } catch (err) {
      alert(errMsg(err))
    }
    return
  }
  if (action === '删除') {
    if (!confirm(`确认删除赛果「${row.match} ${row.score}」？对阵将回到未录入状态`)) return
    try {
      await deleteResult(id)
      await Promise.all([refresh(), loadPending()])
    } catch (err) {
      alert(errMsg(err))
    }
  }
}
</script>

<template>
  <PageHeader title="赛果发布管理" desc="录入并发布比赛结果，门户同步更新积分与战绩（数据来自后端）" />

  <h3 class="section-title">录入赛果</h3>
  <DataForm :fields="formFields" submit-text="提交赛果" @submit="onSubmit" />

  <h3 class="section-title">赛果列表</h3>
  <DataTable :columns="columns" :rows="rows" :actions="['发布/撤回', '删除']" @action="onAction" />
</template>
