<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, TableColumn } from '../../components/common/types'

// 赛事新闻发布管理（对应需求：发布/修改/删除/查看赛事新闻）
const formFields: FormField[] = [
  { key: 'title', label: '新闻标题', placeholder: '如：秋季联赛第三轮战报' },
  { key: 'category', label: '新闻类别', type: 'select', options: ['赛事动态', '战报', '通知公告'] },
  { key: 'content', label: '新闻正文', type: 'textarea', placeholder: '支持图文混排，接入后端后可切换富文本编辑器' },
]

const columns: TableColumn[] = [
  { key: 'title', label: '标题' },
  { key: 'category', label: '类别', width: '100px' },
  { key: 'publishTime', label: '发布时间', width: '160px' },
  { key: 'status', label: '状态', width: '90px' },
]

const rows = [
  { title: '2026 省青少年校园足球联赛（秋季）开赛公告', category: '通知公告', publishTime: '2026-10-15 09:00', status: '已发布' },
  { title: '第三轮战报：实验中学 3:1 市二中', category: '战报', publishTime: '2026-10-12 18:30', status: '已发布' },
  { title: '联赛第二阶段赛程调整说明', category: '赛事动态', publishTime: '2026-10-10 11:20', status: '已下架' },
]

function onSubmit(data: Record<string, string>) {
  console.log('新闻数据：', data)
  alert('【演示】新闻已发布，待接入后端')
}

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}
</script>

<template>
  <PageHeader title="赛事新闻管理" desc="发布、修改、下架赛事新闻，门户首页同步展示" />

  <h3 class="section-title">发布新闻</h3>
  <DataForm :fields="formFields" submit-text="发布新闻" @submit="onSubmit" />

  <h3 class="section-title">新闻列表</h3>
  <DataTable :columns="columns" :rows="rows" :actions="['查看', '修改', '删除']" @action="onAction" />
</template>
