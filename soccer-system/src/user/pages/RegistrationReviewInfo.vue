<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'

// 报名审核信息查看（对应需求：球队审核信息、按组别/市州查看球队报名信息公示）
const reviewColumns: TableColumn[] = [
  { key: 'tournament', label: '赛事' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'submitTime', label: '提交时间', width: '160px' },
  { key: 'step', label: '当前审核环节', width: '130px' },
  { key: 'status', label: '状态', width: '100px' },
  { key: 'opinion', label: '审核意见', width: '170px' },
]

const reviewRows = [
  { tournament: '2026 省级青少年足球联赛', group: '中学组', submitTime: '2026-10-12 16:30', step: '市州审核', status: '已通过', opinion: '材料齐全，同意报送' },
  { tournament: '2026 省级青少年足球联赛', group: '中学组', submitTime: '2026-10-14 09:10', step: '省级终审', status: '待审核', opinion: '—' },
]

const publicColumns: TableColumn[] = [
  { key: 'team', label: '球队名称' },
  { key: 'city', label: '市州', width: '110px' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'players', label: '报名人数', width: '100px' },
  { key: 'status', label: '公示状态', width: '100px' },
]

const publicRows = [
  { team: '实验中学足球队', city: '贵阳市', group: '中学组', players: 18, status: '已公示' },
  { team: '市二中足球队', city: '遵义市', group: '中学组', players: 16, status: '已公示' },
  { team: '师范附小足球队', city: '贵阳市', group: '小学组', players: 14, status: '待审核' },
]

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}
</script>

<template>
  <PageHeader title="报名审核信息" desc="查看球队报名的审核进度与意见，按组别、市州查看报名信息公示" />

  <p class="page-tip">流程：球队提交报名 → 市州/高校初审 → 省级终审 → 审核通过后报名信息自动进入公示。</p>

  <h3 class="section-title">我的报名审核信息</h3>
  <DataTable :columns="reviewColumns" :rows="reviewRows" :actions="['查看详情']" @action="onAction" />

  <h3 class="section-title">报名信息公示（按组别 / 市州）</h3>
  <DataTable :columns="publicColumns" :rows="publicRows" :actions="['查看公示']" @action="onAction" />
</template>
