<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, SearchField, TableColumn } from '../../components/common/types'
import {
  createUser,
  errMsg,
  fetchUsers,
  resetUserPassword,
  toggleUserActive,
  updateUser,
  type ApiUser,
} from '../../api/account'

// 用户账户管理：本区域用户端账户的日常操作（开户/编辑/重置密码/禁用启用）。
// 数据域由后端按登录角色过滤（市州管理员仅本区域）；「删除账户」与管理员账户管理收口超管。

const TYPE_TO_ROLE: Record<string, string> = {
  球队账号: 'school',
  运动员账号: 'athlete',
  教练员账号: 'coach',
}
const USER_ROLES = ['school', 'athlete', 'coach', 'personal']

const formFields: FormField[] = [
  { key: 'account', label: '登录账号', placeholder: '如：szyds_zq02' },
  { key: 'name', label: '姓名 / 单位名' },
  { key: 'type', label: '账户类型', type: 'select', options: Object.keys(TYPE_TO_ROLE), placeholder: '请选择账户类型' },
  { key: 'unit', label: '所属单位', placeholder: '学校 / 单位名称' },
  { key: 'phone', label: '预留手机号' },
  { key: 'password', label: '初始密码', placeholder: '至少 6 位；编辑时留空则不修改' },
]

const searchFields: SearchField[] = [
  { key: 'keyword', label: '账号/姓名', placeholder: '输入账号或姓名' },
  { key: 'type', label: '账户类型', type: 'select', options: ['全部', ...Object.keys(TYPE_TO_ROLE)] },
]

const columns: TableColumn[] = [
  { key: 'account', label: '账号', width: '140px' },
  { key: 'name', label: '姓名 / 单位名' },
  { key: 'type', label: '类型', width: '110px' },
  { key: 'unit', label: '所属单位', width: '150px' },
  { key: 'city', label: '所属市州', width: '100px' },
  { key: 'status', label: '状态', width: '90px' },
]

interface UserRow {
  id: number
  account: string
  name: string
  type: string
  unit: string
  city: string
  status: string
  raw: ApiUser
}

const rows = ref<UserRow[]>([])
const filters = ref<Record<string, string>>({})
const displayRows = computed(() =>
  rows.value.filter((r) => {
    if (filters.value.keyword) {
      const kw = filters.value.keyword.trim()
      if (kw && !r.account.includes(kw) && !r.name.includes(kw)) return false
    }
    if (filters.value.type && filters.value.type !== '全部' && r.type !== filters.value.type) return false
    return true
  }),
)

const editingId = ref<number | null>(null)
const formInitial = ref<Record<string, string>>({})
const formKey = ref(0)

async function refresh() {
  const list = await fetchUsers()
  if (!list) return
  rows.value = list
    .filter((u: ApiUser) => USER_ROLES.includes(u.role))
    .map((u: ApiUser) => ({
      id: u.id,
      account: u.username,
      name: u.real_name || u.username,
      type: u.role_display,
      unit: u.unit_name || '—',
      city: u.region_name || '—',
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
    alert('请填写登录账号与姓名/单位名')
    return
  }
  try {
    if (editingId.value) {
      // 编辑不改动账号与角色，只维护资料；密码留空则不修改
      await updateUser(editingId.value, {
        real_name: name,
        unit_name: data.unit?.trim() ?? '',
        phone: data.phone?.trim() ?? '',
      })
      alert('账户资料已更新')
    } else {
      const role = TYPE_TO_ROLE[data.type ?? '']
      if (!role) {
        alert('请选择账户类型')
        return
      }
      const password = data.password ?? ''
      if (password.length < 6) {
        alert('初始密码至少 6 位')
        return
      }
      await createUser({
        username: account,
        password,
        real_name: name,
        role,
        unit_name: data.unit?.trim() ?? '',
        phone: data.phone?.trim() ?? '',
      })
      alert(`账户 ${account} 已创建，初始密码为设置的密码`)
    }
    onCancelEdit()
    refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

function onEdit(row: UserRow) {
  editingId.value = row.id
  formInitial.value = {
    account: row.account,
    name: row.raw.real_name,
    type: row.type,
    unit: row.raw.unit_name,
    phone: row.raw.phone,
  }
  formKey.value++
}

function onCancelEdit() {
  editingId.value = null
  formInitial.value = {}
  formKey.value++
}

function onView(row: UserRow) {
  const u = row.raw
  alert(
    `账号：${u.username}（${u.role_display}）\n姓名/单位名：${u.real_name || '—'}\n所属单位：${u.unit_name || '—'}` +
      `\n所属市州：${u.region_name || '—'}\n手机号：${u.phone || '—'}\n邮箱：${u.email || '—'}` +
      `\n状态：${u.is_active ? '已生效' : '已禁用'}\n创建时间：${(u.date_joined || '').slice(0, 16).replace('T', ' ')}`,
  )
}

async function onReset(row: UserRow) {
  if (!confirm(`确认重置「${row.account}」的密码为初始密码？`)) return
  try {
    const r = await resetUserPassword(row.id)
    alert(r.detail || '密码已重置')
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onToggle(row: UserRow) {
  try {
    const r = await toggleUserActive(row.id)
    alert(r.detail || '操作成功')
    refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

function onAction(action: string, row: Record<string, unknown>) {
  const r = row as unknown as UserRow
  if (action === '查看') onView(r)
  else if (action === '编辑') onEdit(r)
  else if (action === '重置密码') onReset(r)
  else if (action === '禁用/启用') onToggle(r)
}
</script>

<template>
  <PageHeader title="用户账户管理" desc="本区域用户端账户的日常管理：开户、编辑资料、重置密码、禁用/启用" />

  <p class="page-tip">
    权限说明：用户账户的日常操作由管理员直接办理；数据范围由登录角色决定（市州管理员仅本区域）。
    「删除账户」与「管理员账户管理」由超级管理员执行。禁用/启用为可逆操作，会记入操作日志。
  </p>

  <h3 class="section-title">{{ editingId ? '编辑用户账户' : '创建用户账户' }}</h3>
  <DataForm
    :key="formKey"
    :fields="formFields"
    :initial="formInitial"
    :submit-text="editingId ? '保存修改' : '创建账户'"
    @submit="onSubmit"
  />
  <button v-if="editingId" type="button" class="btn btn-ghost" @click="onCancelEdit">取消编辑</button>

  <h3 class="section-title">用户账户列表</h3>
  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />
  <DataTable :columns="columns" :rows="displayRows" :actions="['查看', '编辑', '重置密码', '禁用/启用']" @action="onAction" />
</template>
