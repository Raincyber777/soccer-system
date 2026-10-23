<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'

// 复选评分（对应需求：复选档案评分、评分修改、评分汇总、评分导出）
const searchFields: SearchField[] = [
  { key: 'name', label: '球员姓名', placeholder: '输入球员姓名' },
  { key: 'group', label: '组别', type: 'select', options: ['高校组', '中学组', '小学组'] },
]

const columns: TableColumn[] = [
  { key: 'name', label: '球员', width: '100px' },
  { key: 'team', label: '队伍' },
  { key: 'skill', label: '技评得分', width: '90px' },
  { key: 'physical', label: '体能得分', width: '90px' },
  { key: 'total', label: '总分', width: '80px' },
  { key: 'status', label: '状态', width: '100px' },
]

const rows = [
  { name: '王小磊', team: '实验中学足球队', skill: 94, physical: 90, total: 92.4, status: '已通过' },
  { name: '周子豪', team: '市二中足球队', skill: 88, physical: 86, total: 87.2, status: '待审核' },
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
  <PageHeader title="复选评分" desc="足球遴选队员复选档案评分、评分修改、汇总与导出" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable
    :columns="columns"
    :rows="rows"
    :actions="['评分', '修改', '汇总', '导出']"
    @action="onAction"
  />
</template>
