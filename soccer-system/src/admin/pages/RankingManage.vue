<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'
import { fetchScorerRanking } from '../../api/stats'

// 榜单统计：射手榜（数据来自已发布赛果中的进球记录），支持按组别筛选

const searchFields: SearchField[] = [
  { key: 'group', label: '组别', type: 'select', options: ['全部', '小学组', '中学组', '高中组', '高校组'] },
]

const GROUP_TO_API: Record<string, string> = { 小学组: 'primary', 中学组: 'middle', 高中组: 'high', 高校组: 'university' }

const columns: TableColumn[] = [
  { key: 'rank', label: '排名', width: '80px' },
  { key: 'name', label: '球员', width: '110px' },
  { key: 'number', label: '号码', width: '70px' },
  { key: 'team', label: '所属球队' },
  { key: 'position', label: '位置', width: '90px' },
  { key: 'goals', label: '进球', width: '80px' },
  { key: 'assists', label: '助攻', width: '80px' },
  { key: 'matches', label: '出场', width: '80px' },
]

type RankRow = {
  rank: number
  name: string
  number: string
  team: string
  position: string
  goals: number
  assists: number
  matches: number
}

// 后端不可用时的演示行
const demoRows: RankRow[] = [
  { rank: 1, name: '王小磊', number: '9', team: '实验中学足球队', position: '前锋', goals: 9, assists: 4, matches: 5 },
  { rank: 2, name: '周子豪', number: '11', team: '市二中足球队', position: '前锋', goals: 8, assists: 2, matches: 5 },
  { rank: 3, name: '李泽宇', number: '7', team: '实验中学足球队', position: '中场', goals: 6, assists: 7, matches: 5 },
  { rank: 4, name: '郑凯', number: '10', team: '师大附中队', position: '中场', goals: 5, assists: 3, matches: 4 },
]

const rows = ref<RankRow[]>(demoRows)
const loaded = ref(false)
const currentGroup = ref('')

async function refresh(groupLabel = '') {
  const data = await fetchScorerRanking(GROUP_TO_API[groupLabel] ?? '')
  if (!data) return // 后端不可用：保留演示数据
  loaded.value = true
  rows.value = data.results.map((s) => ({
    rank: s.rank,
    name: s.player_name,
    number: s.jersey_number === null ? '—' : String(s.jersey_number),
    team: s.team_name,
    position: s.position || '—',
    goals: s.total_goals,
    assists: s.assists,
    matches: s.match_count,
  }))
}

onMounted(() => refresh(currentGroup.value))

function onSearch(filters: Record<string, string>) {
  currentGroup.value = filters.group && filters.group !== '全部' ? filters.group : ''
  void refresh(currentGroup.value)
}
</script>

<template>
  <PageHeader title="榜单统计" desc="按组别统计选手进球数量，生成射手榜单" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="() => onSearch({})" />

  <p v-if="loaded && !rows.length" class="page-tip">当前组别暂无进球记录，比赛完赛并发布赛果后自动计入统计。</p>
  <DataTable v-else :columns="columns" :rows="rows" />

  <p class="page-tip" style="margin-top: 16px">
    榜单数据来源于「赛事信息录入」中的进球记录，比赛完赛并发布后自动计入统计。
  </p>
</template>
