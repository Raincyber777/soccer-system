<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import SchoolSelect from '../../components/common/SchoolSelect.vue'
import type { FormField } from '../../components/common/types'
import type { SchoolInfo, SchoolStage } from '../../data/sichuan-schools'
import { todayStr } from '../../utils/date'
import {
  createTeam,
  errMsg,
  fetchMyTeam,
  fetchSchoolCode,
  updateTeam,
  type ApiTeam,
} from '../../api/team'

// 球队基本信息管理：创建/编辑本人球队（组别与所属市州由所选学校自动带出，后端同步落库）。
// 已有球队时学校/组别锁定展示，可改名称/成立时间/队长/简介；上传与账号重置为后续批次。

// 参赛组别随学校学段自动限定（小学→小学组、初中→中学组、高中→高中组、高校→高校组）
const GROUPS_BY_STAGE: Record<SchoolStage, string> = {
  小学: '小学组',
  初中: '中学组',
  高中: '高中组',
  高校: '高校组',
}

const school = ref<SchoolInfo | null>(null)
const myTeam = ref<ApiTeam | null>(null)
const loaded = ref(false)
const saving = ref(false)

const formFields = computed<FormField[]>(() => {
  const base: FormField[] = [
    { key: 'name', label: '球队名称', placeholder: '如：实验中学足球队' },
    { key: 'foundTime', label: '成立时间', type: 'date', max: todayStr() },
    { key: 'captain', label: '队长姓名' },
    { key: 'intro', label: '球队简介', type: 'textarea', placeholder: '球队历史、荣誉、风格等' },
  ]
  if (myTeam.value) return base // 已建队：学校/组别锁定，不再出现在表单
  return [
    ...base.slice(0, 1),
    { key: 'school', label: '所属学校', type: 'custom' },
    { key: 'group', label: '参赛组别（随学校学段带出）', type: 'text', placeholder: '选择学校后自动显示' },
    ...base.slice(1),
  ]
})

const formInitial = ref<Record<string, string>>({})

async function refresh() {
  const team = await fetchMyTeam()
  myTeam.value = team
  if (team) {
    formInitial.value = {
      name: team.name,
      foundTime: (team.founded_at || '').slice(0, 10),
      captain: team.captain || '',
      intro: team.intro || '',
    }
  }
  loaded.value = true
}

onMounted(refresh)

// 组别随 SchoolSelect 的学校学段实时带出（仅创建模式展示）
const groupHint = computed(() => (school.value ? GROUPS_BY_STAGE[school.value.stage] : ''))

async function onSubmit(data: Record<string, string>) {
  const name = (data.name ?? '').trim()
  if (!name) {
    alert('请填写球队名称')
    return
  }
  saving.value = true
  try {
    if (myTeam.value) {
      await updateTeam(myTeam.value.id, {
        name,
        founded_at: (data.foundTime ?? '').trim() || undefined,
        captain: (data.captain ?? '').trim(),
        intro: (data.intro ?? '').trim(),
      })
      alert('球队信息已保存')
    } else {
      if (!school.value) {
        alert('请先通过学校选择器绑定所属学校')
        return
      }
      const schoolCode = await fetchSchoolCode(school.value.code)
      if (!schoolCode) {
        alert('学校标识码未在平台学校库中找到，请重新选择')
        return
      }
      await createTeam({
        name,
        school: schoolCode,
        founded_at: (data.foundTime ?? '').trim() || undefined,
        captain: (data.captain ?? '').trim(),
        intro: (data.intro ?? '').trim(),
      })
      alert('球队创建成功！接下来可在「球队成员」报送球员，在「赛事报名」提交报名表')
    }
    await refresh()
  } catch (err) {
    alert(errMsg(err))
  } finally {
    saving.value = false
  }
}

function onUpload() {
  alert('球队资料上传将在后续批次接入（需后端文件上传接口）')
}

function onResetPwd() {
  alert('球队账号密码重置请联系平台管理员（超管端「用户账户管理」）')
}
</script>

<template>
  <PageHeader title="球队信息" desc="创建并维护球队基本信息、队旗队徽与球队资料" />

  <p class="page-tip">
    所属学校通过教育部「学校（机构）标识码」精准绑定，避免重名错填；选定学校后，参赛组别将按学校学段自动限定。
  </p>

  <p v-if="loaded && myTeam" class="team-bound">
    当前绑定学校：<b>{{ myTeam.school_name }}</b>
    ｜组别：<b>{{ myTeam.group_type_display }}</b>
    ｜所属市州：<b>{{ myTeam.city_name || '—' }}</b>
  </p>

  <DataForm
    :fields="formFields"
    :submit-text="myTeam ? '保存球队信息' : '创建球队'"
    :initial="formInitial"
    @submit="onSubmit"
  >
    <template #field-school>
      <SchoolSelect v-model="school" />
    </template>
    <template #field-group>
      <input class="form-input plain" type="text" :value="groupHint" placeholder="选择学校后自动显示" readonly />
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
    <p class="account-text">登录账号即注册用户名　｜　如忘记密码可联系平台管理员重置。</p>
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

.team-bound {
  background: var(--green-light);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 14px;
}

.team-bound b {
  color: var(--green-dark);
}
</style>
