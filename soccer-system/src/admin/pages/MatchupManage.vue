<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataForm from '../../components/common/DataForm.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'
import {
  createMatch,
  deleteMatch,
  errMsg,
  fetchAdminMatches,
  fetchTeamOptions,
  type MatchGroup,
} from '../../api/manage'
import type { MatchRow } from '../../api/portal'

// 比赛对阵信息管理：列表/新增/删除走后端，搜索为前端过滤

const searchFields: SearchField[] = [
  { key: 'team', label: '球队名称', placeholder: '按球队名称查看' },
  { key: 'status', label: '比赛状态', type: 'select', options: ['未开始', '进行中', '已结束', '已延期'] },
]

const columns: TableColumn[] = [
  { key: 'match', label: '场次' },
  { key: 'home', label: '主队', width: '120px' },
  { key: 'away', label: '客队', width: '120px' },
  { key: 'time', label: '比赛时间', width: '160px' },
  { key: 'venue', label: '场地', width: '150px' },
  { key: 'status', label: '状态', width: '90px' },
]

type AdminMatchRow = MatchRow & { id: number | null }
const rows = ref<AdminMatchRow[]>([])

async function refresh() {
  const list = await fetchAdminMatches()
  rows.value = (list ?? []).map((m) => ({
    id: m.id,
    match: `${m.group_type_display} ${m.round_name}`.trim(),
    group: m.group_type_display,
    home: m.home_team_name,
    score: m.result ? `${m.result.home_score} : ${m.result.away_score}` : '—',
    away: m.away_team_name,
    time: m.match_time,
    venue: m.venue,
    status: m.status_display,
  }))
}

// 搜索：球队名称模糊 + 状态精确，纯前端过滤
const filters = ref<Record<string, string>>({})
const filteredRows = computed(() =>
  rows.value.filter((r) => {
    if (filters.value.team && !`${r.home}${r.away}`.includes(filters.value.team.trim())) return false
    if (filters.value.status && r.status !== filters.value.status) return false
    return true
  }),
)

function onSearch(f: Record<string, string>) {
  filters.value = f
}

// ---------- 新增对阵 ----------

const GROUP_TO_API: Record<string, MatchGroup> = {
  小学组: 'primary',
  初中组: 'middle',
  高中组: 'high',
  高校组: 'university',
}

// 球队下拉（名称 → id 一起缓存，提交时转 id）
const teamNames = ref<string[]>([])
const teamIds = ref<Record<string, number>>({})

const formFields = computed(() => [
  { key: 'group', label: '组别', type: 'select' as const, options: Object.keys(GROUP_TO_API) },
  { key: 'round', label: '轮次', placeholder: '如：第 4 轮（可留空）' },
  { key: 'home', label: '主队', type: 'select' as const, options: teamNames.value },
  { key: 'away', label: '客队', type: 'select' as const, options: teamNames.value },
  { key: 'time', label: '比赛时间', placeholder: '如：2026-10-30 15:00' },
  { key: 'venue', label: '场地', placeholder: '如：省青少年足球基地 1 号场' },
])

onMounted(async () => {
  refresh()
  const teams = await fetchTeamOptions()
  if (teams) {
    teamNames.value = teams.map((t) => t.name)
    teamIds.value = Object.fromEntries(teams.map((t) => [t.name, t.id]))
  }
})

const TIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/

async function onSubmit(data: Record<string, string>) {
  const group = data.group ?? ''
  const home = data.home ?? ''
  const away = data.away ?? ''
  const time = data.time ?? ''
  const round = data.round ?? ''
  const venue = data.venue ?? ''
  if (!group || !home || !away || !time.trim()) {
    alert('请选择组别、主客队并填写比赛时间')
    return
  }
  if (home === away) {
    alert('主客队不能是同一支球队')
    return
  }
  if (!TIME_RE.test(time.trim())) {
    alert('比赛时间格式应为：2026-10-30 15:00')
    return
  }
  try {
    await createMatch({
      group_type: GROUP_TO_API[group] ?? 'primary',
      round_name: round.trim(),
      home_team: teamIds.value[home] ?? 0,
      away_team: teamIds.value[away] ?? 0,
      match_time: time.trim(),
      venue: venue.trim(),
      status: 'scheduled',
    })
    await refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onAction(action: string, row: Record<string, unknown>) {
  if (action === '删除') {
    const id = Number(row.id ?? 0)
    if (!id) return
    if (!confirm(`确认删除对阵「${row.match}：${row.home} vs ${row.away}」？`)) return
    try {
      await deleteMatch(id)
      await refresh()
    } catch (err) {
      alert(errMsg(err))
    }
  }
}
</script>

<template>
  <PageHeader title="对阵信息管理" desc="发布、删除比赛对阵信息，可按比赛状态或球队名称查看（数据来自后端）" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <h3 class="section-title">新增对阵</h3>
  <DataForm :fields="formFields" submit-text="发布对阵" @submit="onSubmit" />

  <h3 class="section-title">对阵列表</h3>
  <DataTable :columns="columns" :rows="filteredRows" :actions="['删除']" @action="onAction" />
</template>
