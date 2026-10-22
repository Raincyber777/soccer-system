<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'

// 赛事结果发布管理（对应需求：发布/修改/删除/查看赛事结果）
const columns: TableColumn[] = [
  { key: 'match', label: '场次' },
  { key: 'score', label: '比分', width: '110px' },
  { key: 'group', label: '组别', width: '100px' },
  { key: 'time', label: '完赛时间', width: '160px' },
  { key: 'status', label: '发布状态', width: '100px' },
]

const rows = [
  { match: '高校组 第 1 轮：四川大学 vs 川师大队', score: '2 : 0', group: '高校组', time: '2026-10-18 17:00', status: '已发布' },
  { match: '小学组 第 1 轮：实小少年队 vs 城关小学', score: '5 : 2', group: '小学组', time: '2026-10-12 11:30', status: '已发布' },
  { match: '中学组 第 2 轮：一中 vs 师大附中', score: '1 : 1', group: '中学组', time: '2026-10-19 17:10', status: '待审核' },
]

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}
</script>

<template>
  <PageHeader title="赛果发布管理" desc="审核并发布比赛结果，门户同步更新积分与战绩" />

  <DataTable :columns="columns" :rows="rows" :actions="['查看', '发布', '修改', '删除']" @action="onAction" />
</template>
