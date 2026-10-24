<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'
import { fetchGroupGoals, type ApiGroupGoals } from '../../api/stats'

// 赛事统计：按组别统计进球（球队/球员/进球人数/总进球），只计已发布赛果的比赛

const columns: TableColumn[] = [
  { key: 'group', label: '组别', width: '100px' },
  { key: 'teams', label: '球队数', width: '90px' },
  { key: 'players', label: '注册球员', width: '100px' },
  { key: 'scorers', label: '进球人数', width: '100px' },
  { key: 'goals', label: '总进球', width: '90px' },
  { key: 'top', label: '最佳射手' },
]

type StatRow = {
  group: string
  teams: string
  players: string
  scorers: string
  goals: number
  top: string
  raw?: ApiGroupGoals
}

// 后端不可用时的演示行
const demoRows: StatRow[] = [
  { group: '高校组', teams: '4', players: '86', scorers: '31', goals: 78, top: '李昊（11 球）' },
  { group: '中学组', teams: '6', players: '135', scorers: '52', goals: 135, top: '王小磊（14 球）' },
  { group: '小学组', teams: '5', players: '98', scorers: '40', goals: 98, top: '张一诺（9 球）' },
]

const rows = ref<StatRow[]>(demoRows)
const loaded = ref(false)

onMounted(async () => {
  const data = await fetchGroupGoals()
  if (!data) return // 后端不可用：保留演示数据
  loaded.value = true
  rows.value = data.groups.map((g) => {
    const top = g.top_players[0]
    return {
      group: g.group_type_display,
      teams: String(g.team_count),
      players: String(g.player_count),
      scorers: String(g.scorer_count),
      goals: g.total_goals,
      top: top ? `${top.player_name}（${top.total_goals} 球）` : '—',
      raw: g,
    }
  })
})

function onAction(action: string, row: Record<string, unknown>) {
  if (action !== '查看射手') return
  const r = row as unknown as StatRow
  if (!r.raw) {
    alert('【演示】查看射手：待接入后端')
    return
  }
  const lines = r.raw.top_players.map((p) => `${p.rank}. ${p.player_name}（${p.team_name}）：${p.total_goals} 球 ${p.assists} 助攻`)
  alert(`【${r.group}】射手榜 TOP ${r.raw.top_players.length}\n\n${lines.join('\n') || '暂无进球记录'}`)
}
</script>

<template>
  <PageHeader title="赛事统计" desc="按高校组、中学组等组别统计选手进球数量，支撑榜单发布" />

  <p v-if="loaded" class="page-tip" style="margin-top: -8px; margin-bottom: 12px">统计口径：已发布赛果的比赛进球记录。</p>
  <DataTable :columns="columns" :rows="rows" :actions="['查看射手']" @action="onAction" />
</template>
