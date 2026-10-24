<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'
import { deleteUser, errMsg, fetchUsers, updateUser, type ApiUser } from '../../api/account'
import { fetchAuditLogs, type ApiAuditLog } from '../../api/system'

// 报名账号管理：各报送单位（球队负责人）报名账号的查询/修改/删除，
// 以及报名相关操作日志（复用操作日志接口，按关键词过滤报名类操作）。

const accountColumns: TableColumn[] = [
  { key: 'account', label: '账号', width: '140px' },
  { key: 'unit', label: '所属单位' },
  { key: 'role', label: '角色', width: '130px' },
  { key: 'createTime', label: '创建时间', width: '160px' },
  { key: 'status', label: '状态', width: '100px' },
]

interface AccountRow {
  id: number
  account: string
  unit: string
  role: string
  createTime: string
  status: string
  raw: ApiUser
}

const accounts = ref<AccountRow[]>([])

const logColumns: TableColumn[] = [
  { key: 'time', label: '操作时间', width: '170px' },
  { key: 'account', label: '账号', width: '140px' },
  { key: 'action', label: '操作内容' },
  { key: 'ip', label: 'IP 地址', width: '140px' },
]

interface LogRow {
  id: number
  time: string
  account: string
  action: string
  ip: string
}

const logs = ref<LogRow[]>([])

/** 视为报名相关操作的日志关键词 */
const REG_KEYWORDS = ['报名', '审核', '公示', '附件', '上传']

async function refresh() {
  const [userList, logList] = await Promise.all([fetchUsers({ role: 'school' }), fetchAuditLogs({ page_size: 50 })])
  if (userList) {
    accounts.value = userList.map((u: ApiUser) => ({
      id: u.id,
      account: u.username,
      unit: u.unit_name || u.real_name || '—',
      role: u.role_display,
      createTime: (u.date_joined || '').slice(0, 16).replace('T', ' '),
      status: u.is_active ? '已生效' : '已禁用',
      raw: u,
    }))
  }
  if (logList) {
    logs.value = logList
      .filter((l: ApiAuditLog) => REG_KEYWORDS.some((k) => l.action.includes(k)))
      .map((l: ApiAuditLog) => ({
        id: l.id,
        time: (l.created_at || '').slice(0, 16).replace('T', ' '),
        account: l.account,
        action: l.action,
        ip: l.ip || '—',
      }))
  }
}

onMounted(refresh)

async function onAction(action: string, row: Record<string, unknown>) {
  const r = row as unknown as AccountRow
  const u = r.raw
  if (action === '查询') {
    alert(
      `账号：${u.username}（${u.role_display}）\n姓名/单位名：${u.real_name || '—'}\n所属单位：${u.unit_name || '—'}` +
        `\n手机号：${u.phone || '—'}\n状态：${u.is_active ? '已生效' : '已禁用'}` +
        `\n创建时间：${(u.date_joined || '').slice(0, 16).replace('T', ' ')}`,
    )
    return
  }
  if (action === '修改') {
    const name = prompt('修改姓名/单位名（留空保持不变）', u.real_name)
    if (name === null) return
    const phone = prompt('修改预留手机号（留空保持不变）', u.phone)
    if (phone === null) return
    const payload: { real_name?: string; phone?: string } = {}
    if (name.trim()) payload.real_name = name.trim()
    if (phone.trim()) payload.phone = phone.trim()
    if (!Object.keys(payload).length) {
      alert('未做任何修改')
      return
    }
    try {
      await updateUser(r.id, payload)
      alert(`账户 ${r.account} 已更新`)
      refresh()
    } catch (err) {
      alert(errMsg(err))
    }
    return
  }
  if (action === '删除') {
    if (!confirm(`确定删除报名账号「${r.account}」？该单位的报名记录将失去关联账号，此操作不可恢复。`)) return
    try {
      await deleteUser(r.id)
      alert(`报名账号 ${r.account} 已删除`)
      refresh()
    } catch (err) {
      alert(errMsg(err))
    }
  }
}
</script>

<template>
  <PageHeader title="报名账号管理" desc="管理各报送单位的报名账号，查看报名操作日志" />

  <h3 class="section-title">报名账号</h3>
  <DataTable :columns="accountColumns" :rows="accounts" :actions="['查询', '修改', '删除']" @action="onAction" />

  <h3 class="section-title">报名日志</h3>
  <DataTable :columns="logColumns" :rows="logs" />
</template>
