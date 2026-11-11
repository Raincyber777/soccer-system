<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import AppSelect from '../../components/common/AppSelect.vue'
import type { TableColumn } from '../../components/common/types'
import { teamApi, teamRosterApi, ApiError, type CoachCategory, type Team, type TeamCoach, type TeamCoachInput } from '../../api'

// 球队教练组：球队负责人维护自己的教练名单，保存后计入球队完善度
const team = ref<Team | null>(null)
const coaches = ref<TeamCoach[]>([])
const loading = ref(true)
const saving = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const CATEGORY_OPTIONS: CoachCategory[] = ['专职教练员', '体育教师兼任', '社会足球从业者']

const columns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '100px' },
  { key: 'category', label: '类别', width: '140px' },
  { key: 'level', label: '教练员等级' },
  { key: 'phone', label: '联系电话', width: '140px' },
]

const rows = computed<Record<string, unknown>[]>(() =>
  coaches.value.map((coach) => ({
    id: coach.id,
    name: coach.name,
    category: coach.category,
    level: coach.level || '—',
    phone: coach.phone || '—',
  })),
)

const form = reactive({
  name: '',
  category: '专职教练员' as CoachCategory,
  level: '',
  phone: '',
})

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
}

function toInput(list: TeamCoach[]): TeamCoachInput[] {
  return list.map((coach) => ({
    name: coach.name,
    category: coach.category,
    level: coach.level,
    phone: coach.phone,
  }))
}

async function reload() {
  coaches.value = await teamRosterApi.coaches(team.value?.id ?? null)
}

async function addCoach() {
  if (!team.value || saving.value) return
  const name = form.name.trim()
  if (!name) {
    showMessage('请填写教练姓名', 'error')
    return
  }
  if (coaches.value.some((coach) => coach.name === name)) {
    showMessage('教练姓名重复', 'error')
    return
  }
  saving.value = true
  try {
    const next = [
      ...toInput(coaches.value),
      { name, category: form.category, level: form.level.trim(), phone: form.phone.trim() },
    ]
    coaches.value = await teamRosterApi.saveCoaches(team.value.id, next)
    form.name = ''
    form.level = ''
    form.phone = ''
    showMessage(`已添加教练「${name}」，完善度已同步更新。`)
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '教练保存失败', 'error')
  } finally {
    saving.value = false
  }
}

async function removeCoach(row: Record<string, unknown>) {
  if (!team.value || saving.value) return
  const target = coaches.value.find((coach) => coach.id === String(row.id))
  if (!target) return
  if (!window.confirm(`确认删除教练「${target.name}」？`)) return
  saving.value = true
  try {
    const next = coaches.value.filter((coach) => coach.id !== target.id)
    coaches.value = await teamRosterApi.saveCoaches(team.value.id, toInput(next))
    showMessage(`已删除教练「${target.name}」。`)
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '删除失败', 'error')
  } finally {
    saving.value = false
  }
}

async function load() {
  loading.value = true
  try {
    team.value = await teamApi.getMine()
    if (team.value) await reload()
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '教练信息加载失败', 'error')
  } finally {
    loading.value = false
  }
}

function handleAction(action: string, row: Record<string, unknown>) {
  if (action === '删除') removeCoach(row)
}

onMounted(load)
</script>

<template>
  <PageHeader title="球队教练员" desc="维护球队教练组，报名资格要求至少 1 名教练" />

  <p v-if="message" class="page-tip" :class="messageType">{{ message }}</p>
  <p v-if="loading" class="page-tip">正在加载教练信息…</p>

  <template v-else-if="team">
    <p class="page-tip">
      当前球队：{{ team.name }} · 教练 {{ coaches.length }} / 5 人。
      教练信息计入球队完善度，至少 1 名才可报名赛事。
    </p>

    <DataTable
      :columns="columns"
      :rows="rows"
      :row-actions="() => ['删除']"
      @action="handleAction"
    />
    <p v-if="!coaches.length" class="empty-tip">暂无教练，请在下方添加。</p>

    <h3 class="section-title">添加教练</h3>
    <form class="coach-form" @submit.prevent="addCoach">
      <div class="field">
        <label class="field-label">姓名</label>
        <input v-model="form.name" class="field-input" type="text" maxlength="20" placeholder="如：张建国" />
      </div>
      <div class="field">
        <label class="field-label">类别</label>
        <AppSelect v-model="form.category" :options="CATEGORY_OPTIONS" />
      </div>
      <div class="field">
        <label class="field-label">教练员等级</label>
        <input v-model="form.level" class="field-input" type="text" maxlength="20" placeholder="如：亚足联 C 级" />
      </div>
      <div class="field">
        <label class="field-label">联系电话</label>
        <input v-model="form.phone" class="field-input" type="text" maxlength="11" placeholder="11 位手机号（可选）" />
      </div>
      <button type="submit" class="btn btn-primary" :disabled="saving">添加教练</button>
    </form>
  </template>

  <div v-else class="empty-card">
    <p>请先创建球队信息，再维护教练组。</p>
    <router-link class="btn btn-primary" to="/user/team-info">前往创建球队</router-link>
  </div>
</template>

<style scoped>
.empty-tip {
  padding: 14px 0;
  font-size: 13px;
  color: var(--muted);
  text-align: center;
}

.coach-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  align-items: end;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 12px;
  color: var(--muted);
}

.field-input {
  padding: 9px 11px;
  border: 1.5px solid #d8e2da;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
}

.empty-card {
  padding: 24px;
  border: 1px dashed var(--line);
  border-radius: 12px;
  text-align: center;
  font-size: 13px;
  color: var(--muted);
}

.empty-card .btn {
  margin-top: 12px;
}
</style>
