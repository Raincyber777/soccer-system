<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import SchoolSelect from '../../components/common/SchoolSelect.vue'
import type { FormField } from '../../components/common/types'
import { SICHUAN_CITY_OPTIONS, SICHUAN_SCHOOLS } from '../../data/sichuan-schools'
import type { SchoolInfo, SchoolStage } from '../../data/sichuan-schools'
import { todayStr } from '../../utils/date'
import { teamApi, teamCompleteness, ApiError, type Team, type TeamInput } from '../../api'
import { useAuth } from '../../stores/auth'

// 球队基本信息管理（对应需求：创建/修改/查询球队信息、队旗队徽、简介、合照、账号重置）
// 所属学校用统一选择器按「学校标识码」绑定，禁止自由填写学校名；
// 参赛组别随学校学段自动限定（小学→小学组、初中→中学组、高中→高中组、高校→高校组）；
// 报名前必须完善球队信息，完善度会同步到报名表单的资格校验
const auth = useAuth()
const team = ref<Team | null>(null)
const school = ref<SchoolInfo | null>(null)
const ready = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const formKey = ref(0)

// 资料上传状态（mock 演示：点击即视为已上传，保存球队信息时落库）
const uploads = reactive({
  flag: false,
  logo: false,
  photo: false,
  honor: false,
})

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
  { key: 'intro', label: '球队简介', type: 'textarea', placeholder: '球队历史、荣誉、风格等，不少于 20 字' },
])

const initial = computed<Record<string, string>>(() => ({
  name: team.value?.name ?? '',
  city: team.value?.city ?? '',
  group: team.value?.group ?? '',
  foundTime: team.value?.foundTime ?? '',
  captain: team.value?.captain ?? '',
  intro: team.value?.intro ?? '',
}))

const completeness = computed(() => teamCompleteness(team.value))

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
}

async function onSubmit(data: Record<string, string>) {
  message.value = ''

  const draft: Team = {
    id: team.value?.id ?? 'draft',
    name: data.name ?? '',
    city: data.city ?? '',
    school: school.value?.name ?? '',
    schoolCode: school.value?.code ?? '',
    group: data.group ?? '',
    foundTime: data.foundTime ?? '',
    captain: data.captain ?? '',
    intro: data.intro ?? '',
    flagUploaded: uploads.flag,
    logoUploaded: uploads.logo,
    photoUploaded: uploads.photo,
    honorUploaded: uploads.honor,
    ownerAccount: auth.state.account,
    updatedAt: '',
  }

  const input: TeamInput = {
    name: draft.name,
    city: draft.city,
    school: draft.school,
    schoolCode: draft.schoolCode,
    group: draft.group,
    foundTime: draft.foundTime,
    captain: draft.captain,
    intro: draft.intro,
    flagUploaded: draft.flagUploaded,
    logoUploaded: draft.logoUploaded,
    photoUploaded: draft.photoUploaded,
    honorUploaded: draft.honorUploaded,
  }

  try {
    const saved = await teamApi.save(input)
    team.value = saved
    formKey.value += 1
    const status = teamCompleteness(saved)
    showMessage(
      status.complete
        ? '球队信息已保存，当前资料已满足报名资格。'
        : `球队信息已保存。仍有待完善项：${status.missing.join('、')}，完善后才能报名比赛。`,
      status.complete ? 'success' : 'error',
    )
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '球队信息保存失败', 'error')
  }
}

function onUpload(kind: 'flag' | 'logo' | 'photo' | 'honor') {
  uploads[kind] = true
  showMessage('文件已标记上传，请点击「保存球队信息」完成保存。')
}

function onResetPwd() {
  showMessage(`【演示】已向 ${auth.state.account || '球队账号'} 预留手机发送重置提示，待接入短信服务。`)
}

function findSchoolByCode(code: string): SchoolInfo | null {
  return SICHUAN_SCHOOLS.find((s) => s.code === code) ?? null
}

async function load() {
  try {
    const found = await teamApi.getMine()
    team.value = found
    if (found) {
      uploads.flag = found.flagUploaded
      uploads.logo = found.logoUploaded
      uploads.photo = found.photoUploaded
      uploads.honor = found.honorUploaded
      school.value = findSchoolByCode(found.schoolCode)
    }
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '球队信息加载失败', 'error')
  } finally {
    ready.value = true
  }
}

onMounted(load)
</script>

