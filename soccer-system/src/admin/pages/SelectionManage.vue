<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'

// 遴选管理（对应需求：初选/复选档案评分、评分修改/汇总/导出、各组别最佳球员遴选结果）
const searchFields: SearchField[] = [
  { key: 'name', label: '球员姓名', placeholder: '输入球员姓名' },
  { key: 'group', label: '组别', type: 'select', options: ['高校组', '中学组', '小学组'] },
]

const primaryColumns: TableColumn[] = [
  { key: 'name', label: '球员', width: '100px' },
  { key: 'team', label: '队伍' },
  { key: 'skill', label: '技评得分', width: '90px' },
  { key: 'physical', label: '体能得分', width: '90px' },
  { key: 'total', label: '总分', width: '80px' },
  { key: 'status', label: '状态', width: '100px' },
]

const primaryRows = [
  { name: '王小磊', team: '实验中学足球队', skill: 92, physical: 88, total: 90.0, status: '已通过' },
  { name: '周子豪', team: '市二中足球队', skill: 89, physical: 85, total: 87.2, status: '已通过' },
  { name: '陈昊', team: '实验中学足球队', skill: 80, physical: 84, total: 81.6, status: '待审核' },
]

const resultColumns: TableColumn[] = [
  { key: 'group', label: '组别', width: '100px' },
  { key: 'name', label: '最佳球员' },
  { key: 'team', label: '队伍' },
  { key: 'score', label: '综合得分', width: '100px' },
]

const resultRows = [
  { group: '高校组', name: '待生成', team: '—', score: '—' },
  { group: '中学组', name: '王小磊', team: '实验中学足球队', score: 90.0 },
  { group: '小学组', name: '待生成', team: '—', score: '—' },
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
  <PageHeader title="遴选管理" desc="足球遴选队员初选/复选评分管理与汇总导出，生成各组别最佳球员遴选结果" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <h3 class="section-title">初选评分</h3>
  <DataTable
    :columns="primaryColumns"
    :rows="primaryRows"
    :actions="['评分', '修改', '汇总', '导出']"
    @action="onAction"
  />

  <h3 class="section-title">复选评分</h3>
  <DataTable
    :columns="primaryColumns"
    :rows="primaryRows.slice(0, 2)"
    :actions="['评分', '修改', '汇总', '导出']"
    @action="onAction"
  />

  <h3 class="section-title">最佳球员遴选结果</h3>
  <DataTable
    :columns="resultColumns"
    :rows="resultRows"
    :actions="['生成结果']"
    @action="onAction"
  />
</template>
