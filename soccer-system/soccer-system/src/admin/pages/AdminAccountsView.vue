<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'
import { fetchUsers, type ApiUser } from '../../api/account'

// 管理员账户（只读）：查看同一市州内其他管理员的基本信息，便于工作沟通。
// 后端按登录角色给数据域（市州管理员仅本区域），本页只读不提供任何写操作。

const searchFields: SearchField[] = [
  { key: 'keyword', label: '姓名/账号', placeholder: '输入姓名或账号' },
  { key: 'role', label: '角色', type: 'select', options: ['全部', '市州管理员', '省级管理员', '省级内容发布'] },
]

const columns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '100px' },
  { key: 'account', label: '账号', width: '130px' },
  { key: 'phone', label: '联系方式', width: '140px' },
  { key: 'unit', label: '所属机构' },
  { key: 'role', label: '角色', width: '110px' },
  { key: 'city', label: '所属市州', width: '100px' },
]

interface AdminRow {
  id: number
  name: string
  account: string
  phone: string
  unit: string
  role: string
  city: string
  raw: ApiUser
}

const rows = ref<AdminRow[]>([])
const filters = ref<Record<string, string>>({})
const displayRows = computed(() =>
  rows.value.filter((r) => {
    if (filters.value.keyword) {
      const kw = filters.value.keyword.trim()
      if (kw && !r.name.includes(kw) && !r.account.includes(kw)) return false
    }
    if (filters.value.role && filters.value.role !== '全部' && r.role !== filters.value.role) return false
    return true
  }),
)

async function refresh() {
  const list = await fetchUsers({ role: 'city' })
  if (!list) return
  rows.value = list
    .filter((u: ApiUser) => ['city', 'admin', 'province'].includes(u.role))
    .map((u: ApiUser) => ({
      id: u.id,
      name: u.real_name || u.username,
      account: u.username,
      phone: u.phone || '—',
      unit: u.unit_name || '—',
      role: u.role_display,
      city: u.region_name || '省本级',
      raw: u,
    }))
}

onMounted(refresh)

function onSearch(f: Record<string, string>) {
  filters.value = f
}

function onView(action: string, row: Record<string, unknown>) {
  const r = row as unknown as AdminRow
  const u = r.raw
  alert(
    `${r.name} 的基本信息（仅限同级可见字段）\n账号：${u.username}\n联系方式：${r.phone}\n所属机构：${r.unit}` +
      `\n角色：${r.role}\n所属市州：${r.city}\n\n审核记录、操作日志、账号密码等敏感信息不可见，管理员账户的变更由超级管理员执行。`,
  )
}
</script>

<template>
  <PageHeader title="管理员账户（只读）" desc="查看同一市州内其他管理员的基本信息，便于工作沟通" />

  <p class="page-tip">
    同级管理员可见性规则：同一市州的管理员可以互相查看「姓名、联系方式、所属机构、角色」等基本信息，便于沟通协作；
    但不能互相操作（改账号、重置密码、禁用删除），也看不到彼此的审核记录与业务数据；不同市州的管理员完全隔离、互不可见。
    管理员账户的创建、修改、禁用、删除统一由超级管理员执行。
  </p>

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable :columns="columns" :rows="displayRows" :actions="['查看']" @action="onView" />
</template>
