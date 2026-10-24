<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, TableColumn } from '../../components/common/types'
import { fetchAdminMatches } from '../../api/manage'
import type { ApiMatch } from '../../api/types'
import {
  createMatchEvent,
  deleteMatchEvent,
  errMsg,
  fetchMatchEvents,
  type ApiMatchEvent,
  type MatchEventType,
} from '../../api/live'

// 赛事图文直播：选择场次进入直播间，发布/删除图文条目（进球/换人/红黄牌/文字播报）。

const columns: TableColumn[] = [
  { key: 'round', label: '轮次', width: '110px' },
  { key: 'teams', label: '对阵' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'time', label: '开赛时间', width: '150px' },
  { key: 'updates', label: '图文条数', width: '90px' },
  { key: 'status', label: '状态', width: '90px' },
]

interface MatchRow {
  id: number
  round: string
  teams: string
  group: string
  time: string
  updates: number
  status: string
}

const matchList = ref<ApiMatch[]>([])
const rows = ref<MatchRow[]>([])
const events = ref<ApiMatchEvent[]>([])
const liveMatch = ref<ApiMatch | null>(null) // 当前直播间场次

const eventColumns: TableColumn[] = [
  { key: 'minute', label: '时间', width: '70px' },
  { key: 'type', label: '类型', width: '90px' },
  { key: 'content', label: '播报内容' },
  { key: 'published', label: '发布时间', width: '150px' },
]

const eventFormFields: FormField[] = [
  { key: 'minute', label: '比赛分钟', type: 'number', placeholder: '如 23（可留空）' },
  { key: 'type', label: '条目类型', type: 'select', options: ['文字播报', '进球', '换人', '红黄牌'] },
  { key: 'content', label: '播报内容', type: 'textarea', placeholder: '如：王小磊禁区外远射破门！' },
]

const TYPE_TO_API: Record<string, MatchEventType> = {
  文字播报: 'text',
  进球: 'goal',
  换人: 'substitution',
  红黄牌: 'card',
}

async function refreshMatches() {
  const list = await fetchAdminMatches()
  if (!list) return // 后端不可用：保持空列表
  matchList.value = list
  // 各场图文条数：一次拉全量按 match 分组统计
  const all = (await fetchMatchEvents()) ?? []
  const counts = new Map<number, number>()
  for (const e of all) counts.set(e.match, (counts.get(e.match) ?? 0) + 1)
  rows.value = list.map((m) => ({
    id: m.id,
    round: m.round_name || '—',
    teams: `${m.home_team_name} vs ${m.away_team_name}`,
    group: m.group_type_display,
    time: m.match_time,
    updates: counts.get(m.id) ?? 0,
    status: m.status_display,
  }))
}

onMounted(refreshMatches)

async function loadEvents() {
  if (!liveMatch.value) return
  events.value = (await fetchMatchEvents({ match: liveMatch.value.id })) ?? []
}

async function onAction(action: string, row: Record<string, unknown>) {
  if (action !== '进入直播间' && action !== '发布图文') return
  const m = matchList.value.find((x) => x.id === (row.id as number)) ?? null
  liveMatch.value = m
  if (m) await loadEvents()
}

async function onPublish(data: Record<string, string>) {
  if (!liveMatch.value) return
  const content = (data.content ?? '').trim()
  if (!content) {
    alert('请填写播报内容')
    return
  }
  try {
    await createMatchEvent({
      match: liveMatch.value.id,
      minute: (data.minute ?? '').trim() ? Number(data.minute) : null,
      type: TYPE_TO_API[data.type ?? '文字播报'] ?? 'text',
      content,
    })
    await loadEvents()
    await refreshMatches()
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onEventAction(action: string, row: Record<string, unknown>) {
  if (action !== '删除') return
  if (!confirm('确认删除该条图文播报？')) return
  try {
    await deleteMatchEvent(row.id as number)
    await loadEvents()
    await refreshMatches()
  } catch (err) {
    alert(errMsg(err))
  }
}
</script>

<template>
  <PageHeader title="赛事图文直播" desc="选择场次进入直播间，实时发布进球、换人、红黄牌与文字播报" />

  <h3 class="section-title">场次列表</h3>
  <DataTable :columns="columns" :rows="rows" :actions="['进入直播间']" @action="onAction" />

  <template v-if="liveMatch">
    <h3 class="section-title">
      直播间：{{ liveMatch.group_type_display }} {{ liveMatch.round_name }}
      {{ liveMatch.home_team_name }} vs {{ liveMatch.away_team_name }}
    </h3>

    <DataForm :fields="eventFormFields" submit-text="发布图文" @submit="onPublish" />

    <h3 class="section-title">已发布条目（{{ events.length }}）</h3>
    <DataTable :columns="eventColumns" :rows="events" :actions="['删除']" @action="onEventAction" />
  </template>
</template>
