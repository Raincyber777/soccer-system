<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'

// 管理员球员管理（对应需求：按姓名/身份证搜索、重置密码、公示/取消公示、修改、删除）
const searchFields: SearchField[] = [
  { key: 'name', label: '姓名', placeholder: '输入球员姓名' },
  { key: 'idCard', label: '身份证号', placeholder: '输入身份证号' },
]

const columns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '100px' },
  { key: 'idCard', label: '身份证号', width: '170px' },
  { key: 'team', label: '所属球队' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'status', label: '公示状态', width: '100px' },
]

const rows = [
  { name: '王小磊', idCard: '5101**********0011', team: '实验中学足球队', group: '中学组', status: '已公示' },
  { name: '李泽宇', idCard: '5101**********0022', team: '实验中学足球队', group: '中学组', status: '已公示' },
  { name: '陈昊', idCard: '5101**********0033', team: '实验中学足球队', group: '中学组', status: '待审核' },
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
  <PageHeader title="球员管理" desc="搜索球员信息，支持公示/取消公示、修改、删除与账号密码重置" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable
    :columns="columns"
    :rows="rows"
    :actions="['修改', '删除', '公示', '取消公示', '重置密码']"
    @action="onAction"
  />
</template>
