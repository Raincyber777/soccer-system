<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, SearchField, TableColumn } from '../../components/common/types'
import { SICHUAN_CITIES } from '../../data/sichuan-schools'
import {
  createUser,
  deleteUser,
  errMsg,
  fetchUsers,
  resetUserPassword,
  toggleUserActive,
  type ApiUser,
} from '../../api/account'

// 管理员账户管理（超级管理员专属）：创建/禁用/删除管理员账户、重置密码。
// 角色对齐后端：市级审核员=city、省级管理员=admin；市州区划用 GB/T 2260 代码。

const ROLE_TO_API: Record<string, string> = { 市级审核员: 'city', 省级管理员: 'admin' }
const CITY_TO_CODE = new Map(SICHUAN_CITIES.map((c) => [c.name, c.code]))
const ADMIN_ROLES = ['admin', 'city', 'province']

const formFields: FormField[] = [
  { key: 'account', label: '登录账号', placeholder: '如：cd_shi_zhen02' },
  { key: 'name', label: '姓名' },
  { key: 'unit', label: '所属单位', placeholder: '如：成都市教育局' },
  { key: 'city', label: '所属市州', type: 'select', options: SICHUAN_CITIES.map((c) => c.name), placeholder: '请选择市州' },
  { key: 'role', label: '管理员角色', type: 'select', options: Object.keys(ROLE_TO_API), placeholder: '请选择角色' },
  { key: 'password', label: '初始密码', placeholder: '至少 6 位，首次登录建议修改' },
]

const searchFields: SearchField[] = [
  { key: 'keyword', label: '账号/姓名', placeholder: '输入账号或姓名' },
  { key: 'role', label: '角色', type: 'select', options: ['全部', '市级审核员', '省级管理员', '省级内容发布'] },
]

const columns: TableColumn[] = [
  { key: 'account', label: '账号', width: '130px' },
  { key: 'name', label: '姓名', width: '100px' },
  { key: 'unit', label: '所属单位' },
  { key: 'city', label: '所属市州', width: '100px' },
  { key: 'role', label: '角色', width: '110px' },
  { key: 'status', label: '状态', width: '90px' },
]

interface AdminRow {
  id: number
  account: string
  name: string
  unit: string
  city: string
  role: string
  status: string
  raw: ApiUser
}

const rows = ref<AdminRow[]>([])
const filters = ref<Record<string, string>>({})
const displayRows = computed(() =>
  rows.value.filter((r) => {
    if (filters.value.keyword) {
      const kw = filters.value.keyword.trim()
      if (kw && !r.account.includes(kw) && !r.name.includes(kw)) return false
    }
    if (filters.value.role && filters.value.role !== '全部' && r.role !== filters.value.role) return false
    return true
  }),
)

async function refresh() {
  const list = await fetchUsers()
  if (!list) return // 后端不可用：保留演示数据
  rows.value = list
    .filter((u: ApiUser) => ADMIN_ROLES.includes(u.role))
    .map((u: ApiUser) => ({
      id: u.id,
      account: u.username,
      name: u.real_name || u.username,
      unit: u.unit_name || '—',
      city: u.region_name || '省本级',
      role: u.role_display,
      status: u.is_active ? '已生效' : '已禁用',
      raw: u,
    }))
}

onMounted(refresh)

function onSearch(f: Record<string, string>) {
  filters.value = f
}

async function onSubmit(data: Record<string, string>) {
  const account = data.account?.trim() ?? ''
  const name = data.name?.trim() ?? ''
  if (!account || !name) {
    alert('请填写登录账号与姓名')
    return
  }
  const role = ROLE_TO_API[data.role ?? '']
  if (!role) {
    alert('请选择管理员角色')
    return
  }
  const password = data.password ?? ''
  if (password.length < 6) {
    alert('初始密码至少 6 位')
    return
  }
  try {
    await createUser({
      username: account,
      password,
      real_name: name,
      role,
      unit_name: data.unit?.trim() ?? '',
      phone: '',
      region_code: CITY_TO_CODE.get(data.city ?? '') ?? undefined,
    })
    alert(`管理员账户 ${account} 已创建`)
    refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

function onView(row: AdminRow) {
  const u = row.raw
  alert(
    `账号：${u.username}（${u.role_display}）\n姓名：${u.real_name || '—'}\n所属单位：${u.unit_name || '—'}` +
      `\n所属市州：${u.region_name || '省本级'}\n手机号：${u.phone || '—'}` +
      `\n状态：${u.is_active ? '已生效' : '已禁用'}\n创建时间：${(u.date_joined || '').slice(0, 16).replace('T', ' ')}`,
  )
}

async function onReset(row: AdminRow) {
  if (!confirm(`确认重置「${row.account}」的密码为初始密码？`)) return
  try {
    const r = await resetUserPassword(row.id)
    alert(r.detail || '密码已重置')
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onToggle(row: AdminRow) {
  try {
    const r = await toggleUserActive(row.id)
    alert(r.detail || '操作成功')
    refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onDelete(row: AdminRow) {
  if (row.raw.is_superuser) {
    alert('超级管理员账户不可删除')
    return
  }
  if (!confirm(`确定删除管理员账户「${row.account}」？建议先禁用观察一段时间，此操作不可恢复。`)) return
  try {
    await deleteUser(row.id)
    alert(`账户 ${row.account} 已删除`)
    refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

function onAction(action: string, row: Record<string, unknown>) {
  const r = row as unknown as AdminRow
  if (action === '查看') onView(r)
  else if (action === '重置密码') onReset(r)
  else if (action === '禁用/启用') onToggle(r)
  else if (action === '删除') onDelete(r)
}
</script>

<template>
  <PageHeader title="管理员账户管理" desc="超级管理员专属：创建、禁用与删除管理员账户并重置密码" />

  <p class="page-tip">
    超级管理员账户不可删除；删除操作建议先禁用观察一段时间，重要操作会记入操作日志。
    市级审核员开户后仅能查看与操作本市州的报名与球队数据。
  </p>

  <h3 class="section-title">创建管理员账户</h3>
  <DataForm :fields="formFields" submit-text="创建账户" @submit="onSubmit" />

  <h3 class="section-title">管理员账户列表</h3>
  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />
  <DataTable
    :columns="columns"
    :rows="displayRows"
    :actions="['查看', '重置密码', '禁用/启用', '删除']"
    @action="onAction"
  />
</template>
