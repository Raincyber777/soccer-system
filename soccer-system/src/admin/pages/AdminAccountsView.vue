<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'

// 管理员账户（只读）：同级管理员可见性规则
// 1. 同级管理员（同一市州）可互相查看基本信息（姓名/联系方式/所属机构/角色）
// 2. 不可见敏感字段（审核记录、操作日志、密码、创建时间等），不能互相操作
// 3. 跨市州完全隔离：本列表只显示当前管理员所在市州的管理员
// 4. 管理员账户的创建/修改/禁用/删除统一收口到超级管理员
const searchFields: SearchField[] = [
  { key: 'keyword', label: '姓名', placeholder: '输入姓名' },
  { key: 'role', label: '角色', type: 'select', options: ['市级审核员', '校级管理员', '省级管理员'] },
]

const columns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '100px' },
  { key: 'phone', label: '联系方式', width: '140px' },
  { key: 'unit', label: '所属机构' },
  { key: 'role', label: '角色', width: '110px' },
  { key: 'city', label: '所属市州', width: '100px' },
]

// 模拟数据：仅当前管理员（成都市）可见的同级管理员；接入后端时按数据域权限过滤
const rows = [
  { name: '王志远（本人）', phone: '138****0001', unit: '成都市教育局', role: '市级审核员', city: '成都市' },
  { name: '刘晓芸', phone: '139****2266', unit: '成都市足球协会', role: '市级审核员', city: '成都市' },
  { name: '陈科', phone: '135****7789', unit: '成都七中', role: '校级管理员', city: '成都市' },
]

function onSearch(filters: Record<string, string>) {
  console.log('搜索条件：', filters)
  alert('【演示】搜索：待接入后端')
}

function onView(action: string, row: Record<string, unknown>) {
  const name = String(row.name ?? '')
  const phone = String(row.phone ?? '')
  const unit = String(row.unit ?? '')
  const role = String(row.role ?? '')
  const city = String(row.city ?? '')
  alert(
    `【演示】${action}：${name} 的基本信息（仅限同级可见字段）\n联系方式：${phone}\n所属机构：${unit}\n角色：${role}\n所属市州：${city}\n\n审核记录、操作日志、账号密码等敏感信息不可见。`,
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

  <DataTable :columns="columns" :rows="rows" :actions="['查看']" @action="onView" />
</template>
