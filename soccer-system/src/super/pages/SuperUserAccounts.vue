<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, SearchField, TableColumn } from '../../components/common/types'

// 用户账户管理（超级管理员）：全省范围的用户端账户管理，「删除账户」仅超管可执行
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
  { key: 'city', label: '所属市州', width: '100px' },
  { key: 'status', label: '状态', width: '90px' },
]

const rows = [
  { account: 'szyds_zq01', name: '实验中学足球队', type: '球队账号', unit: '实验中学', city: '成都市', status: '已生效' },
  { account: 'ydy_001', name: '王小磊', type: '运动员账号', unit: '实验中学', city: '成都市', status: '已生效' },
  { account: 'jly_001', name: '张建国', type: '教练员账号', unit: '实验中学', city: '成都市', status: '已生效' },
  { account: 'scsfdx_fc', name: '川师大队', type: '高校账号', unit: '四川师范大学', city: '成都市', status: '已生效' },
  { account: 'cd_shi_zhen', name: '成都市教育局', type: '市州账号', unit: '成都市教育局', city: '成都市', status: '已生效' },
  { account: 'test_001', name: '测试账户', type: '球队账号', unit: '—', city: '—', status: '已删除' },
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
  <PageHeader title="用户账户管理" desc="超级管理员专属：管理全省用户端账户，删除账户仅超管可执行" />

  <p class="page-tip">
    用户端账户的日常操作（开户、编辑、重置密码、禁用/启用）已下放各市州普通管理员（限本区域）；
    超级管理员负责全省范围的账户管理，并保留「删除账户」等高风险操作，删除前建议确认该账户无进行中的报名。
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
