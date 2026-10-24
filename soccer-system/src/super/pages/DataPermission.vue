<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'
import { fetchUsers, type ApiUser } from '../../api/account'

// 跨区数据权限：数据域由「角色 + 所属市州」自动决定（后端 apply_region_scope），
// 无需手工配置，本页展示各市州审核员分布供核对。

const columns: TableColumn[] = [
  { key: 'city', label: '市州' },
  { key: 'admins', label: '审核员数', width: '90px' },
  { key: 'members', label: '审核员名单' },
  { key: 'status', label: '数据域', width: '150px' },
]

interface ScopeRow {
  city: string
  admins: number
  members: string
  status: string
  users: ApiUser[]
}

const rows = ref<ScopeRow[]>([])

async function refresh() {
  const list = await fetchUsers({ role: 'city' })
  if (!list) return // 后端不可用：保留演示数据
  const groups = new Map<string, ApiUser[]>()
  list.forEach((u: ApiUser) => {
    const key = u.region_name || '未分配市州'
    const bucket = groups.get(key)
    if (bucket) bucket.push(u)
    else groups.set(key, [u])
  })
  rows.value = [...groups.entries()]
    .map(([city, users]) => ({
      city,
      admins: users.length,
      members: users.map((u) => u.real_name || u.username).join('、'),
      status: city === '未分配市州' ? '待补归属' : '本市州数据',
      users,
    }))
    .sort((a, b) => a.city.localeCompare(b.city, 'zh'))
}

onMounted(refresh)

function onAction(action: string, row: Record<string, unknown>) {
  if (action !== '查看明细') return
  const r = row as unknown as ScopeRow
  const lines = r.users.map(
    (u) => `${u.username}（${u.real_name || '未填姓名'} · ${u.is_active ? '已生效' : '已禁用'}）`,
  )
  alert(`「${r.city}」审核员 ${r.admins} 人，可见范围：本市州的报名与球队数据\n${lines.join('\n')}`)
}
</script>

<template>
  <PageHeader title="跨区数据权限" desc="查看各市州审核员的数据可见范围，防止跨区查看与操作" />

  <p class="page-tip">
    默认规则：市州审核员仅能查看本市州的报名与球队数据，由「角色 + 所属市州」自动决定，无需手工开通；
    跨区操作需求请为相应人员开设省级管理员账户。账户的新建与调整在「管理员账户管理」中进行。
  </p>

  <DataTable :columns="columns" :rows="rows" :actions="['查看明细']" @action="onAction" />
</template>
