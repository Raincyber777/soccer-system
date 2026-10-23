<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, TableColumn } from '../../components/common/types'

// 赛事精彩瞬间管理（对应需求：发布/修改/删除/查看精彩瞬间）
const formFields: FormField[] = [
  { key: 'title', label: '瞬间标题', placeholder: '如：第 3 轮王小磊倒钩破门' },
  { key: 'match', label: '所属比赛', type: 'select', options: ['中学组 第 3 轮：实验中学 vs 市二中', '小学组 第 2 轮：实小少年队 vs 朝阳小学'] },
  { key: 'desc', label: '文字说明', type: 'textarea', placeholder: '展示在图片下方的说明文字' },
]

const columns: TableColumn[] = [
  { key: 'title', label: '标题' },
  { key: 'match', label: '所属比赛' },
  { key: 'publishTime', label: '发布时间', width: '160px' },
  { key: 'status', label: '状态', width: '90px' },
]

const rows = [
  { title: '第 2 轮李泽宇远射世界波', match: '中学组 第 2 轮', publishTime: '2026-10-13 20:10', status: '已发布' },
  { title: '小球员赛前 handshake', match: '小学组 第 1 轮', publishTime: '2026-10-12 12:00', status: '已发布' },
]

function onSubmit(data: Record<string, string>) {
  console.log('精彩瞬间：', data)
  alert('【演示】精彩瞬间已发布，待接入后端')
}

function onUpload() {
  alert('【演示】图片上传：待接入后端')
}

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}
</script>

<template>
  <PageHeader title="精彩瞬间管理" desc="发布比赛精彩瞬间图片与说明，门户首页展示" />

  <h3 class="section-title">发布精彩瞬间</h3>
  <DataForm :fields="formFields" submit-text="发布" @submit="onSubmit" />

  <h3 class="section-title">上传瞬间图片</h3>
  <div class="upload-grid">
    <UploadBlock title="上传瞬间图片" desc="JPG/PNG，单张不超过 10MB" @select="onUpload" />
    <UploadBlock title="上传视频封面图" desc="如发布视频瞬间，需同时上传封面" @select="onUpload" />
  </div>

  <h3 class="section-title">已发布的精彩瞬间</h3>
  <DataTable :columns="columns" :rows="rows" :actions="['查看', '修改', '删除']" @action="onAction" />
</template>
