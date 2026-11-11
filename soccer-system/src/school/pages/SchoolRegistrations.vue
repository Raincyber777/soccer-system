<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  ApiError,
  schoolRegistrationApi,
  schoolTeamApi,
  tournamentApi,
  type Registration,
  type Team,
  type Tournament,
} from '../../api'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import AppSelect from '../../components/common/AppSelect.vue'
import type { TableColumn } from '../../components/common/types'

// 校级管理员 · 本校报名：查看本校球队报名进度，可代本校球队提交报名、驳回后重新提交
// 报名状态流转仍由市州 / 省级审核完成，校级端不能直接改状态

const registrations = ref<Registration[]>([])
const teams = ref<Team[]>([])
const tournaments = ref<Tournament[]>([])
const loading = ref(true)
const errorMsg = ref('')
const successMsg = ref('')

const submitting = ref(false)
const formError = ref('')
const form = reactive({
  tournamentName: '',
  teamName: '',
  players: '18',
  leader: '',
  phone: '',
  coach: '',
  remark: '',
})

const columns: TableColumn[] = [
  { key: 'tournament', label: '赛事' },
  { key: 'team', label: '参赛球队' },
  { key: 'group', label: '组别' },
  { key: 'players', label: '人数' },
  { key: 'submitTime', label: '提交时间' },
  { key: 'status', label: '状态' },
  { key: 'reason', label: '驳回原因' },
]

const rows = computed(() =>
  registrations.value.map((item) => ({
    id: item.id,
    tournament: item.tournamentName,
    team: item.team,
    group: item.group,
    players: item.players,
    submitTime: item.submitTime,
    status: item.status,
    reason: item.rejectReason ?? '—',
  })),
)

const teamOptions = computed(() => teams.value.map((team) => team.name))
const tournamentOptions = computed(() => tournaments.value.map((item) => item.name))

function rowActions(row: Record<string, unknown>) {
  return String(row.status) === '已驳回' ? ['重新提交'] : []
}

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const [list, teamList, tournamentList] = await Promise.all([
      schoolRegistrationApi.list(),
      schoolTeamApi.list(),
      tournamentApi.list({ status: '报名中' }),
    ])
    registrations.value = list
    teams.value = teamList
    tournaments.value = tournamentList
    if (!form.teamName && teamOptions.value[0]) form.teamName = teamOptions.value[0]
    if (!form.tournamentName && tournamentOptions.value[0]) form.tournamentName = tournamentOptions.value[0]
  } catch (error) {
    errorMsg.value = error instanceof ApiError ? error.message : '报名数据加载失败'
  } finally {
    loading.value = false
  }
}

async function submitRegistration() {
  if (submitting.value) return
  formError.value = ''
  successMsg.value = ''
  const team = teams.value.find((item) => item.name === form.teamName)
  const tournament = tournaments.value.find((item) => item.name === form.tournamentName)
  if (!team) {
    formError.value = '请选择本校参赛球队'
    return
  }
  if (!tournament) {
    formError.value = '请选择报名赛事'
    return
  }
  const players = Number(form.players)
  if (!Number.isInteger(players) || players <= 0 || players > 60) {
    formError.value = '参赛人数需为 1 - 60 的整数'
    return
  }

  submitting.value = true
  try {
    await schoolRegistrationApi.create({
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      teamId: team.id,
      players,
      leader: form.leader.trim(),
      phone: form.phone.trim(),
      coach: form.coach.trim(),
      remark: form.remark.trim(),
    })
    successMsg.value = `「${team.name}」已提交「${tournament.name}」报名，当前状态为待初审。`
    form.leader = ''
    form.phone = ''
    form.coach = ''
    form.remark = ''
    await load()
  } catch (error) {
    formError.value = error instanceof ApiError ? error.message : '报名提交失败'
  } finally {
    submitting.value = false
  }
}

