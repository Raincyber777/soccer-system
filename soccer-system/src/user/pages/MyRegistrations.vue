<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'

// 我的报名：搜索、审核状态查看、修改删除（对应需求：报名审核查看 / 按条件搜索 / 修改 / 删除）
const searchFields: SearchField[] = [
  { key: 'team', label: '球队名称', placeholder: '输入球队名称' },
  { key: 'group', label: '报名组别', type: 'select', options: ['小学组', '中学组', '高中组', '高校组'] },
  { key: 'status', label: '审核状态', type: 'select', options: ['待审核', '已通过', '已驳回'] },
]

const columns: TableColumn[] = [
  { key: 'team', label: '球队名称' },
  { key: 'tournament', label: '赛事' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'players', label: '报名人数', width: '90px' },
  { key: 'submitTime', label: '提交时间', width: '160px' },
  { key: 'status', label: '审核状态', width: '100px' },
]

const rows = [
  { team: '实验中学足球队', tournament: '省青少年校园足球联赛（秋季）', group: '中学组', players: 18, submitTime: '2026-10-16 14:20', status: '待审核' },
  { team: '实验中学足球队', tournament: '省青少年足球冠军杯', group: '中学组', players: 16, submitTime: '2026-09-28 10:05', status: '已通过' },
  { team: '实小少年队', tournament: '省青少年校园足球联赛（秋季）', group: '小学组', players: 12, submitTime: '2026-10-14 09:40', status: '已驳回' },
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
  <PageHeader title="我的报名" desc="查看报名审核状态，可按球队、组别、审核状态搜索，支持修改与删除" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable
    :columns="columns"
    :rows="rows"
    :actions="['修改', '删除', '查看审核', '报名表PDF']"
    @action="onAction"
  />
</template>
