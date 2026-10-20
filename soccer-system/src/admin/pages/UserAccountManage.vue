<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, SearchField, TableColumn } from '../../components/common/types'

// 用户账户管理（管理员端）：普通管理员可创建、删除用户端账户并重置密码
const formFields: FormField[] = [
  { key: 'account', label: '登录账号', placeholder: '如：szyds_zq02' },
  { key: 'name', label: '姓名 / 单位名' },
  { key: 'type', label: '账户类型', type: 'select', options: ['球队账号', '运动员账号', '教练员账号', '高校账号', '市州账号'] },
  { key: 'unit', label: '所属单位', placeholder: '学校 / 单位名称' },
  { key: 'phone', label: '预留手机号' },
  { key: 'password', label: '初始密码', placeholder: '至少 6 位' },
]

const searchFields: SearchField[] = [
  { key: 'keyword', label: '账号/姓名', placeholder: '输入账号或姓名' },
  { key: 'type', label: '账户类型', type: 'select', options: ['球队账号', '运动员账号', '教练员账号', '高校账号', '市州账号'] },
]

const columns: TableColumn[] = [
  { key: 'account', label: '账号', width: '140px' },
  { key: 'name', label: '姓名 / 单位名' },
  { key: 'type', label: '类型', width: '110px' },
  { key: 'unit', label: '所属单位', width: '150px' },
  { key: 'createTime', label: '创建时间', width: '150px' },
  { key: 'status', label: '状态', width: '90px' },
]

const rows = [
  { account: 'szyds_zq01', name: '实验中学足球队', type: '球队账号', unit: '实验中学', createTime: '2026-09-01 10:00', status: '已生效' },
  { account: 'ydy_001', name: '王小磊', type: '运动员账号', unit: '实验中学', createTime: '2026-09-10 11:20', status: '已生效' },
  { account: 'jly_001', name: '张建国', type: '教练员账号', unit: '实验中学', createTime: '2026-09-10 11:35', status: '已生效' },
  { account: 'gzsfdx_fc', name: '师范大学联队', type: '高校账号', unit: '师范大学', createTime: '2026-09-03 15:30', status: '已生效' },
]

function onSubmit(data: Record<string, string>) {
  console.log('新用户账户：', data)
  alert('【演示】用户账户已创建，待接入后端')
}

function onSearch(filters: Record<string, string>) {
  console.log('搜索条件：', filters)
  alert('【演示】搜索：待接入后端')
}

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}
</script>

<template>
  <PageHeader title="用户账户管理" desc="普通管理员权限：创建、删除用户端账户并重置密码" />

  <p class="page-tip">
    权限说明：普通管理员只能创建/删除「用户账户」，不能管理管理员账户；管理员账户仅可查看（见「管理员账户（只读）」菜单），管理操作需超级管理员执行。
  </p>

  <h3 class="section-title">创建用户账户</h3>
  <DataForm :fields="formFields" submit-text="创建账户" @submit="onSubmit" />

  <h3 class="section-title">用户账户列表</h3>
  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />
  <DataTable
    :columns="columns"
    :rows="rows"
    :actions="['查看', '重置密码', '删除']"
    @action="onAction"
  />
</template>
