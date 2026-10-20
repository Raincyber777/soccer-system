<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'

// 赛事榜单与统计（对应需求：选手进球数量统计榜单，按高校组/中学组/小学组统计）
const searchFields: SearchField[] = [
  { key: 'group', label: '组别', type: 'select', options: ['高校组', '中学组', '小学组'] },
  { key: 'year', label: '赛季', type: 'select', options: ['2026 秋季', '2026 春季', '2025 秋季'] },
]

const columns: TableColumn[] = [
  { key: 'rank', label: '排名', width: '80px' },
  { key: 'name', label: '球员', width: '110px' },
  { key: 'team', label: '所属球队' },
  { key: 'goals', label: '进球', width: '80px' },
  { key: 'assists', label: '助攻', width: '80px' },
]

const rows = [
  { rank: 1, name: '王小磊', team: '实验中学足球队', goals: 9, assists: 4 },
  { rank: 2, name: '周子豪', team: '市二中足球队', goals: 8, assists: 2 },
  { rank: 3, name: '李泽宇', team: '实验中学足球队', goals: 6, assists: 7 },
  { rank: 4, name: '郑凯', team: '师大附中队', goals: 5, assists: 3 },
]

function onSearch(filters: Record<string, string>) {
  console.log('搜索条件：', filters)
  alert('【演示】按组别切换榜单：待接入后端')
}
</script>

<template>
  <PageHeader title="榜单统计" desc="按组别统计选手进球数量，生成射手榜单" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable :columns="columns" :rows="rows" />

  <p class="page-tip" style="margin-top: 16px">
    榜单数据来源于「赛事信息录入」中的进球记录，比赛完赛并发布后自动计入统计。
  </p>
</template>
