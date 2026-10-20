<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'

// 管理员教练员管理（对应需求：信息管理、按类别/审核状态搜索、公示、重置密码、删除、修改）
const searchFields: SearchField[] = [
  { key: 'name', label: '姓名', placeholder: '输入教练员姓名' },
  { key: 'category', label: '类别', type: 'select', options: ['专职教练员', '体育教师兼任', '社会足球从业者'] },
  { key: 'status', label: '审核状态', type: 'select', options: ['待审核', '已通过', '已驳回'] },
]

const columns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '100px' },
  { key: 'idCard', label: '身份证号', width: '170px' },
  { key: 'unit', label: '所属单位' },
  { key: 'category', label: '类别', width: '120px' },
  { key: 'status', label: '状态', width: '100px' },
]

const rows = [
  { name: '张建国', idCard: '5201**********1011', unit: '实验中学', category: '专职教练员', status: '已通过' },
  { name: '刘洋', idCard: '5201**********1022', unit: '第一实验小学', category: '体育教师兼任', status: '待审核' },
]

function onSearch(filters: Record<string, string>) {
  console.log('搜索条件：', filters)
  alert('【演示】搜索：待接入后端')
}

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}
</script>

<template>
  <PageHeader title="教练员管理" desc="管理教练员信息与公示状态，支持重置密码、修改与删除" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable
    :columns="columns"
    :rows="rows"
    :actions="['修改', '删除', '公示', '取消公示', '重置密码']"
    @action="onAction"
  />
</template>
