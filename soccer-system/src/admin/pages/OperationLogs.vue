<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'

// 日志管理（对应需求：用户操作日志表单信息 / 查看用户操作日志信息）
const searchFields: SearchField[] = [
  { key: 'account', label: '账号', placeholder: '输入操作账号' },
  { key: 'date', label: '日期', type: 'text', placeholder: '如：2026-10-16' },
]

const columns: TableColumn[] = [
  { key: 'time', label: '操作时间', width: '170px' },
  { key: 'account', label: '账号', width: '130px' },
  { key: 'role', label: '角色', width: '110px' },
  { key: 'action', label: '操作内容' },
  { key: 'ip', label: 'IP 地址', width: '130px' },
]

const rows = [
  { time: '2026-10-16 14:20', account: 'szyds_zq01', role: '球队负责人', action: '提交球队报名表（中学组）', ip: '10.12.3.44' },
  { time: '2026-10-16 11:05', account: 'gy_shi_zhen', role: '市州审核员', action: '驳回球队报名 1 份（材料不齐）', ip: '10.8.1.17' },
  { time: '2026-10-16 09:30', account: 'admin', role: '系统管理员', action: '发布赛事新闻「秋季联赛开赛公告」', ip: '10.0.0.8' },
  { time: '2026-10-15 17:12', account: 'admin', role: '系统管理员', action: '修改教练员身份信息（张建国）', ip: '10.0.0.8' },
  { time: '2026-10-15 16:44', account: 'gzsfdx_fc', role: '高校负责人', action: '批量上传球员照片 22 张', ip: '10.20.7.9' },
]

function onSearch(filters: Record<string, string>) {
  console.log('搜索条件：', filters)
  alert('【演示】搜索：待接入后端')
}
</script>

<template>
  <PageHeader title="操作日志" desc="记录并查看系统内用户的关键操作，便于审计追溯" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable :columns="columns" :rows="rows" />
</template>
