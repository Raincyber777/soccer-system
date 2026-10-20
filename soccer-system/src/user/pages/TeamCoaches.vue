<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'

// 球队教练员管理（对应需求：按类别/审核状态查询、添加、删除球队教练员）
const searchFields: SearchField[] = [
  { key: 'name', label: '姓名', placeholder: '输入教练员姓名' },
  { key: 'category', label: '类别', type: 'select', options: ['专职教练员', '体育教师兼任', '社会足球从业者'] },
  { key: 'status', label: '审核状态', type: 'select', options: ['待审核', '已通过', '已驳回'] },
]

const columns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '100px' },
  { key: 'category', label: '类别', width: '130px' },
  { key: 'level', label: '教练员等级' },
  { key: 'phone', label: '联系电话', width: '140px' },
  { key: 'status', label: '审核状态', width: '100px' },
]

const coaches = [
  { name: '张建国', category: '专职教练员', level: '亚足联C级', phone: '138****1234', status: '已通过' },
  { name: '刘洋', category: '体育教师兼任', level: '中国足协D级', phone: '139****5678', status: '待审核' },
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
  <PageHeader title="球队教练员" desc="查询、添加、删除球队教练员，可按类别与审核状态筛选" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable
    :columns="columns"
    :rows="coaches"
    :actions="['查看', '删除']"
    @action="onAction"
  />

  <div class="add-row">
    <button type="button" class="btn btn-primary" @click="onAction('添加球队教练员')">＋ 添加球队教练员</button>
  </div>
</template>

<style scoped>
.add-row {
  margin-top: 16px;
}
</style>
