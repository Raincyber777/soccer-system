<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'

// 参赛管理（对应需求：球队信息管理、按市州/赛事类别查看、重置密码、查看成员/教练/比赛记录、球员遴选档案）
const teamSearch: SearchField[] = [
  { key: 'team', label: '球队名称', placeholder: '输入球队名称' },
  { key: 'city', label: '市州', type: 'select', options: ['贵阳市', '遵义市', '安顺市', '六盘水市', '毕节市', '铜仁市'] },
  { key: 'group', label: '赛事类别', type: 'select', options: ['小学组', '中学组', '高中组', '高校组'] },
]

const teamColumns: TableColumn[] = [
  { key: 'team', label: '球队名称' },
  { key: 'city', label: '市州', width: '100px' },
  { key: 'school', label: '所属学校', width: '150px' },
  { key: 'group', label: '组别', width: '90px' },
]

const teamRows = [
  { team: '实验中学足球队', city: '贵阳市', school: '实验中学', group: '中学组' },
  { team: '第一实验小学队', city: '遵义市', school: '第一实验小学', group: '小学组' },
  { team: '师范大学联队', city: '贵阳市', school: '师范大学', group: '高校组' },
]

const archiveSearch: SearchField[] = [
  { key: 'idCard', label: '身份证号', placeholder: '按身份证号搜索档案' },
  { key: 'team', label: '队伍', placeholder: '按队伍搜索档案' },
]

const archiveColumns: TableColumn[] = [
  { key: 'name', label: '球员', width: '100px' },
  { key: 'team', label: '队伍' },
  { key: 'updated', label: '档案更新时间', width: '160px' },
  { key: 'status', label: '状态', width: '100px' },
]

const archiveRows = [
  { name: '王小磊', team: '实验中学足球队', updated: '2026-10-16 14:20', status: '已归档' },
  { name: '李泽宇', team: '实验中学足球队', updated: '2026-10-15 09:40', status: '已归档' },
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
  <PageHeader title="参赛管理" desc="查看与管理参赛球队、成员、教练及比赛记录，维护球员遴选档案" />

  <h3 class="section-title">球队信息</h3>
  <SearchBar :fields="teamSearch" @search="onSearch" @reset="onSearch" />
  <DataTable
    :columns="teamColumns"
    :rows="teamRows"
    :actions="['查看成员', '查看教练', '查看比赛记录', '重置密码']"
    @action="onAction"
  />

  <h3 class="section-title">球员遴选档案</h3>
  <SearchBar :fields="archiveSearch" @search="onSearch" @reset="onSearch" />
  <DataTable :columns="archiveColumns" :rows="archiveRows" :actions="['查看档案']" @action="onAction" />
</template>
