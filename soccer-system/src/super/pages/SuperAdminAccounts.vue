<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, SearchField, TableColumn } from '../../components/common/types'
import { SICHUAN_CITY_OPTIONS } from '../../data/sichuan-schools'

// 管理员账户管理（超级管理员专属）：创建/删除管理员账户、重置密码
// 超级管理员可见全部市州的管理员；普通管理员之间只能互相看到本区域的基本信息
const formFields: FormField[] = [
  { key: 'account', label: '登录账号', placeholder: '如：cd_shi_zhen02' },
  { key: 'name', label: '姓名' },
  { key: 'unit', label: '所属单位', placeholder: '如：成都市教育局' },
  { key: 'city', label: '所属市州', type: 'select', options: [...SICHUAN_CITY_OPTIONS, '省本级'] },
  { key: 'role', label: '管理员角色', type: 'select', options: ['市级审核员', '校级管理员', '省级管理员', '普通管理员'] },
  { key: 'password', label: '初始密码', placeholder: '至少 6 位，首次登录建议修改' },
]

const searchFields: SearchField[] = [
  { key: 'keyword', label: '账号/姓名', placeholder: '输入账号或姓名' },
  { key: 'city', label: '所属市州', type: 'select', options: [...SICHUAN_CITY_OPTIONS, '省本级'] },
  { key: 'role', label: '角色', type: 'select', options: ['市级审核员', '校级管理员', '省级管理员', '普通管理员', '超级管理员'] },
]

const columns: TableColumn[] = [
  { key: 'account', label: '账号', width: '130px' },
  { key: 'name', label: '姓名', width: '100px' },
  { key: 'unit', label: '所属单位' },
  { key: 'city', label: '所属市州', width: '100px' },
  { key: 'role', label: '角色', width: '110px' },
  { key: 'status', label: '状态', width: '90px' },
]

const rows = [
  { account: 'super001', name: '系统管理员', unit: '省体育局', city: '省本级', role: '超级管理员', status: '已生效' },
  { account: 'admin001', name: '王志远', unit: '成都市教育局', city: '成都市', role: '市级审核员', status: '已生效' },
  { account: 'admin002', name: '李文静', unit: '四川省足球协会', city: '省本级', role: '省级管理员', status: '已生效' },
  { account: 'admin003', name: '周天磊', unit: '绵阳市教育局', city: '绵阳市', role: '市级审核员', status: '已生效' },
  { account: 'admin004', name: '陈科', unit: '成都七中', city: '成都市', role: '校级管理员', status: '已生效' },
  { account: 'test_admin', name: '测试账户', unit: '—', city: '—', role: '普通管理员', status: '已删除' },
]

function onSubmit(data: Record<string, string>) {
  console.log('新管理员账户：', data)
  alert('【演示】管理员账户已创建，待接入后端')
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
  <PageHeader title="管理员账户管理" desc="超级管理员专属：创建、删除管理员账户并重置密码" />

  <p class="page-tip">
    超级管理员账户不可删除；删除操作建议先禁用观察一段时间，重要操作会记入操作日志。
    普通管理员之间仅能互相查看本区域基本信息，不能互相操作；此处可跨区域管理全部管理员账户。
  </p>

  <h3 class="section-title">创建管理员账户</h3>
  <DataForm :fields="formFields" submit-text="创建账户" @submit="onSubmit" />

  <h3 class="section-title">管理员账户列表</h3>
  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />
  <DataTable
    :columns="columns"
    :rows="rows"
    :actions="['查看', '重置密码', '删除']"
    @action="onAction"
  />
</template>
