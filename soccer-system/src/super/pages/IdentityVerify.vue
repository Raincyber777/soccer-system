<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'

// 赛事身份核验（对应需求：球员人脸核验识别）
const columns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '110px' },
  { key: 'idCard', label: '身份证号', width: '180px' },
  { key: 'team', label: '所属球队' },
  { key: 'match', label: '场次', width: '170px' },
  { key: 'status', label: '核验状态', width: '100px' },
]

const rows = [
  { name: '王小磊', idCard: '5101**********0011', team: '实验中学足球队', match: '第 3 轮 vs 市二中', status: '待核验' },
  { name: '李泽宇', idCard: '5101**********0022', team: '实验中学足球队', match: '第 3 轮 vs 市二中', status: '已核验' },
  { name: '陈昊', idCard: '5101**********0033', team: '实验中学足球队', match: '第 3 轮 vs 市二中', status: '已核验' },
]

function onAction(action: string) {
  alert(`【演示】${action}：调起摄像头进行人脸识别比对，待接入后端`)
}
</script>

<template>
  <PageHeader title="赛事身份核验" desc="比赛现场对上场球员进行人脸核验识别，防止替赛" />

  <p class="page-tip">
    核验流程：选择场次 → 调起摄像头采集球员人脸 → 与报名照片及身份信息比对 → 核验通过方可上场。
  </p>

  <DataTable :columns="columns" :rows="rows" :actions="['人脸核验']" @action="onAction" />
</template>
