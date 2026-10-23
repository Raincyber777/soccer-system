<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'

// 赛事最佳阵容管理（对应需求：发布/修改/删除/查看最佳阵容、按赛事类别搜索）
const searchFields: SearchField[] = [
  { key: 'group', label: '赛事类别', type: 'select', options: ['高校组', '中学组', '小学组'] },
  { key: 'round', label: '轮次', placeholder: '如：第 3 轮' },
]

const columns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '110px' },
  { key: 'team', label: '所属球队' },
  { key: 'position', label: '位置', width: '100px' },
  { key: 'group', label: '赛事类别', width: '110px' },
  { key: 'status', label: '状态', width: '90px' },
]

const rows = [
  { name: '王小磊', team: '实验中学足球队', position: '前锋', group: '中学组', status: '已发布' },
  { name: '李泽宇', team: '实验中学足球队', position: '中场', group: '中学组', status: '已发布' },
  { name: '赵一鸣', team: '四川大学队', position: '后卫', group: '高校组', status: '待审核' },
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
  <PageHeader title="最佳阵容管理" desc="按轮次发布每轮最佳阵容，可按赛事类别搜索" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable
    :columns="columns"
    :rows="rows"
    :actions="['查看', '发布', '修改', '删除']"
    @action="onAction"
  />

  <div class="add-row">
    <button type="button" class="btn btn-primary" @click="onAction('新增最佳阵容')">＋ 新增最佳阵容</button>
  </div>
</template>

<style scoped>
.add-row {
  margin-top: 16px;
}
</style>
