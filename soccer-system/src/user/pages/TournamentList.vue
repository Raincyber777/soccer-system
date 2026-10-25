<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'
import { fetchTournaments, type ApiTournamentOption } from '../../api/registration'

// 赛事列表：浏览可报名赛事（组别/主办单位/报名窗口/状态），报名期可直达报名表单

const router = useRouter()

const columns: TableColumn[] = [
  { key: 'name', label: '赛事名称' },
  { key: 'group', label: '组别', width: '150px' },
  { key: 'organizer', label: '主办单位' },
  { key: 'signTime', label: '报名时间', width: '200px' },
  { key: 'status', label: '状态', width: '100px' },
]

interface TournamentRow {
  id: number
  name: string
  group: string
  organizer: string
  signTime: string
  status: string
  canSign: boolean
  raw: ApiTournamentOption
}

const rows = ref<TournamentRow[]>([])

function fmtGroups(t: ApiTournamentOption): string {
  const g = t.group_types
  if (Array.isArray(g)) return g.join('、') || '—'
  return String(g || '—')
}

function fmtDate(s: string | null): string {
  return (s || '').slice(5, 10).replace('T', '')
}

async function refresh() {
  const list = await fetchTournaments()
  if (!list) return
  rows.value = list.map((t: ApiTournamentOption) => ({
    id: t.id,
    name: t.name,
    group: fmtGroups(t),
    organizer: t.organizer || '—',
    signTime: `${fmtDate(t.sign_start_at)} ~ ${fmtDate(t.sign_end_at)}`,
    status: t.status_display,
    canSign: t.status_display.includes('报名'),
    raw: t,
  }))
}

onMounted(refresh)

function onView(row: TournamentRow) {
  const t = row.raw
  alert(
    `赛事：${t.name}\n组别：${row.group}\n主办单位：${row.organizer}` +
      `\n报名时间：${(t.sign_start_at || '—').slice(0, 10)} ~ ${(t.sign_end_at || '—').slice(0, 10)}` +
      `\n当前状态：${t.status_display}`,
  )
}

function onAction(action: string, row: Record<string, unknown>) {
  const r = row as unknown as TournamentRow
  if (action === '查看详情') {
    onView(r)
  } else if (action === '报名') {
    if (!r.canSign) {
      alert(`「${r.name}」当前不在报名期（${r.status}）`)
      return
    }
    router.push('/user/registration-form')
  }
}
</script>

<template>
  <PageHeader title="赛事列表" desc="浏览正在报名和进行中的赛事，报名期可点击报名进入报名表单" />

  <DataTable :columns="columns" :rows="rows" :actions="['查看详情', '报名']" @action="onAction" />
</template>
