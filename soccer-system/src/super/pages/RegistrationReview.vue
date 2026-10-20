<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'

// 报名信息审核（对应需求：报名信息查询/驳回/查看盖章件/下载word/下载学籍材料）
const searchFields: SearchField[] = [
  { key: 'team', label: '球队名称', placeholder: '输入球队名称' },
  { key: 'group', label: '报名组别', type: 'select', options: ['小学组', '中学组', '高中组', '高校组'] },
  { key: 'status', label: '审核状态', type: 'select', options: ['待审核', '已通过', '已驳回'] },
]

const columns: TableColumn[] = [
  { key: 'team', label: '球队名称' },
  { key: 'city', label: '市州/单位', width: '110px' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'players', label: '人数', width: '70px' },
  { key: 'submitTime', label: '提交时间', width: '160px' },
  { key: 'status', label: '审核状态', width: '100px' },
]

const rows = [
  { team: '实验中学足球队', city: '贵阳市', group: '中学组', players: 18, submitTime: '2026-10-16 14:20', status: '待审核' },
  { team: '第一实验小学队', city: '遵义市', group: '小学组', players: 12, submitTime: '2026-10-15 11:02', status: '待审核' },
  { team: '师范大学联队', city: '贵阳市', group: '高校组', players: 22, submitTime: '2026-10-14 16:45', status: '已通过' },
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
  <PageHeader title="报名信息审核" desc="省级终审：查询球队报名信息，执行通过/驳回，查看盖章扫描件并下载报名与学籍材料" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <p class="page-tip">
    驳回时需填写驳回原因，原因将推送给报送单位；「下载word」导出球员报名信息表，「下载学籍材料」打包下载学籍验证文件。
  </p>

  <DataTable
    :columns="columns"
    :rows="rows"
    :actions="['通过', '驳回', '查看盖章件', '下载word', '下载学籍材料']"
    @action="onAction"
  />
</template>
