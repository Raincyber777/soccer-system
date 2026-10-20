<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import type { FormField } from '../../components/common/types'

// 球队基本信息管理（对应需求：创建/修改/查询球队信息、队旗队徽、简介、合照、账号重置）
const formFields: FormField[] = [
  { key: 'name', label: '球队名称', placeholder: '创建后不可随意更改' },
  { key: 'city', label: '所属市州', type: 'select', options: ['贵阳市', '遵义市', '安顺市', '六盘水市', '毕节市', '铜仁市'] },
  { key: 'school', label: '所属学校' },
  { key: 'group', label: '参赛组别', type: 'select', options: ['小学组', '中学组', '高中组', '高校组'] },
  { key: 'foundTime', label: '成立时间', type: 'date' },
  { key: 'captain', label: '队长姓名' },
  { key: 'intro', label: '球队简介', type: 'textarea', placeholder: '球队历史、荣誉、风格等' },
]

function onSubmit(data: Record<string, string>) {
  console.log('球队信息：', data)
  alert('【演示】球队信息已保存，待接入后端')
}

function onUpload() {
  alert('【演示】文件上传：待接入后端')
}

function onResetPwd() {
  alert('【演示】重置球队账号密码：待接入后端')
}
</script>

<template>
  <PageHeader title="球队信息" desc="创建并维护球队基本信息、队旗队徽与球队资料" />

  <DataForm :fields="formFields" submit-text="保存球队信息" @submit="onSubmit" />

  <h3 class="section-title">球队资料</h3>
  <div class="upload-grid">
    <UploadBlock title="上传球队队旗" desc="建议比例 3:2，PNG/JPG 格式" @select="onUpload" />
    <UploadBlock title="上传球队队徽" desc="建议透明底 PNG，不低于 300×300" @select="onUpload" />
    <UploadBlock title="上传球队合照" desc="全队合照，用于参赛资料" @select="onUpload" />
    <UploadBlock title="上传球队荣誉证书" desc="球队所获荣誉证书扫描件" @select="onUpload" />
  </div>

  <h3 class="section-title">球队账号</h3>
  <div class="card account-card">
    <p class="account-text">账号：szyds_zq01　｜　如忘记密码可在此重置，重置后密码将发送到预留手机。</p>
    <button type="button" class="btn btn-ghost" @click="onResetPwd">重置球队账号密码</button>
  </div>
</template>

<style scoped>
.account-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.account-text {
  font-size: 13px;
  color: var(--muted);
}
</style>
