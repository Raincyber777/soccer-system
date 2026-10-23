<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, TableColumn } from '../../components/common/types'

// 赛事合作方管理（对应需求：增加/删除/修改合作方官网链接、上传合作方图片）
const formFields: FormField[] = [
  { key: 'name', label: '合作方名称', placeholder: '如：省足球协会' },
  { key: 'link', label: '官网链接', placeholder: 'https://...' },
]

const columns: TableColumn[] = [
  { key: 'name', label: '合作方名称' },
  { key: 'link', label: '官网链接' },
  { key: 'logo', label: 'Logo', width: '90px' },
  { key: 'status', label: '状态', width: '90px' },
]

const rows = [
  { name: '省足球协会', link: 'https://fa.example.gov.cn', logo: '已上传', status: '已发布' },
  { name: '省学生体育协会', link: 'https://sfa.example.gov.cn', logo: '已上传', status: '已发布' },
  { name: '运动饮料品牌 X', link: 'https://brandx.example.com', logo: '未上传', status: '已下架' },
]

function onSubmit(data: Record<string, string>) {
  console.log('合作方：', data)
  alert('【演示】合作方已保存，待接入后端')
}

function onUpload() {
  alert('【演示】Logo 上传：待接入后端')
}

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}
</script>

<template>
  <PageHeader title="合作方管理" desc="维护赛事合作方信息与官网链接，门户底部展示" />

  <div class="partner-top">
    <DataForm :fields="formFields" submit-text="增加合作方" @submit="onSubmit" />
    <UploadBlock title="上传合作方图片" desc="Logo 或合作海报，透明底 PNG 优先" @select="onUpload" />
  </div>

  <h3 class="section-title">合作方列表</h3>
  <DataTable :columns="columns" :rows="rows" :actions="['修改', '删除']" @action="onAction" />
</template>

<style scoped>
.partner-top {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 16px;
  align-items: stretch;
}

@media (max-width: 900px) {
  .partner-top {
    grid-template-columns: 1fr;
  }
}
</style>
