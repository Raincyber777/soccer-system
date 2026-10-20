<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'

// 信息公示（对应需求：运动员公示查询 / 教练员公示 / 查看自身队伍）
const playerSearch: SearchField[] = [
  { key: 'name', label: '姓名', placeholder: '输入运动员姓名' },
  { key: 'group', label: '组别', type: 'select', options: ['小学组', '中学组', '高中组', '高校组'] },
]

const playerColumns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '110px' },
  { key: 'team', label: '所属球队' },
  { key: 'group', label: '组别', width: '100px' },
  { key: 'position', label: '场上位置', width: '100px' },
  { key: 'status', label: '公示状态', width: '100px' },
]

const players = [
  { name: '王小磊', team: '实验中学足球队', group: '中学组', position: '前锋', status: '已公示' },
  { name: '李泽宇', team: '实验中学足球队', group: '中学组', position: '中场', status: '已公示' },
  { name: '陈昊', team: '实验中学足球队', group: '中学组', position: '守门员', status: '待审核' },
]

const coachColumns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '110px' },
  { key: 'unit', label: '执教单位' },
  { key: 'level', label: '教练员等级', width: '130px' },
  { key: 'status', label: '公示状态', width: '100px' },
]

const coaches = [
  { name: '张建国', unit: '实验中学', level: '亚足联C级', status: '已公示' },
  { name: '刘洋', unit: '实验中学', level: '中国足协D级', status: '待审核' },
]

function onSearch(filters: Record<string, string>) {
  console.log('搜索条件：', filters)
  alert('【演示】搜索：待接入后端')
}
</script>

<template>
  <PageHeader title="信息公示" desc="查询运动员与教练员的公示信息，可查看自身队伍成员" />

  <h3 class="section-title">运动员公示</h3>
  <SearchBar :fields="playerSearch" @search="onSearch" @reset="onSearch" />
  <DataTable :columns="playerColumns" :rows="players" />

  <h3 class="section-title">教练员公示</h3>
  <DataTable :columns="coachColumns" :rows="coaches" />
</template>
