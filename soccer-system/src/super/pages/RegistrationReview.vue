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
  finalReview,
  type RegistrationList,
} from '../../api/registration'
import { promptDialog } from '../../components/common/dialog'

// 报名信息审核（省级终审）：复核经市州初审提交的报名件，
// 列表为全省数据（后端按 admin 角色返回）；通过即 approved 并进入公示。

const searchFields: SearchField[] = [
  { key: 'team', label: '球队名称', placeholder: '输入球队名称' },
  { key: 'group', label: '报名组别', type: 'select', options: ['小学组', '中学组', '高中组', '高校组'] },
]

const columns: TableColumn[] = [
  { key: 'team_name', label: '球队名称' },
  { key: 'city_name', label: '市州/单位', width: '110px' },
  { key: 'group_type_display', label: '组别', width: '90px' },
  { key: 'player_count', label: '人数', width: '70px' },
  { key: 'submit_time', label: '提交时间', width: '160px' },
  { key: 'status_display', label: '审核状态', width: '100px' },
]

type Row = {
  id: number | null
  team_name: string
  city_name: string
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
    city_name: r.city_name || '—',
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

/** 查看材料：报名信息 + 审核记录（含市州初审意见）+ 附件链接 */
async function viewDetail(row: Row) {
  if (row.id === null) {
    alert('报名详情获取失败，请稍后重试')
    return
  }
  const detail = await fetchRegistrationDetail(row.id)
  if (!detail) {
    alert('无法连接服务器，获取详情失败')
    return
  }
  const logs = detail.review_logs.length
    ? detail.review_logs
        .map((l) => `· [${l.created_at.slice(0, 16)}] ${l.stage === 'city' ? '市州初审' : '省级终审'}${l.result === 'approve' ? '通过' : '驳回'}（${l.operator_name}）${l.reason ? '：' + l.reason : ''}`)
        .join('\n')
    : '（暂无审核记录）'
  const files = [
    detail.player_excel && `报名表：${detail.player_excel}`,
    detail.photo_zip && `照片包：${detail.photo_zip}`,
    detail.stamp_file && `盖章件：${detail.stamp_file}`,
  ].filter(Boolean).join('\n')
  alert(`球队：${detail.team_name}（${detail.group_type_display} · ${detail.city_name}）\n负责人：${detail.leader_name} ${detail.phone}\n\n审核记录：\n${logs}${files ? `\n\n附件：\n${files}` : '\n\n（该报名件未上传附件材料）'}`)
}

async function onAction(action: string, row: Record<string, unknown>) {
  const r = row as unknown as Row
  if (action === '查看材料') {
    await viewDetail(r)
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
  // 终审仅对待终审件开放（已通过/已驳回不再重复审）
  if (r.status !== 'pending_province_review') {
    alert(`该报名件当前状态为「${r.status_display}」，无需终审`)
    return
  }
  if (r.id === null) {
    alert('数据未加载，请刷新后重试')
    return
  }
  if (action === '通过终审') {
    if (!confirm(`确认通过「${r.team_name}」的省级终审？通过后即正式获得参赛资格并进入公示`)) return
    try {
      await finalReview(r.id, 'approve')
      await refresh()
    } catch (err) {
      alert(errMsg(err))
    }
    return
  }
  if (action === '驳回') {
    const reason = await promptDialog({
      title: '驳回报名',
      message: `球队「${r.team_name}」的报名件将被驳回退回修改。`,
      label: '驳回原因（必填，将推送给报送单位）',
      multiline: true,
      required: true,
      requiredMsg: '驳回必须填写原因',
      placeholder: '如：报名人数与球员名单不符，请核对后重新提交',
      confirmText: '确认驳回',
      maxlength: 200,
    })
    if (reason === null) return
    try {
      await finalReview(r.id, 'reject', reason)
      await refresh()
    } catch (err) {
      alert(errMsg(err))
    }
  }
}
</script>

<template>
  <PageHeader title="报名信息审核" desc="省级终审：查询球队报名信息，执行通过/驳回，查看报名材料与审核记录" />

  <p class="page-tip">
    本页复核经市州管理员初审（管理员端【报名初审】）提交的报名件；驳回时需填写驳回原因，原因将推送给报送单位；
    「下载报名表」导出球员报名信息表（CSV，Excel/WPS 可直接打开）。
  </p>

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable
    :columns="columns"
    :rows="filteredRows"
    :actions="['通过终审', '驳回', '查看材料', '下载报名表']"
    @action="onAction"
  />
</template>
