<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'
import { useAuth } from '../../stores/auth'
import {
  deleteRegistration,
  downloadRegistrationWord,
  errMsg,
  fetchRegistrations,
  fetchReviewLogs,
  type RegistrationList,
} from '../../api/registration'

// 我的报名：本队报名与审核状态（后端按登录球队负责人自动过滤），
// 待初审/已驳回状态可修改重新提交或删除；审核记录含各级驳回原因

const router = useRouter()
const auth = useAuth()

const searchFields: SearchField[] = [
  { key: 'team', label: '球队名称', placeholder: '输入球队名称' },
  { key: 'group', label: '报名组别', type: 'select', options: ['小学组', '初中组', '高中组', '高校组'] },
]

const columns: TableColumn[] = [
  { key: 'team', label: '球队名称' },
  { key: 'tournament', label: '赛事' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'players', label: '报名人数', width: '90px' },
  { key: 'submitTime', label: '提交时间', width: '160px' },
  { key: 'status', label: '审核状态', width: '100px' },
]

type Row = {
  id: number | null
  team_name: string
  tournament_name: string
  group_type_display: string
  player_count: number
  submit_time: string
  status: string
  status_display: string
}

const rows = ref<Row[]>([
  { id: null, team_name: '实验中学足球队', tournament_name: '省青少年校园足球联赛（秋季）', group_type_display: '初中组', player_count: 18, submit_time: '2026-10-16 14:20', status: 'pending_city_review', status_display: '待审核' },
  { id: null, team_name: '实验中学足球队', tournament_name: '省青少年足球冠军杯', group_type_display: '初中组', player_count: 16, submit_time: '2026-09-28 10:05', status: 'approved', status_display: '已通过' },
  { id: null, team_name: '实小少年队', tournament_name: '省青少年校园足球联赛（秋季）', group_type_display: '小学组', player_count: 12, submit_time: '2026-10-14 09:40', status: 'rejected', status_display: '已驳回' },
])

async function refresh() {
  const list = await fetchRegistrations()
  if (!list) return // 后端不可用：保留演示数据
  rows.value = list.map((r: RegistrationList) => ({
    id: r.id,
    team_name: r.team_name,
    tournament_name: r.tournament_name,
    group_type_display: r.group_type_display,
    player_count: r.player_count,
    submit_time: r.submit_time.slice(0, 16),
    status: r.status,
    status_display: r.status_display,
  }))
}

onMounted(refresh)

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

/** 查看审核：完整审核链（市州初审 → 省级终审），驳回原因直接可见 */
async function viewLogs(row: Row) {
  if (row.id === null) {
    alert('当前为离线演示数据，无审核记录')
    return
  }
  const logs = await fetchReviewLogs(row.id)
  if (!logs) {
    alert('无法连接服务器，获取审核记录失败')
    return
  }
  const text = logs.length
    ? logs
        .map((l) => `· [${l.created_at.slice(0, 16)}] ${l.stage === 'city' ? '市州初审' : '省级终审'}${l.result === 'approve' ? '通过' : '驳回'}（${l.operator_name}）${l.reason ? '：' + l.reason : ''}`)
        .join('\n')
    : '（暂无审核记录，等待市州管理员初审）'
  alert(`${row.team_name} 的审核记录：\n\n${text}`)
}

async function onAction(action: string, row: Record<string, unknown>) {
  const r = row as unknown as Row
  if (action === '查看审核') {
    await viewLogs(r)
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
  // 修改/删除：仅待初审或已驳回状态（后端同样校验）
  if (r.status !== 'pending_city_review' && r.status !== 'rejected') {
    alert(`该报名件当前状态为「${r.status_display}」，不可修改或删除`)
    return
  }
  if (r.id === null) {
    alert('当前为离线演示数据，无法操作')
    return
  }
  if (action === '修改') {
    // 跳转报名表单重新提交（提交后回到待初审）
    router.push('/user/registration-form')
    return
  }
  if (action === '删除') {
    if (!confirm(`确认删除报名件「${r.team_name}」？`)) return
    try {
      await deleteRegistration(r.id)
      await refresh()
    } catch (err) {
      alert(errMsg(err))
    }
  }
}
</script>

<template>
  <PageHeader title="我的报名" desc="查看本队报名审核状态，可按球队、组别、审核状态搜索，支持修改与删除（数据来自后端）" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable
    :columns="columns"
    :rows="filteredRows"
    :actions="['查看审核', '修改', '删除', '下载报名表']"
    @action="onAction"
  />
</template>
