<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'

// 报名信息管理（对应需求：按姓名/身份证搜索教练员、修改身份信息、增改球员、上传头像、统计与导出）
const searchFields: SearchField[] = [
  { key: 'name', label: '姓名', placeholder: '输入姓名' },
  { key: 'idCard', label: '身份证号', placeholder: '输入身份证号' },
]

const coachColumns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '110px' },
  { key: 'idCard', label: '身份证号', width: '180px' },
  { key: 'unit', label: '所属单位' },
  { key: 'status', label: '状态', width: '100px' },
]

const coachRows = [
  { name: '张建国', idCard: '5201**********1011', unit: '实验中学', status: '已生效' },
  { name: '刘洋', idCard: '5201**********1022', unit: '第一实验小学', status: '已生效' },
]

const playerColumns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '110px' },
  { key: 'idCard', label: '身份证号', width: '180px' },
  { key: 'team', label: '所属球队' },
  { key: 'avatar', label: '头像', width: '90px' },
  { key: 'status', label: '状态', width: '100px' },
]

const playerRows = [
  { name: '王小磊', idCard: '5201**********0011', team: '实验中学足球队', avatar: '已上传', status: '已生效' },
  { name: '李泽宇', idCard: '5201**********0022', team: '实验中学足球队', avatar: '未上传', status: '已生效' },
]

const cityStats = [
  { city: '贵阳市', teams: 32, players: 402 },
  { city: '遵义市', teams: 28, players: 351 },
  { city: '毕节市', teams: 21, players: 268 },
]

const cityStatColumns: TableColumn[] = [
  { key: 'city', label: '市州' },
  { key: 'teams', label: '报名球队数', width: '120px' },
  { key: 'players', label: '报名球员数', width: '120px' },
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
  <PageHeader title="报名信息管理" desc="维护教练员与球员身份信息，查看市州/高校报名统计并导出" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <h3 class="section-title">教练员身份信息</h3>
  <DataTable :columns="coachColumns" :rows="coachRows" :actions="['修改身份信息']" @action="onAction" />

  <h3 class="section-title">球员身份信息</h3>
  <DataTable
    :columns="playerColumns"
    :rows="playerRows"
    :actions="['修改身份信息', '增加身份信息', '上传头像']"
    @action="onAction"
  />

  <h3 class="section-title">
    报名情况统计
    <button type="button" class="btn btn-ghost stat-export" @click="onAction('报名情况导出')">导出统计</button>
  </h3>
  <div class="stat-grid two-col">
    <div class="card">
      <p class="stat-block-title">市州报名情况统计</p>
      <DataTable :columns="cityStatColumns" :rows="cityStats" />
    </div>
    <div class="card">
      <p class="stat-block-title">高校报名情况统计</p>
      <DataTable :columns="cityStatColumns" :rows="[{ city: '贵州大学', teams: 4, players: 86 }, { city: '师范大学', teams: 3, players: 65 }]" />
    </div>
  </div>
</template>

<style scoped>
.stat-export {
  margin-left: 10px;
  padding: 4px 12px;
  font-size: 12px;
  vertical-align: middle;
}

.two-col {
  grid-template-columns: repeat(2, 1fr);
}

@media (max-width: 900px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}

.stat-block-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--green-dark);
  margin-bottom: 12px;
}
</style>
