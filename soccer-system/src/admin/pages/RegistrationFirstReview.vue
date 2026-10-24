<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'
import {
  downloadRegistrationWord,
  errMsg,
  fetchRegistrationDetail,
  fetchRegistrations,
  firstReview,
  type RegistrationList,
} from '../../api/registration'

// 报名初审（市州级）：核对本区域报名球队的报名信息与学籍材料。
// 列表由后端按登录管理员的数据域（region_code）自动过滤；
// 初审通过自动提交省级终审；驳回需注明原因退回球队。

const searchFields: SearchField[] = [
  { key: 'team', label: '球队名称', placeholder: '输入球队名称' },
  { key: 'group', label: '报名组别', type: 'select', options: ['小学组', '初中组', '高中组', '高校组'] },
]

const columns: TableColumn[] = [
  { key: 'team', label: '球队名称' },
  { key: 'tournament', label: '赛事', width: '200px' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'players', label: '人数', width: '70px' },
  { key: 'submitTime', label: '提交时间', width: '160px' },
  { key: 'status', label: '审核状态', width: '100px' },
]

/** 表格展示行（列表接口字段的子集） */
type Row = {
  id: number | null
  tournament_name: string
  team_name: string
  group_type_display: string
  player_count: number
  submit_time: string
  status: string
  status_display: string
}

const rows = ref<Row[]>([
  { id: null, tournament_name: '省青少年校园足球联赛（秋季）', team_name: '实验中学足球队', group_type_display: '初中组', player_count: 18, submit_time: '2026-10-16 14:20', status: 'pending_city_review', status_display: '待初审' },
  { id: null, tournament_name: '省青少年校园足球联赛（秋季）', team_name: '成都七中球队', group_type_display: '高中组', player_count: 20, submit_time: '2026-10-16 09:10', status: 'pending_city_review', status_display: '待初审' },
  { id: null, tournament_name: '省青少年足球冠军杯', team_name: '川师大队', group_type_display: '高校组', player_count: 22, submit_time: '2026-10-14 16:45', status: 'pending_province_review', status_display: '待终审' },
  { id: null, tournament_name: '省青少年校园足球联赛（秋季）', team_name: '实小少年队', group_type_display: '小学组', player_count: 12, submit_time: '2026-10-12 10:30', status: 'rejected', status_display: '已驳回' },
])

async function refresh() {
  const list = await fetchRegistrations()
  if (!list) return // 后端不可用：保留演示数据
  rows.value = list.map((r: RegistrationList) => ({
    id: r.id,
    tournament_name: r.tournament_name,
    team_name: r.team_name,
    group_type_display: r.group_type_display,
    player_count: r.player_count,
    submit_time: r.submit_time.slice(0, 16),
    status: r.status,
    status_display: r.status_display,
  }))
}

onMounted(refresh)

// 搜索：球队名称模糊 + 组别精确，前端过滤
const filters = ref<Record<string, string>>({})
const filteredRows = computed(() =>
  rows.value.filter((r) => {
    if (filters.value.team && !r.team_name.includes(filters.value.team.trim())) return false
    if (filters.value.group && r.group_type_display !== filters.value.group) return false
    return true
  }),
)

function onSearch(f: Record<string, string>) {
  filters.value = f
}

/** 查看材料：球员名单摘要 + 完整审核记录（驳回原因在此展示） */
async function viewDetail(row: Row) {
  if (row.id === null) {
    alert('当前为离线演示数据，无详情')
    return
  }
  const detail = await fetchRegistrationDetail(row.id)
  if (!detail) {
    alert('无法连接服务器，获取详情失败')
    return
  }
  const players = detail.registration_players
    .slice(0, 8)
    .map((p) => `${p.name}（${p.position}${p.jersey_number ? ' #' + p.jersey_number : ''}）`)
    .join('、')
  const playerLine = players
    ? `${players}${players.length > 8 ? ' …' : ''}（共 ${players.length} 人，明细见报名表）`
    : '（无球员名单）'
  const logs = detail.review_logs.length
    ? detail.review_logs
        .map((l) => `· [${l.created_at.slice(0, 16)}] ${l.stage === 'city' ? '市州初审' : '省级终审'}${l.result === 'approve' ? '通过' : '驳回'}（${l.operator_name}）${l.reason ? '：' + l.reason : ''}`)
        .join('\n')
    : '（暂无审核记录）'
  alert(`球队：${detail.team_name}（${detail.group_type_display}）\n负责人：${detail.leader_name} ${detail.phone}\n带队教练：${detail.coach_name}\n\n球员名单：${playerLine}\n\n审核记录：\n${logs}`)
}

async function onAction(action: string, row: Record<string, unknown>) {
  const r = row as unknown as Row
  if (action === '查看材料') {
    await viewDetail(r)
    return
  }
  if (action === '下载报名表') {
    if (r.id === null) {
      alert('当前为离线演示数据，无法下载')
      return
    }
    try {
      await downloadRegistrationWord(r.id, r.team_name)
    } catch (err) {
      alert(errMsg(err))
    }
    return
  }
  // 通过初审/驳回仅对待初审件开放（已提交省级/已通过的件不再重复审）
  if (r.status !== 'pending_city_review') {
    alert(`该报名件当前状态为「${r.status_display}」，无需初审`)
    return
  }
  if (r.id === null) {
    alert('当前为离线演示数据，无法操作')
    return
  }
  if (action === '通过初审') {
    if (!confirm(`确认通过「${r.team_name}」的初审？通过后将自动提交省级终审`)) return
    try {
      await firstReview(r.id, 'approve')
      await refresh()
    } catch (err) {
      alert(errMsg(err))
    }
    return
  }
  if (action === '驳回') {
    const reason = prompt(`驳回「${r.team_name}」的原因（必填，将推送给报送球队）：`)
    if (reason === null) return // 取消
    if (!reason.trim()) {
      alert('驳回必须填写原因')
      return
    }
    try {
      await firstReview(r.id, 'reject', reason.trim())
      await refresh()
    } catch (err) {
      alert(errMsg(err))
    }
  }
}
</script>

<template>
  <PageHeader title="报名初审" desc="市州初审：核对本区域报名球队的报名信息与学籍材料，通过后自动提交省级终审（数据来自后端）" />

  <p class="page-tip">
    初审要点：报名表信息完整性、球员学籍与注册状态、带队教练资质是否已生效。通过初审后自动提交超级管理员省级终审；
    驳回时需填写原因并推送给报送球队，球队修改后可重新提交。仅能查看与操作本区域的报名件。
  </p>

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable
    :columns="columns"
    :rows="filteredRows"
    :actions="['查看材料', '通过初审', '驳回', '下载报名表']"
    @action="onAction"
  />
</template>