async function handleAction(action: string, row: Record<string, unknown>) {
  if (action !== '重新提交') return
  if (!window.confirm(`确认重新提交「${row.team}」的报名？提交后状态回到待初审。`)) return
  try {
    await schoolRegistrationApi.resubmit(String(row.id))
    successMsg.value = '报名已重新提交，状态更新为待初审。'
    await load()
  } catch (error) {
    errorMsg.value = error instanceof ApiError ? error.message : '重新提交失败'
  }
}

onMounted(load)
</script>

<template>
  <div>
    <PageHeader title="本校报名" desc="查看本校球队报名进度，可代本校球队提交报名；审核由市州与省级完成" />

    <p v-if="errorMsg" class="page-tip error">{{ errorMsg }}</p>
    <p v-if="successMsg" class="page-tip success">{{ successMsg }}</p>

    <section class="create-card">
      <h3 class="card-title">代本校球队报名</h3>
      <form class="inline-form" @submit.prevent="submitRegistration">
        <div class="field">
          <label class="field-label">报名赛事</label>
          <AppSelect v-model="form.tournamentName" :options="tournamentOptions" placeholder="暂无可报名赛事" />
        </div>
        <div class="field">
          <label class="field-label">参赛球队</label>
          <AppSelect v-model="form.teamName" :options="teamOptions" placeholder="本校暂无球队" />
        </div>
        <div class="field narrow">
          <label class="field-label">参赛人数</label>
          <input v-model="form.players" class="field-input" type="number" min="1" max="60" />
        </div>
        <div class="field">
          <label class="field-label">领队</label>
          <input v-model="form.leader" class="field-input" type="text" maxlength="20" placeholder="可选" />
        </div>
        <div class="field">
          <label class="field-label">联系电话</label>
          <input v-model="form.phone" class="field-input" type="text" maxlength="11" placeholder="可选" />
        </div>
        <div class="field">
          <label class="field-label">教练</label>
          <input v-model="form.coach" class="field-input" type="text" maxlength="20" placeholder="可选" />
        </div>
        <div class="field wide">
          <label class="field-label">备注</label>
          <input v-model="form.remark" class="field-input" type="text" maxlength="200" placeholder="可选" />
        </div>
        <div class="form-actions">
          <button type="submit" class="primary-btn" :disabled="submitting">
            {{ submitting ? '提交中…' : '提交报名' }}
          </button>
        </div>
      </form>
      <p v-if="formError" class="page-tip error">{{ formError }}</p>
      <p v-if="tournaments.length === 0" class="page-tip hint">当前没有开放报名的赛事，赛事开放后可在此提交。</p>
    </section>

    <div class="toolbar">
      <span class="toolbar-note">共 {{ registrations.length }} 条本校报名记录</span>
      <button type="button" class="refresh-btn" :disabled="loading" @click="load">刷新</button>
    </div>

    <DataTable
      :columns="columns"
      :rows="rows as unknown as Record<string, unknown>[]"
      :row-actions="rowActions"
      @action="handleAction"
    />
    <p v-if="!loading && registrations.length === 0" class="page-tip hint">本校暂无报名记录。</p>
  </div>
</template>

<style scoped>
.create-card {
  padding: 18px 20px;
  margin-bottom: 18px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(20, 60, 40, 0.05);
}

.card-title {
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--ink);
}

.inline-form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1 1 160px;
  min-width: 140px;
}

.field.narrow {
  flex: 0 0 110px;
}

.field.wide {
  flex: 2 1 220px;
}

.field-label {
  font-size: 12px;
  color: var(--muted);
}

.field-input {
  width: 100%;
  padding: 9px 11px;
  border: 1.5px solid #d8e2da;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  color: var(--ink);
}

.field-input:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(30, 122, 63, 0.12);
}

.form-actions {
  padding-bottom: 2px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.toolbar-note {
  flex: 1;
  font-size: 13px;
  color: var(--muted);
}
</style>
