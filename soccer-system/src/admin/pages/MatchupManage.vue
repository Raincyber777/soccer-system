<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'

// 比赛对阵信息管理（对应需求：发布/修改/删除对阵信息、按状态或球队查看）
const searchFields: SearchField[] = [
  { key: 'team', label: '球队名称', placeholder: '按球队名称查看' },
  { key: 'status', label: '比赛状态', type: 'select', options: ['未开始', '进行中', '已结束'] },
]

const columns: TableColumn[] = [
  { key: 'match', label: '场次' },
  { key: 'home', label: '主队', width: '120px' },
  { key: 'away', label: '客队', width: '120px' },
  { key: 'time', label: '比赛时间', width: '160px' },
  { key: 'venue', label: '场地', width: '150px' },
  { key: 'status', label: '状态', width: '90px' },
]

const rows = [
  { match: '中学组 第 3 轮', home: '实验中学', away: '市二中', time: '2026-10-22 15:00', venue: '省青少年足球基地 1 号场', status: '未开始' },
  { match: '小学组 第 2 轮', home: '实小少年队', away: '朝阳小学', time: '2026-10-19 10:00', venue: '市体育中心副场', status: '进行中' },
  { match: '高校组 第 1 轮', home: '贵州大学', away: '师范大学', time: '2026-10-18 15:00', venue: '贵州大学足球场', status: '已结束' },
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
  <PageHeader title="对阵信息管理" desc="发布、修改、删除比赛对阵信息，可按比赛状态或球队名称查看" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable
    :columns="columns"
    :rows="rows"
    :actions="['发布', '修改', '删除']"
    @action="onAction"
  />
</template>
