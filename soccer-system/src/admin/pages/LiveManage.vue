<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, TableColumn } from '../../components/common/types'

// 赛事直播链接管理与图文直播（对应需求：管理赛事直播链接、赛事图文直播）
const formFields: FormField[] = [
  { key: 'match', label: '关联场次', type: 'select', options: ['中学组 第 3 轮：实验中学 vs 市二中', '小学组 第 2 轮：实小少年队 vs 朝阳小学'] },
  { key: 'platform', label: '直播平台', type: 'select', options: ['抖音', '视频号', 'B站', '其他'] },
  { key: 'link', label: '直播链接', placeholder: '粘贴直播间地址' },
]

const columns: TableColumn[] = [
  { key: 'match', label: '场次' },
  { key: 'platform', label: '平台', width: '100px' },
  { key: 'link', label: '直播链接' },
  { key: 'status', label: '状态', width: '90px' },
]

const rows = [
  { match: '小学组 第 2 轮：实小少年队 vs 朝阳小学', platform: '视频号', link: 'https://live.example.com/green-1002', status: '进行中' },
  { match: '高校组 第 1 轮：贵州大学 vs 师范大学', platform: 'B站', link: 'https://live.example.com/green-0918', status: '已结束' },
]

function onSubmit(data: Record<string, string>) {
  console.log('直播链接：', data)
  alert('【演示】直播链接已保存，待接入后端')
}

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}
</script>

<template>
  <PageHeader title="直播管理" desc="配置各场次的直播链接，并通过图文直播实时发布赛况" />

  <DataForm :fields="formFields" submit-text="保存直播链接" @submit="onSubmit" />

  <h3 class="section-title">已配置的直播</h3>
  <DataTable :columns="columns" :rows="rows" :actions="['修改', '删除', '图文直播']" @action="onAction" />
</template>
