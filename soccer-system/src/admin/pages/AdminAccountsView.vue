<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'

// 管理员账户（只读）：普通管理员可以看到其他管理员账户，但不能管理
const searchFields: SearchField[] = [
  { key: 'keyword', label: '账号/姓名', placeholder: '输入账号或姓名' },
  { key: 'role', label: '角色', type: 'select', options: ['市级审核员', '省级管理员', '普通管理员', '超级管理员'] },
]

const columns: TableColumn[] = [
  { key: 'account', label: '账号', width: '130px' },
  { key: 'name', label: '姓名', width: '100px' },
  { key: 'unit', label: '所属单位' },
  { key: 'role', label: '角色', width: '120px' },
  { key: 'createTime', label: '创建时间', width: '150px' },
  { key: 'status', label: '状态', width: '90px' },
]

const rows = [
  { account: 'super001', name: '系统管理员', unit: '省体育局', role: '超级管理员', createTime: '2026-01-01 00:00', status: '已生效' },
  { account: 'admin001', name: '王志远', unit: '贵阳市教育局', role: '市级审核员', createTime: '2026-08-20 09:12', status: '已生效' },
  { account: 'admin002', name: '李文静', unit: '省足球协会', role: '省级管理员', createTime: '2026-08-22 14:30', status: '已生效' },
  { account: 'admin003', name: '周天磊', unit: '遵义市教育局', role: '市级审核员', createTime: '2026-09-05 10:45', status: '已生效' },
]

function onSearch(filters: Record<string, string>) {
  console.log('搜索条件：', filters)
  alert('【演示】搜索：待接入后端')
}
</script>

<template>
  <PageHeader title="管理员账户（只读）" desc="查看系统内管理员账户；普通管理员仅可查看，不能管理" />

  <p class="page-tip">
    此列表只读：管理员的创建、删除、密码重置等操作仅超级管理员可执行，如有需要请联系超级管理员。
  </p>

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable :columns="columns" :rows="rows" />
</template>
