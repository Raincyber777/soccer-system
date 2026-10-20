<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import type { TableColumn } from '../../components/common/types'

// 教练员履历管理（对应需求：执教记录 / 各类证书上传 / 信息公示）
const teamColumns: TableColumn[] = [
  { key: 'team', label: '所属球队' },
  { key: 'role', label: '岗位', width: '120px' },
  { key: 'time', label: '起止时间', width: '200px' },
  { key: 'status', label: '状态', width: '100px' },
]

const teamRows = [
  { team: '实验中学足球队', role: '主教练', time: '2023-09 ~ 至今', status: '已生效' },
  { team: '市足协青训营', role: '助理教练', time: '2021-03 ~ 2023-06', status: '已归档' },
]

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}

function onUpload() {
  alert('【演示】文件上传：待接入后端')
}
</script>

<template>
  <PageHeader title="教练员履历" desc="上传执教记录与各类证书，审核通过后进入教练员信息公示" />

  <h3 class="section-title">所属球队信息</h3>
  <DataTable
    :columns="teamColumns"
    :rows="teamRows"
    :actions="['修改']"
    @action="onAction"
  />

  <h3 class="section-title">履历与证书上传</h3>
  <div class="upload-grid">
    <UploadBlock title="执教记录" desc="执教队伍、时间与成绩说明" @select="onUpload" />
    <UploadBlock title="参与比赛记录" desc="带队参加比赛的秩序册或成绩册" @select="onUpload" />
    <UploadBlock title="获奖证书" desc="个人或带队获奖证书扫描件" @select="onUpload" />
    <UploadBlock title="学历证明" desc="最高学历证书扫描件" @select="onUpload" />
    <UploadBlock title="学籍证明" desc="在读期间学籍证明（如适用）" @select="onUpload" />
    <UploadBlock title="参与培训记录" desc="教练员培训班结业证明" @select="onUpload" />
    <UploadBlock title="教师资格证" desc="教师资格证书扫描件" @select="onUpload" />
    <UploadBlock title="亚足联/国际足联教练员证书" desc="等级教练员证书扫描件" @select="onUpload" />
  </div>
</template>
