<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'

// 报名初审（市州级）：核对本区域报名球队的报名信息与学籍材料
// 初审通过自动提交省级终审（超级管理员端【报名信息审核】）；驳回需注明原因退回球队
const searchFields: SearchField[] = [
  { key: 'team', label: '球队名称', placeholder: '输入球队名称' },
  { key: 'group', label: '报名组别', type: 'select', options: ['小学组', '中学组', '高中组', '高校组'] },
  { key: 'status', label: '初审状态', type: 'select', options: ['待初审', '已提交省级', '已驳回'] },
]

const columns: TableColumn[] = [
  { key: 'team', label: '球队名称' },
  { key: 'unit', label: '所属学校', width: '130px' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'players', label: '人数', width: '70px' },
  { key: 'submitTime', label: '提交时间', width: '160px' },
  { key: 'status', label: '初审状态', width: '110px' },
]

// 模拟数据：仅当前管理员所在市州（成都市）的报名件；接入后端时按数据域权限过滤
const rows = [
  { team: '实验中学足球队', unit: '实验中学', group: '中学组', players: 18, submitTime: '2026-10-16 14:20', status: '待初审' },
  { team: '成都七中球队', unit: '成都七中', group: '高中组', players: 20, submitTime: '2026-10-16 09:10', status: '待初审' },
  { team: '川师大队', unit: '四川师范大学', group: '高校组', players: 22, submitTime: '2026-10-14 16:45', status: '已提交省级' },
  { team: '银杏中学队', unit: '银杏中学', group: '中学组', players: 16, submitTime: '2026-10-12 10:30', status: '已驳回' },
]

function onSearch(filters: Record<string, string>) {
  console.log('搜索条件：', filters)
  alert('【演示】搜索：待接入后端')
}

function onAction(action: string, row: Record<string, unknown>) {
  alert(`【演示】${action}：${String(row.team ?? '')}，待接入后端`)
}
</script>

<template>
  <PageHeader title="报名初审" desc="市州初审：核对本区域报名球队的报名信息与学籍材料，通过后自动提交省级终审" />

  <p class="page-tip">
    初审要点：报名表信息完整性、球员学籍与注册状态、带队教练资质是否已生效。通过初审后自动提交超级管理员省级终审；
    驳回时需填写原因并推送给报送球队，球队修改后可重新提交。仅能查看与操作本区域（成都市）的报名件。
  </p>

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable
    :columns="columns"
    :rows="rows"
    :actions="['查看材料', '通过初审', '驳回']"
    @action="onAction"
  />
</template>
