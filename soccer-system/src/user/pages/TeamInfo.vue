<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import SchoolSelect from '../../components/common/SchoolSelect.vue'
import type { FormField } from '../../components/common/types'
import { SICHUAN_CITY_OPTIONS } from '../../data/sichuan-schools'
import type { SchoolInfo, SchoolStage } from '../../data/sichuan-schools'
import { todayStr } from '../../utils/date'

// 球队基本信息管理（对应需求：创建/修改/查询球队信息、队旗队徽、简介、合照、账号重置）
// 所属学校用统一选择器按「学校标识码」绑定，禁止自由填写学校名；
// 参赛组别随学校学段自动限定（小学→小学组、初中→中学组、高中→高中组、高校→高校组）
const school = ref<SchoolInfo | null>(null)
const GROUPS_BY_STAGE: Record<SchoolStage, string[]> = {
  小学: ['小学组'],
  初中: ['中学组'],
  高中: ['高中组'],
  高校: ['高校组'],
}
const groupOptions = computed(() =>
  school.value ? GROUPS_BY_STAGE[school.value.stage] : ['小学组', '中学组', '高中组', '高校组'],
)

const formFields = computed<FormField[]>(() => [
  { key: 'name', label: '球队名称', placeholder: '创建后不可随意更改' },
  { key: 'city', label: '所属市州', type: 'select', options: SICHUAN_CITY_OPTIONS },
  { key: 'school', label: '所属学校', type: 'custom' },
  { key: 'group', label: '参赛组别', type: 'select', options: groupOptions.value },
  { key: 'foundTime', label: '成立时间', type: 'date', max: todayStr() },
  { key: 'captain', label: '队长姓名' },
  { key: 'intro', label: '球队简介', type: 'textarea', placeholder: '球队历史、荣誉、风格等' },
])

function onSubmit(data: Record<string, string>) {
  console.log('球队信息：', { ...data, schoolCode: school.value?.code ?? '' })
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

  <p class="page-tip">
    所属学校通过教育部「学校（机构）标识码」精准绑定，避免重名错填；选定学校后，参赛组别将按学校学段自动限定。
  </p>

  <DataForm :fields="formFields" submit-text="保存球队信息" @submit="onSubmit">
    <template #field-school>
      <SchoolSelect v-model="school" />
    </template>
  </DataForm>

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
