<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'

// 赛事列表：浏览可报名赛事（对应需求：赛事列表信息）
const columns: TableColumn[] = [
  { key: 'name', label: '赛事名称' },
  { key: 'group', label: '组别', width: '110px' },
  { key: 'organizer', label: '主办单位' },
  { key: 'signTime', label: '报名时间', width: '200px' },
  { key: 'status', label: '状态', width: '100px' },
]

const tournaments = [
  { name: '2026 省青少年校园足球联赛（秋季）', group: '中学组', organizer: '省教育厅', signTime: '10-15 ~ 11-05', status: '报名中' },
  { name: '2026 省青少年校园足球联赛（秋季）', group: '小学组', organizer: '省教育厅', signTime: '10-15 ~ 11-05', status: '报名中' },
  { name: '2026 省大学生足球锦标赛', group: '高校组', organizer: '省体育局', signTime: '09-20 ~ 10-10', status: '进行中' },
  { name: '2026 省青少年足球冠军杯', group: '高中组', organizer: '省足协', signTime: '11-01 ~ 11-20', status: '未开始' },
]

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}
</script>

<template>
  <PageHeader title="赛事列表" desc="浏览正在报名和进行中的赛事，点击报名进入报名表单" />

  <DataTable
    :columns="columns"
    :rows="tournaments"
    :actions="['查看详情', '报名']"
    @action="onAction"
  />
</template>
