<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import AppSelect from '../../components/common/AppSelect.vue'
import type { TableColumn } from '../../components/common/types'
import {
  schoolTeamApi,
  teamRosterApi,
  teamCompleteness,
  ApiError,
  type CoachCategory,
  type Team,
  type TeamCoach,
  type TeamCoachInput,
  type TeamPlayer,
  type TeamPlayerInput,
  type TeamPlayerPosition,
} from '../../api'

// 校级管理员 · 本校人员：查看本校各球队教练与球员，支持单人维护与批量上传
// 人员信息直接写入球队档案，完善度同步用于报名资格校验
const teams = ref<Team[]>([])
const selectedName = ref('')
const coaches = ref<TeamCoach[]>([])
const players = ref<TeamPlayer[]>([])
const loading = ref(true)
const saving = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const importText = ref('')
const importResult = ref('')

const CATEGORY_OPTIONS: CoachCategory[] = ['专职教练员', '体育教师兼任', '社会足球从业者']
const POSITION_OPTIONS: TeamPlayerPosition[] = ['门将', '后卫', '中场', '前锋']

const selectedTeam = computed(() => teams.value.find((team) => team.name === selectedName.value) ?? null)
const completeness = computed(() => teamCompleteness(selectedTeam.value))

const coachForm = reactive({ name: '', category: '专职教练员' as CoachCategory, level: '', phone: '' })
const playerForm = reactive({
  name: '',
  idCard: '',
  birthDate: '',
  position: '前锋' as TeamPlayerPosition,
  jerseyNo: '',
})

const coachColumns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '100px' },
  { key: 'category', label: '类别', width: '140px' },
  { key: 'level', label: '教练员等级' },
  { key: 'phone', label: '联系电话', width: '140px' },
]

const playerColumns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '90px' },
  { key: 'idCard', label: '身份证号', width: '170px' },
  { key: 'birthDate', label: '出生日期', width: '110px' },
  { key: 'position', label: '位置', width: '80px' },
  { key: 'jerseyNo', label: '球衣号', width: '70px' },
  { key: 'photo', label: '照片', width: '80px' },
]

const coachRows = computed<Record<string, unknown>[]>(() =>
  coaches.value.map((coach) => ({
    id: coach.id,
    name: coach.name,
    category: coach.category,
    level: coach.level || '—',
    phone: coach.phone || '—',
  })),
)

const playerRows = computed<Record<string, unknown>[]>(() =>
  players.value.map((player) => ({
    id: player.id,
    name: player.name,
    idCard: player.idCard,
    birthDate: player.birthDate || '—',
    position: player.position,
    jerseyNo: player.jerseyNo,
    photo: player.photoUploaded ? '已上传' : '未上传',
  })),
)

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
}

function coachInputs(list: TeamCoach[]): TeamCoachInput[] {
  return list.map((coach) => ({
    name: coach.name,
    category: coach.category,
    level: coach.level,
    phone: coach.phone,
  }))
}

function playerInputs(list: TeamPlayer[]): TeamPlayerInput[] {
  return list.map((player) => ({
    name: player.name,
    idCard: player.idCard,
    birthDate: player.birthDate,
    position: player.position,
    jerseyNo: player.jerseyNo,
    photoUploaded: player.photoUploaded,
  }))
}

async function loadTeams() {
  teams.value = await schoolTeamApi.list()
  if (!teams.value.some((team) => team.name === selectedName.value)) {
    selectedName.value = teams.value[0]?.name ?? ''
  }
}

async function loadRoster() {
  if (!selectedTeam.value) {
    coaches.value = []
    players.value = []
    return
  }
  const teamId = selectedTeam.value.id
  const [coachList, playerList] = await Promise.all([
    teamRosterApi.coaches(teamId),
    teamRosterApi.members(teamId),
  ])
  coaches.value = coachList
  players.value = playerList
}

async function refresh() {
  await Promise.all([loadTeams(), loadRoster()])
}

async function addCoach() {
  if (!selectedTeam.value || saving.value) return
  const name = coachForm.name.trim()
  if (!name) {
    showMessage('请填写教练姓名', 'error')
    return
  }
  saving.value = true
  try {
    const next = [
      ...coachInputs(coaches.value),
      { name, category: coachForm.category, level: coachForm.level.trim(), phone: coachForm.phone.trim() },
    ]
    await teamRosterApi.saveCoaches(selectedTeam.value.id, next)
    coachForm.name = ''
    coachForm.level = ''
    coachForm.phone = ''
    await refresh()
    showMessage(`已为「${selectedTeam.value.name}」添加教练「${name}」。`)
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '教练保存失败', 'error')
  } finally {
    saving.value = false
  }
}

