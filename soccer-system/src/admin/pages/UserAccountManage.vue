<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, SearchField, TableColumn } from '../../components/common/types'

// 用户账户管理：本区域（成都市）用户端账户的日常操作下放给普通管理员办理
// 开户/编辑/重置密码/禁用启用均可操作；「删除账户」与管理员账户管理仍收口超级管理员
const formFields: FormField[] = [
  { key: 'account', label: '登录账号', placeholder: '如：szyds_zq02' },
  { key: 'name', label: '姓名 / 单位名' },
  { key: 'type', label: '账户类型', type: 'select', options: ['球队账号', '运动员账号', '教练员账号', '高校账号'] },
  { key: 'unit', label: '所属单位', placeholder: '学校 / 单位名称' },
  { key: 'phone', label: '预留手机号' },
  { key: 'password', label: '初始密码', placeholder: '至少 6 位' },
]

const searchFields: SearchField[] = [
  { key: 'keyword', label: '账号/姓名', placeholder: '输入账号或姓名' },
  { key: 'type', label: '账户类型', type: 'select', options: ['球队账号', '运动员账号', '教练员账号', '高校账号'] },
]

const columns: TableColumn[] = [
  { key: 'account', label: '账号', width: '140px' },
  { key: 'name', label: '姓名 / 单位名' },
  { key: 'type', label: '类型', width: '110px' },
  { key: 'unit', label: '所属单位', width: '150px' },
  { key: 'city', label: '所属市州', width: '100px' },
  { key: 'status', label: '状态', width: '90px' },
]

// 模拟数据：仅当前管理员所在市州（成都市）的用户账户；接入后端时按数据域权限过滤
const rows = [
  { account: 'szyds_zq01', name: '实验中学足球队', type: '球队账号', unit: '实验中学', city: '成都市', status: '已生效' },
  { account: 'ydy_001', name: '王小磊', type: '运动员账号', unit: '实验中学', city: '成都市', status: '已生效' },
  { account: 'jly_001', name: '张建国', type: '教练员账号', unit: '实验中学', city: '成都市', status: '已生效' },
  { account: 'cdqz_fc', name: '成都七中球队', type: '球队账号', unit: '成都七中', city: '成都市', status: '已生效' },
]

function onSubmit(data: Record<string, string>) {
  console.log('新用户账户：', data)
  alert('【演示】用户账户已创建（自动归属本区域成都市），待接入后端')
}

function onSearch(filters: Record<string, string>) {
  console.log('搜索条件：', filters)
  alert('【演示】搜索：待接入后端')
}

function onAction(action: string, row: Record<string, unknown>) {
  alert(`【演示】${action}：${String(row.name ?? '')}（${String(row.account ?? '')}），待接入后端`)
}
</script>

<template>
  <PageHeader title="用户账户管理" desc="本区域用户端账户的日常管理：开户、编辑资料、重置密码、禁用/启用" />

  <p class="page-tip">
    权限说明：本区域（成都市）用户账户的日常操作由普通管理员直接办理，无需逐笔报超级管理员；
    操作仅限本区域数据，「删除账户」与「管理员账户管理」仍由超级管理员执行。禁用/启用为可逆操作，接入后端后将记入操作日志。
  </p>

  <h3 class="section-title">创建用户账户</h3>
  <DataForm :fields="formFields" submit-text="创建账户" @submit="onSubmit" />

  <h3 class="section-title">用户账户列表</h3>
  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />
  <DataTable :columns="columns" :rows="rows" :actions="['查看', '编辑', '重置密码', '禁用/启用']" @action="onAction" />
</template>