<template>
  <PageHeader title="球队信息" desc="创建并维护球队基本信息、队旗队徽与球队资料" />

  <p class="page-tip">
    所属学校通过教育部「学校（机构）标识码」精准绑定，避免重名错填；选定学校后，参赛组别将按学校学段自动限定。
    球队资料与人员信息完善后才可以提交赛事报名。
  </p>

  <p v-if="message" class="notice" :class="messageType">{{ message }}</p>

  <div class="complete-card">
    <div class="complete-head">
      <div>
        <p class="complete-title">球队资料完善度</p>
        <p class="complete-hint">
          已保存资料得分 {{ completeness.score }} / 100，用于报名资格校验
          <template v-if="team"> · 最近更新 {{ team.updatedAt }}</template>
        </p>
      </div>
      <span class="complete-score" :class="{ ok: completeness.complete }">
        {{ completeness.complete ? '资料已完善' : '待完善' }}
      </span>
    </div>
    <div class="complete-bar">
      <span :style="{ width: `${completeness.score}%` }"></span>
    </div>
    <p v-if="completeness.missing.length" class="complete-missing">
      待完善：{{ completeness.missing.join('、') }}
    </p>
  </div>

  <template v-if="ready">
    <DataForm
      :key="formKey"
      :fields="formFields"
      :initial="initial"
      submit-text="保存球队信息"
      @submit="onSubmit"
    >
      <template #field-school>
        <SchoolSelect v-model="school" />
      </template>
    </DataForm>
  </template>

  <h3 class="section-title">球队人员</h3>
  <p class="page-tip">报名资格要求：教练至少 1 名、球员至少 5 名。创建球队后请同步维护，人员不全会影响报名。</p>
  <div class="roster-grid">
    <div class="roster-card">
      <p class="roster-count">教练组 <strong>{{ team?.coaches?.length ?? 0 }}</strong> 人</p>
      <p class="roster-hint">含主教练、助理教练等，最多 5 人</p>
      <router-link class="btn btn-ghost" to="/user/team-coaches">维护教练组</router-link>
    </div>
    <div class="roster-card">
      <p class="roster-count">球员名单 <strong>{{ team?.players?.length ?? 0 }}</strong> 人</p>
      <p class="roster-hint">报名时按名单报送，最多 60 人</p>
      <router-link class="btn btn-ghost" to="/user/team-members">维护球员名单</router-link>
    </div>
  </div>

  <h3 class="section-title">球队资料</h3>
  <div class="upload-grid">
    <UploadBlock title="上传球队队旗" desc="建议比例 3:2，PNG/JPG 格式" :uploaded="uploads.flag" @select="onUpload('flag')" />
    <UploadBlock title="上传球队队徽" desc="建议透明底 PNG，不低于 300×300" :uploaded="uploads.logo" @select="onUpload('logo')" />
    <UploadBlock title="上传球队合照" desc="全队合照，用于参赛资料" :uploaded="uploads.photo" @select="onUpload('photo')" />
    <UploadBlock title="上传球队荣誉证书" desc="选填：球队所获荣誉证书扫描件" :uploaded="uploads.honor" @select="onUpload('honor')" />
  </div>

  <h3 class="section-title">球队账号</h3>
  <div class="card account-card">
    <p class="account-text">
      账号：{{ auth.state.account || '—' }}　｜　如忘记密码可在此重置，重置后密码将发送到预留手机。
    </p>
    <button type="button" class="btn btn-ghost" @click="onResetPwd">重置球队账号密码</button>
  </div>
</template>

<style scoped>
.notice {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 14px;
}

.notice.success {
  background: #eef8f0;
  border: 1px solid #bfe3c8;
  color: var(--green-dark);
}

.notice.error {
  background: #fff2f1;
  border: 1px solid #f0c4c0;
  color: #a3312a;
}

.complete-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 16px;
  box-shadow: 0 4px 14px rgba(20, 60, 40, 0.05);
}

.complete-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.complete-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}

.complete-hint {
  margin-top: 3px;
  font-size: 12px;
  color: var(--muted);
}

.complete-score {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  background: #fff4e5;
  color: #a5611a;
  flex-shrink: 0;
}

.complete-score.ok {
  background: var(--green-light);
  color: var(--green-dark);
}

.complete-bar {
  margin-top: 12px;
  height: 8px;
  border-radius: 999px;
  background: #eef2ee;
  overflow: hidden;
}

.complete-bar span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--grad-green);
  transition: width 0.3s ease;
}

.complete-missing {
  margin-top: 8px;
  font-size: 12px;
  color: #a3312a;
}

.account-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.roster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}

.roster-card {
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 14px rgba(20, 60, 40, 0.05);
}

.roster-count {
  font-size: 14px;
  color: var(--ink);
}

.roster-count strong {
  font-size: 20px;
  color: var(--green-dark);
}

.roster-hint {
  margin: 6px 0 12px;
  font-size: 12px;
  color: var(--muted);
}

.account-text {
  font-size: 13px;
  color: var(--muted);
}
</style>
