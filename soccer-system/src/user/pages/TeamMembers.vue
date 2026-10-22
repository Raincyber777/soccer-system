<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import type { SearchField, TableColumn } from '../../components/common/types'

// 球队成员管理（对应需求：上传/修改/删除成员信息、按姓名或身份证搜索、上传成员照片）
const searchFields: SearchField[] = [
  { key: 'name', label: '姓名', placeholder: '输入球员姓名' },
  { key: 'idCard', label: '身份证号', placeholder: '输入身份证号' },
]

const columns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '100px' },
  { key: 'idCard', label: '身份证号', width: '180px' },
  { key: 'birth', label: '出生日期', width: '120px' },
  { key: 'position', label: '场上位置', width: '100px' },
  { key: 'photo', label: '照片', width: '90px' },
  { key: 'status', label: '状态', width: '100px' },
]

const members = [
  { name: '王小磊', idCard: '5101**********0011', birth: '2011-03-12', position: '前锋', photo: '已上传', status: '已生效' },
  { name: '李泽宇', idCard: '5101**********0022', birth: '2011-07-25', position: '中场', photo: '已上传', status: '已生效' },
  { name: '陈昊', idCard: '5101**********0033', birth: '2010-11-08', position: '守门员', photo: '未上传', status: '待审核' },
]

function onSearch(filters: Record<string, string>) {
  console.log('搜索条件：', filters)
  alert('【演示】搜索：待接入后端')
}

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}

function onUpload() {
  alert('【演示】文件上传：待接入后端')
}
</script>

<template>
  <PageHeader title="球队成员" desc="添加、修改、删除球队成员信息，支持按姓名或身份证搜索" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable
    :columns="columns"
    :rows="members"
    :actions="['修改', '删除', '上传照片']"
    @action="onAction"
  />

  <h3 class="section-title">成员信息与照片批量上传</h3>
  <div class="upload-grid">
    <UploadBlock title="成员信息批量上传" desc="按 Excel 模板批量导入成员名单" @select="onUpload" />
    <UploadBlock title="成员照片批量上传" desc="打包 zip 上传，文件名用「姓名+身份证号」" @select="onUpload" />
  </div>
</template>
