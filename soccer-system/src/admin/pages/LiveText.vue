<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'

// 赛事图文直播（对应需求：赛事图文直播发布与管理）
const searchFields: SearchField[] = [
  { key: 'match', label: '场次', placeholder: '输入场次或对阵' },
  { key: 'status', label: '直播状态', type: 'select', options: ['直播中', '未开始', '已结束'] },
]

const columns: TableColumn[] = [
  { key: 'match', label: '场次' },
  { key: 'teams', label: '对阵' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'time', label: '开赛时间', width: '150px' },
  { key: 'updates', label: '图文条数', width: '90px' },
  { key: 'status', label: '状态', width: '90px' },
]

const rows = [
  { match: '第 4 轮 · 场次 1', teams: '实验中学 vs 市二中', group: '中学组', time: '2026-10-21 15:00', updates: 12, status: '未开始' },
  { match: '第 4 轮 · 场次 2', teams: '师范附小 vs 位置小学', group: '小学组', time: '2026-10-19 10:00', updates: 24, status: '直播中' },
  { match: '第 3 轮 · 场次 5', teams: '高校联队 vs 城院队', group: '高校组', time: '2026-10-17 16:30', updates: 31, status: '已结束' },
]

function onSearch(filters: Record<string, string>) {
  console.log('搜索条件：', filters)
  alert('【演示】搜索：待接入后端')
}

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}
</script>

<template>
  <PageHeader title="赛事图文直播" desc="进入比赛直播间发布图文直播内容，滚动播报赛况" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable :columns="columns" :rows="rows" :actions="['进入直播间', '发布图文']" @action="onAction" />
</template>
