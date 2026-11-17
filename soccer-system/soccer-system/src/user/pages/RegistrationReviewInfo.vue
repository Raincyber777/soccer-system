<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'
import { fetchRegistrations, fetchReviewLogs, type RegistrationList, type ReviewLogItem } from '../../api/registration'

// 报名审核信息：我的报名两级审核进度 + 已通过报名的公示信息。
// 审核记录（含驳回原因）通过 /review-logs/ 按报名件查看。

const reviewColumns: TableColumn[] = [
  { key: 'tournament', label: '赛事' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'submitTime', label: '提交时间', width: '160px' },
  { key: 'step', label: '当前审核环节', width: '130px' },
  { key: 'status', label: '状态', width: '100px' },
]

type ReviewRow = {
  id: number
  tournament: string
  group: string
  submitTime: string
  step: string
  status: string
  raw: RegistrationList
}

const reviewRows = ref<ReviewRow[]>([])

const publicColumns: TableColumn[] = [
  { key: 'team', label: '球队名称' },
  { key: 'city', label: '市州', width: '110px' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'players', label: '报名人数', width: '100px' },
  { key: 'status', label: '公示状态', width: '100px' },
]

type PublicRow = {
  id: number
  team: string
  city: string
  group: string
  players: number
  status: string
}

/** 公示区：审核通过的报名（通过后自动进入公示） */
const publicRows = computed<PublicRow[]>(() =>
  reviewRows.value
    .filter((r) => r.raw.status === 'approved')
    .map((r) => ({
      id: r.id,
      team: r.raw.team_name,
      city: r.raw.city_name || '—',
      group: r.raw.group_type_display,
      players: r.raw.player_count,
      status: '已公示',
    })),
)

function stepOf(r: RegistrationList): string {
  if (r.status === 'pending_city_review') return '市州初审'
  if (r.status === 'pending_province_review') return '省级终审'
  if (r.status === 'approved') return '已完成'
  return '已驳回'
}

async function refresh() {
  const list = await fetchRegistrations()
  if (!list) return
  reviewRows.value = list.map((r: RegistrationList) => ({
    id: r.id,
    tournament: r.tournament_name,
    group: r.group_type_display,
    submitTime: (r.submit_time || '').slice(0, 16).replace('T', ' '),
    step: stepOf(r),
    status: r.status_display,
    raw: r,
  }))
}

onMounted(refresh)

async function onViewDetail(row: Record<string, unknown>) {
  const r = row as unknown as ReviewRow
  const logs = (await fetchReviewLogs(r.id)) ?? []
  const lines = logs.map((l: ReviewLogItem) => {
    const result = l.result === 'approve' ? '通过' : '驳回'
    return `${(l.created_at || '').slice(0, 16).replace('T', ' ')}【${l.stage === 'final' ? '省级终审' : '市州初审'}·${result}】${l.operator_name}${l.reason ? '：' + l.reason : ''}`
  })
  alert(
    `${r.raw.tournament_name} · ${r.raw.team_name}（${r.raw.group_type_display}）\n当前状态：${r.status}（${r.step}）` +
      (lines.length ? '\n\n' + lines.join('\n') : '\n\n暂无审核记录'),
  )
}

function onAction(action: string, row: Record<string, unknown>) {
  if (action === '查看详情') onViewDetail(row)
  else if (action === '查看公示') onViewDetail(row)
}
</script>

<template>
  <PageHeader title="报名审核信息" desc="查看球队报名的审核进度与意见，审核通过的报名自动进入公示" />

  <p class="page-tip">流程：球队提交报名 → 市州/高校初审 → 省级终审 → 审核通过后报名信息自动进入公示。</p>

  <h3 class="section-title">我的报名审核信息</h3>
  <DataTable :columns="reviewColumns" :rows="reviewRows" :actions="['查看详情']" @action="onAction" />

  <h3 class="section-title">已通过报名公示</h3>
  <DataTable :columns="publicColumns" :rows="publicRows" :actions="['查看公示']" @action="onAction" />
</template>