async function removeCoach(row: Record<string, unknown>) {
  if (!selectedTeam.value || saving.value) return
  const target = coaches.value.find((coach) => coach.id === String(row.id))
  if (!target) return
  if (!window.confirm(`确认删除教练「${target.name}」？`)) return
  saving.value = true
  try {
    await teamRosterApi.saveCoaches(
      selectedTeam.value.id,
      coachInputs(coaches.value.filter((coach) => coach.id !== target.id)),
    )
    await refresh()
    showMessage(`已删除教练「${target.name}」。`)
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '删除失败', 'error')
  } finally {
    saving.value = false
  }
}

async function addPlayer() {
  if (!selectedTeam.value || saving.value) return
  saving.value = true
  try {
    const next = [
      ...playerInputs(players.value),
      {
        name: playerForm.name.trim(),
        idCard: playerForm.idCard.trim(),
        birthDate: playerForm.birthDate,
        position: playerForm.position,
        jerseyNo: Number(playerForm.jerseyNo),
      },
    ]
    await teamRosterApi.saveMembers(selectedTeam.value.id, next)
    playerForm.name = ''
    playerForm.idCard = ''
    playerForm.birthDate = ''
    playerForm.jerseyNo = ''
    await refresh()
    showMessage('球员已添加。')
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '球员保存失败', 'error')
  } finally {
    saving.value = false
  }
}

async function removePlayer(row: Record<string, unknown>) {
  if (!selectedTeam.value || saving.value) return
  const target = players.value.find((player) => player.id === String(row.id))
  if (!target) return
  if (!window.confirm(`确认删除球员「${target.name}」？`)) return
  saving.value = true
  try {
    await teamRosterApi.saveMembers(
      selectedTeam.value.id,
      playerInputs(players.value.filter((player) => player.id !== target.id)),
    )
    await refresh()
    showMessage(`已删除球员「${target.name}」。`)
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '删除失败', 'error')
  } finally {
    saving.value = false
  }
}

/** 批量上传格式：姓名,身份证号,出生日期,位置,球衣号（每行一条） */
async function importPlayers() {
  if (!selectedTeam.value || saving.value) return
  const lines = importText.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) {
    showMessage('请先粘贴要上传的球员数据', 'error')
    return
  }
  const rows: TeamPlayerInput[] = []
  const formatErrors: string[] = []
  lines.forEach((line, index) => {
    const parts = line.split(/[,，]/).map((part) => part.trim())
    if (parts.length < 5) {
      formatErrors.push(`第 ${index + 1} 行：需要 5 个字段`)
      return
    }
    const [name, idCard, birthDate, position, jersey] = parts
    if (!POSITION_OPTIONS.includes(position as TeamPlayerPosition)) {
      formatErrors.push(`第 ${index + 1} 行：位置需为 门将/后卫/中场/前锋`)
      return
    }
    rows.push({
      name: name ?? '',
      idCard: idCard ?? '',
      birthDate: birthDate ?? '',
      position: position as TeamPlayerPosition,
      jerseyNo: Number(jersey),
    })
  })

  saving.value = true
  try {
    const result = await teamRosterApi.importMembers(selectedTeam.value.id, rows)
    await refresh()
    importResult.value = `成功上传 ${result.added} 条，跳过 ${result.skipped + formatErrors.length} 条。`
    if (result.errors.length || formatErrors.length) {
      importResult.value += ` ${[...formatErrors, ...result.errors].slice(0, 5).join('；')}`
    }
    if (result.added) importText.value = ''
    showMessage(`批量上传完成：新增 ${result.added} 人。`)
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '批量上传失败', 'error')
  } finally {
    saving.value = false
  }
}

function handleCoachAction(action: string, row: Record<string, unknown>) {
  if (action === '删除') removeCoach(row)
}

function handlePlayerAction(action: string, row: Record<string, unknown>) {
  if (action === '删除') removePlayer(row)
}

watch(selectedName, () => {
  loadRoster().catch((error) => {
    showMessage(error instanceof ApiError ? error.message : '人员加载失败', 'error')
  })
})

