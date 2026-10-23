<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'

// 赛事统计（对应需求：高校组/中学组/小学组选手进球数量统计）
const columns: TableColumn[] = [
  { key: 'group', label: '组别', width: '90px' },
  { key: 'tournament', label: '赛事' },
  { key: 'matches', label: '已赛场次', width: '90px' },
  { key: 'goals', label: '总进球', width: '90px' },
  { key: 'avg', label: '场均进球', width: '90px' },
  { key: 'topScorer', label: '射手王', width: '140px' },
]

const rows = [
  { group: '高校组', tournament: '2026 省级青少年足球联赛', matches: 26, goals: 78, avg: 3.0, topScorer: '李昊（11 球）' },
  { group: '中学组', tournament: '2026 省级青少年足球联赛', matches: 42, goals: 135, avg: 3.2, topScorer: '王小磊（14 球）' },
  { group: '小学组', tournament: '2026 省级青少年足球联赛', matches: 35, goals: 98, avg: 2.8, topScorer: '张一诺（9 球）' },
]

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}
</script>

<template>
  <PageHeader title="赛事统计" desc="按高校组、中学组、小学组统计选手进球数量，支撑榜单发布" />

  <DataTable :columns="columns" :rows="rows" :actions="['导出榜单']" @action="onAction" />
</template>
