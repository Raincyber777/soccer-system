<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, SearchField, TableColumn } from '../../components/common/types'
import {
  createUser,
  deleteUser,
  errMsg,
  fetchUsers,
  resetUserPassword,
  toggleUserActive,
  updateUser,
  type ApiUser,
} from '../../api/account'

// 用户账户管理（超级管理员）：全省范围的用户端账户管理，「删除账户」仅超管可执行。
// 登录 super 端的账户角色即省级管理员（admin），数据域覆盖全省。

const TYPE_TO_ROLE: Record<string, string> = {
  球队负责人: 'school',
  学生运动员: 'athlete',
  教练员: 'coach',
}
const USER_ROLES = ['school', 'athlete', 'coach', 'personal']
// 类型筛选沿用后端 role_display 文案；市州管理员账户仅支持查看与筛选，
// 开户走「管理员账户」页（需要选择所属市州）
const TYPE_FILTERS = ['球队负责人', '学生运动员', '教练员', '市州管理员']

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
  { key: 'type', label: '账户类型', type: 'select', options: ['全部', ...TYPE_FILTERS] },
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
    .filter((u: ApiUser) => USER_ROLES.includes(u.role) || u.role === 'city')
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
      alert(`账户 ${account} 已创建，请将初始密码告知报送单位`)
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
      `\n所属市州：${u.region_name || '—'}\n手机号：${u.phone || '—'}` +
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

async function onDelete(row: UserRow) {
  if (!confirm(`确定删除账户「${row.account}」？删除前请确认该账户无进行中的报名，此操作不可恢复。`)) return
  try {
    await deleteUser(row.id)
    alert(`账户 ${row.account} 已删除`)
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
  else if (action === '删除') onDelete(r)
}
</script>

<template>
  <PageHeader title="用户账户管理" desc="超级管理员专属：管理全省用户端账户，删除账户仅超管可执行" />

  <p class="page-tip">
    用户端账户的日常操作（开户、编辑、重置密码、禁用/启用）已下放各市州普通管理员（限本区域）；
    超级管理员负责全省范围的账户管理，并保留「删除账户」等高风险操作，删除前建议确认该账户无进行中的报名。
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
  <DataTable
    :columns="columns"
    :rows="displayRows"
    :actions="['查看', '编辑', '重置密码', '禁用/启用', '删除']"
    @action="onAction"
  />
</template>