async function load() {
  loading.value = true
  try {
    await loadTeams()
    await loadRoster()
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '本校人员加载失败', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page-root">
  <PageHeader title="本校人员" desc="查看并维护本校球队的教练与球员信息，支持批量上传" />

  <p v-if="message" class="page-tip" :class="messageType">{{ message }}</p>
  <p v-if="loading" class="page-tip">正在加载本校球队人员…</p>

  <template v-else-if="teams.length">
    <div class="team-bar">
      <div class="team-select">
        <label class="field-label">选择球队</label>
        <AppSelect v-model="selectedName" :options="teams.map((team) => team.name)" />
      </div>
      <div v-if="selectedTeam" class="team-meta">
        <span>{{ selectedTeam.group }} · {{ selectedTeam.school }}</span>
        <span class="score-tag" :class="{ ok: completeness.complete }">
          完善度 {{ completeness.score }} / 100
        </span>
      </div>
    </div>

    <p v-if="!completeness.complete" class="page-tip hint">
      待完善：{{ completeness.missing.join('、') }}。球队完善后方可报名比赛。
    </p>

    <h3 class="section-title">教练组（{{ coaches.length }} / 5）</h3>
    <DataTable
      :columns="coachColumns"
      :rows="coachRows"
      :row-actions="() => ['删除']"
      @action="handleCoachAction"
    />
    <p v-if="!coaches.length" class="empty-tip">暂无教练信息。</p>

    <form class="inline-form" @submit.prevent="addCoach">
      <div class="field">
        <label class="field-label">姓名</label>
        <input v-model="coachForm.name" class="field-input" type="text" maxlength="20" placeholder="教练姓名" />
      </div>
      <div class="field">
        <label class="field-label">类别</label>
        <AppSelect v-model="coachForm.category" :options="CATEGORY_OPTIONS" />
      </div>
      <div class="field">
        <label class="field-label">等级</label>
        <input v-model="coachForm.level" class="field-input" type="text" maxlength="20" placeholder="如：亚足联 C 级" />
      </div>
      <div class="field">
        <label class="field-label">联系电话</label>
        <input v-model="coachForm.phone" class="field-input" type="text" maxlength="11" placeholder="11 位手机号（可选）" />
      </div>
      <button type="submit" class="btn btn-primary" :disabled="saving">添加教练</button>
    </form>

    <h3 class="section-title">球员名单（{{ players.length }} / 60）</h3>
    <DataTable
      :columns="playerColumns"
      :rows="playerRows"
      :row-actions="() => ['删除']"
      @action="handlePlayerAction"
    />
    <p v-if="!players.length" class="empty-tip">暂无球员信息。</p>

    <form class="inline-form" @submit.prevent="addPlayer">
      <div class="field">
        <label class="field-label">姓名</label>
        <input v-model="playerForm.name" class="field-input" type="text" maxlength="20" placeholder="球员姓名" />
      </div>
      <div class="field wide">
        <label class="field-label">身份证号</label>
        <input v-model="playerForm.idCard" class="field-input" type="text" maxlength="18" placeholder="18 位或脱敏格式" />
      </div>
      <div class="field">
        <label class="field-label">出生日期</label>
        <input v-model="playerForm.birthDate" class="field-input" type="date" />
      </div>
      <div class="field">
        <label class="field-label">位置</label>
        <AppSelect v-model="playerForm.position" :options="POSITION_OPTIONS" />
      </div>
      <div class="field narrow">
        <label class="field-label">球衣号</label>
        <input v-model="playerForm.jerseyNo" class="field-input" type="number" min="1" max="99" placeholder="1-99" />
      </div>
      <button type="submit" class="btn btn-primary" :disabled="saving">添加球员</button>
    </form>

    <h3 class="section-title">批量上传人员</h3>
    <p class="page-tip">
      每行一条，格式：姓名,身份证号,出生日期,位置,球衣号。重复姓名、身份证或球衣号会自动跳过。
    </p>
    <textarea
      v-model="importText"
      class="import-area"
      rows="5"
      placeholder="王小虎,5101**********0111,2010-05-01,前锋,11&#10;李四个,5101**********0112,2010-06-02,后卫,12"
    ></textarea>
    <div class="import-actions">
      <button type="button" class="btn btn-primary" :disabled="saving" @click="importPlayers">批量上传</button>
      <span v-if="importResult" class="import-result">{{ importResult }}</span>
    </div>
  </template>

  <div v-else class="empty-card">
    <p>本校尚未建立球队档案，请先由球队负责人创建球队。</p>
    <router-link class="btn btn-primary" to="/admin/school/teams">查看本校球队</router-link>
  </div>
  </div>
</template>

<style scoped>
.team-bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
}

.team-select {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 260px;
}

.field-label {
  font-size: 12px;
  color: var(--muted);
}

.team-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--muted);
}

.score-tag {
  padding: 3px 10px;
  border-radius: 999px;
  background: #fff4e5;
  color: #a5611a;
  font-weight: 600;
}

.score-tag.ok {
  background: var(--green-light);
  color: var(--green-dark);
}

.inline-form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  padding: 16px;
  margin-top: 10px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 150px;
  flex: 1 1 160px;
}

.field.wide {
  flex: 2 1 220px;
}

.field.narrow {
  flex: 0 0 100px;
}

.field-input {
  width: 100%;
  padding: 9px 11px;
  border: 1.5px solid #d8e2da;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
}

.empty-tip {
  padding: 12px 0;
  font-size: 13px;
  color: var(--muted);
  text-align: center;
}

.import-area {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid #d8e2da;
  border-radius: 10px;
  font-size: 13px;
  font-family: inherit;
  line-height: 1.7;
  resize: vertical;
}

.import-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}

.import-result {
  font-size: 12px;
  color: var(--muted);
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
