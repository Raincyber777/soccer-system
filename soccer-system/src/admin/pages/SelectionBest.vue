<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'

// 最佳球员遴选结果（对应需求：生成高校组/中学组/小学组最佳球员遴选结果）
const columns: TableColumn[] = [
  { key: 'group', label: '组别', width: '100px' },
  { key: 'name', label: '最佳球员' },
  { key: 'team', label: '队伍' },
  { key: 'score', label: '综合得分', width: '100px' },
  { key: 'status', label: '公示状态', width: '100px' },
]

const rows = [
  { group: '高校组', name: '待生成', team: '—', score: '—', status: '未生成' },
  { group: '中学组', name: '王小磊', team: '实验中学足球队', score: 92.4, status: '已公示' },
  { group: '小学组', name: '待生成', team: '—', score: '—', status: '未生成' },
]

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}
</script>

<template>
  <PageHeader title="最佳球员遴选结果" desc="按高校组、中学组、小学组分别生成并公示最佳球员遴选结果" />

  <DataTable :columns="columns" :rows="rows" :actions="['生成结果', '公示']" @action="onAction" />
</template>
