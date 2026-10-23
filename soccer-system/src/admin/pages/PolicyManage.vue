<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, TableColumn } from '../../components/common/types'

// 赛事政策发布管理（对应需求：发布/修改/删除/查看赛事政策）
const formFields: FormField[] = [
  { key: 'title', label: '政策标题', placeholder: '如：省级青少年足球赛事参赛资格管理办法' },
  { key: 'org', label: '发文单位' },
  { key: 'content', label: '政策内容', type: 'textarea', placeholder: '政策全文或附件说明' },
]

const columns: TableColumn[] = [
  { key: 'title', label: '政策标题' },
  { key: 'org', label: '发文单位', width: '140px' },
  { key: 'publishTime', label: '发布时间', width: '160px' },
  { key: 'status', label: '状态', width: '90px' },
]

const rows = [
  { title: '省级青少年足球赛事参赛资格管理办法（试行）', org: '省教育厅', publishTime: '2026-09-01 10:00', status: '已发布' },
  { title: '关于规范校园足球运动员学籍审核的通知', org: '省教育厅', publishTime: '2026-09-10 15:40', status: '已发布' },
]

function onSubmit(data: Record<string, string>) {
  console.log('政策数据：', data)
  alert('【演示】政策已发布，待接入后端')
}

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}
</script>

<template>
  <PageHeader title="赛事政策管理" desc="发布、修改、删除赛事相关政策文件" />

  <h3 class="section-title">发布政策</h3>
  <DataForm :fields="formFields" submit-text="发布政策" @submit="onSubmit" />

  <h3 class="section-title">政策列表</h3>
  <DataTable :columns="columns" :rows="rows" :actions="['查看', '修改', '删除']" @action="onAction" />
</template>
