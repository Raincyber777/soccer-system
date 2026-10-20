<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'

// 球员遴选档案（对应需求：按身份证号/队伍搜索球员档案）
const searchFields: SearchField[] = [
  { key: 'idCard', label: '身份证号', placeholder: '输入身份证号' },
  { key: 'team', label: '队伍', placeholder: '输入队伍名称' },
]

const columns: TableColumn[] = [
  { key: 'name', label: '球员', width: '100px' },
  { key: 'idCard', label: '身份证号', width: '170px' },
  { key: 'team', label: '队伍' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'matches', label: '参赛场次', width: '100px' },
  { key: 'status', label: '档案状态', width: '100px' },
]

const rows = [
  { name: '王小磊', idCard: '5201**********0011', team: '实验中学足球队', group: '中学组', matches: 12, status: '已归档' },
  { name: '李泽宇', idCard: '5201**********0022', team: '实验中学足球队', group: '中学组', matches: 10, status: '已归档' },
  { name: '陈昊', idCard: '5201**********0033', team: '实验中学足球队', group: '中学组', matches: 8, status: '进行中' },
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
  <PageHeader title="球员遴选档案" desc="按身份证号、队伍查询球员遴选档案，查看参赛与评分记录" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable :columns="columns" :rows="rows" :actions="['查看档案']" @action="onAction" />
</template>
