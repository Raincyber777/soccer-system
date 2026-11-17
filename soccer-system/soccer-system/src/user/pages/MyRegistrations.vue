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
  { key: 'group', label: '报名组别', type: 'select', options: ['小学组', '中学组', '高中组', '高校组'] },
]

const columns: TableColumn[] = [
  { key: 'team_name', label: '球队名称' },
  { key: 'tournament_name', label: '赛事' },
  { key: 'group_type_display', label: '组别', width: '90px' },
  { key: 'player_count', label: '报名人数', width: '90px' },
  { key: 'submit_time', label: '提交时间', width: '160px' },
  { key: 'status_display', label: '审核状态', width: '100px' },
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

const rows = ref<Row[]>([])

async function refresh() {
  const list = await fetchRegistrations()
  if (!list) return
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
    alert('审核记录获取失败，请稍后重试')
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
      alert('附件获取失败，无法下载')
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
    alert('数据未加载，请刷新后重试')
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
  <PageHeader title="我的报名" desc="查看本队报名审核状态，可按球队、组别、审核状态搜索，支持修改与删除" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable
    :columns="columns"
    :rows="filteredRows"
    :actions="['查看审核', '修改', '删除', '下载报名表']"
    @action="onAction"
  />
</template>
