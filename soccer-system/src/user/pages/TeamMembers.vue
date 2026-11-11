<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import AppSelect from '../../components/common/AppSelect.vue'
import type { TableColumn } from '../../components/common/types'
import {
  teamApi,
  teamRosterApi,
  ApiError,
  type Team,
  type TeamPlayer,
  type TeamPlayerInput,
  type TeamPlayerPosition,
} from '../../api'

// 球队队员：球队负责人维护名单，支持按姓名/身份证搜索、单人添加与批量导入
const team = ref<Team | null>(null)
const players = ref<TeamPlayer[]>([])
const loading = ref(true)
const saving = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const importText = ref('')
const importResult = ref('')

const keyword = ref('')
const positionFilter = ref('全部位置')
const POSITION_OPTIONS: TeamPlayerPosition[] = ['门将', '后卫', '中场', '前锋']
const POSITION_FILTER_OPTIONS = ['全部位置', ...POSITION_OPTIONS]

const columns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '90px' },
  { key: 'idCard', label: '身份证号', width: '170px' },
  { key: 'birthDate', label: '出生日期', width: '110px' },
  { key: 'position', label: '场上位置', width: '90px' },
  { key: 'jerseyNo', label: '球衣号', width: '70px' },
  { key: 'photo', label: '照片', width: '80px' },
]

const filtered = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  return players.value.filter((player) => {
    if (positionFilter.value !== '全部位置' && player.position !== positionFilter.value) return false
    if (!key) return true
    return player.name.toLowerCase().includes(key) || player.idCard.toLowerCase().includes(key)
  })
})

const rows = computed<Record<string, unknown>[]>(() =>
  filtered.value.map((player) => ({
    id: player.id,
    name: player.name,
    idCard: player.idCard,
    birthDate: player.birthDate || '—',
    position: player.position,
    jerseyNo: player.jerseyNo,
    photo: player.photoUploaded ? '已上传' : '未上传',
  })),
)

const form = reactive({
  name: '',
  idCard: '',
  birthDate: '',
  position: '前锋' as TeamPlayerPosition,
  jerseyNo: '',
})

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
}

function toInput(list: TeamPlayer[]): TeamPlayerInput[] {
  return list.map((player) => ({
    name: player.name,
    idCard: player.idCard,
    birthDate: player.birthDate,
    position: player.position,
    jerseyNo: player.jerseyNo,
    photoUploaded: player.photoUploaded,
  }))
}

async function reload() {
  players.value = await teamRosterApi.members(team.value?.id ?? null)
}

async function addPlayer() {
  if (!team.value || saving.value) return
  saving.value = true
  try {
    const next = [
      ...toInput(players.value),
      {
        name: form.name.trim(),
        idCard: form.idCard.trim(),
        birthDate: form.birthDate,
        position: form.position,
        jerseyNo: Number(form.jerseyNo),
      },
    ]
    players.value = await teamRosterApi.saveMembers(team.value.id, next)
    form.name = ''
    form.idCard = ''
    form.birthDate = ''
    form.jerseyNo = ''
    showMessage('队员已添加，完善度已同步更新。')
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '队员保存失败', 'error')
  } finally {
    saving.value = false
  }
}

async function removePlayer(row: Record<string, unknown>) {
  if (!team.value || saving.value) return
  const target = players.value.find((player) => player.id === String(row.id))
  if (!target) return
  if (!window.confirm(`确认从名单中删除「${target.name}」？`)) return
  saving.value = true
  try {
    const next = players.value.filter((player) => player.id !== target.id)
    players.value = await teamRosterApi.saveMembers(team.value.id, toInput(next))
    showMessage(`已删除「${target.name}」。`)
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '删除失败', 'error')
  } finally {
    saving.value = false
  }
}

async function togglePhoto(row: Record<string, unknown>) {
  if (!team.value || saving.value) return
  const target = players.value.find((player) => player.id === String(row.id))
  if (!target) return
  saving.value = true
  try {
    const next = players.value.map((player) =>
      player.id === target.id ? { ...player, photoUploaded: !player.photoUploaded } : player,
    )
    players.value = await teamRosterApi.saveMembers(team.value.id, toInput(next))
    showMessage(`「${target.name}」照片状态已更新。`)
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '照片状态更新失败', 'error')
  } finally {
    saving.value = false
  }
}

function rowActions(row: Record<string, unknown>) {
  return [row.photo === '已上传' ? '标记无照片' : '标记已上传', '删除']
}

function handleAction(action: string, row: Record<string, unknown>) {
  if (action === '删除') removePlayer(row)
  if (action === '标记无照片' || action === '标记已上传') togglePhoto(row)
}

/** 批量导入格式：姓名,身份证号,出生日期,位置,球衣号（每行一条） */
async function importPlayers() {
  if (!team.value || saving.value) return
  const lines = importText.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) {
    showMessage('请先粘贴要导入的球员数据', 'error')
    return
  }
  const rowsInput: TeamPlayerInput[] = []
  const formatErrors: string[] = []
  lines.forEach((line, index) => {
    const parts = line.split(/[,，]/).map((part) => part.trim())
    if (parts.length < 5) {
      formatErrors.push(`第 ${index + 1} 行：需要 5 个字段（姓名,身份证号,出生日期,位置,球衣号）`)
      return
    }
    const [name, idCard, birthDate, position, jersey] = parts
    if (!POSITION_OPTIONS.includes(position as TeamPlayerPosition)) {
      formatErrors.push(`第 ${index + 1} 行：位置需为 门将/后卫/中场/前锋`)
      return
    }
    rowsInput.push({
      name: name ?? '',
      idCard: idCard ?? '',
      birthDate: birthDate ?? '',
      position: position as TeamPlayerPosition,
      jerseyNo: Number(jersey),
    })
  })

  saving.value = true
  try {
    const result = await teamRosterApi.importMembers(team.value.id, rowsInput)
    await reload()
    importResult.value = `成功导入 ${result.added} 条，跳过 ${result.skipped + formatErrors.length} 条。`
    if (result.errors.length || formatErrors.length) {
      importResult.value += ` ${[...formatErrors, ...result.errors].slice(0, 5).join('；')}`
    }
    if (result.added) importText.value = ''
    showMessage(`批量导入完成：新增 ${result.added} 人，名单共 ${players.value.length} 人。`)
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '批量导入失败', 'error')
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
    showMessage(error instanceof ApiError ? error.message : '队员信息加载失败', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <PageHeader title="球队成员" desc="维护球队球员名单，支持按姓名或身份证搜索、单人添加与批量导入" />

  <p v-if="message" class="page-tip" :class="messageType">{{ message }}</p>
  <p v-if="loading" class="page-tip">正在加载队员信息…</p>

  <template v-else-if="team">
    <p class="page-tip">
      当前球队：{{ team.name }} · 球员 {{ players.length }} / 60 人。
      报名资格要求至少 5 名球员，人员信息计入球队完善度。
    </p>

    <div class="filter-row">
      <input v-model="keyword" class="field-input" type="text" placeholder="按姓名或身份证号搜索" />
      <AppSelect v-model="positionFilter" :options="POSITION_FILTER_OPTIONS" compact />
    </div>

    <DataTable
      :columns="columns"
      :rows="rows"
      :row-actions="rowActions"
      @action="handleAction"
    />
    <p v-if="!filtered.length" class="empty-tip">暂无符合条件的球员。</p>

    <h3 class="section-title">添加队员</h3>
    <form class="player-form" @submit.prevent="addPlayer">
      <div class="field">
        <label class="field-label">姓名</label>
        <input v-model="form.name" class="field-input" type="text" maxlength="20" placeholder="如：王小虎" />
      </div>
      <div class="field wide">
        <label class="field-label">身份证号</label>
        <input v-model="form.idCard" class="field-input" type="text" maxlength="18" placeholder="18 位或脱敏格式" />
      </div>
      <div class="field">
        <label class="field-label">出生日期</label>
        <input v-model="form.birthDate" class="field-input" type="date" />
      </div>
      <div class="field">
        <label class="field-label">场上位置</label>
        <AppSelect v-model="form.position" :options="POSITION_OPTIONS" />
      </div>
      <div class="field narrow">
        <label class="field-label">球衣号</label>
        <input v-model="form.jerseyNo" class="field-input" type="number" min="1" max="99" placeholder="1-99" />
      </div>
      <button type="submit" class="btn btn-primary" :disabled="saving">添加队员</button>
    </form>

    <h3 class="section-title">批量导入</h3>
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
      <button type="button" class="btn btn-primary" :disabled="saving" @click="importPlayers">批量导入</button>
      <span v-if="importResult" class="import-result">{{ importResult }}</span>
    </div>
  </template>

  <div v-else class="empty-card">
    <p>请先创建球队信息，再维护球员名单。</p>
    <router-link class="btn btn-primary" to="/user/team-info">前往创建球队</router-link>
  </div>
</template>

<style scoped>
.filter-row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.filter-row .field-input {
  flex: 1;
}

.field-input {
  padding: 9px 11px;
  border: 1.5px solid #d8e2da;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
}

.empty-tip {
  padding: 14px 0;
  font-size: 13px;
  color: var(--muted);
  text-align: center;
}

.player-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  align-items: end;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
}

.player-form .wide {
  grid-column: span 2;
}

.player-form .narrow {
  max-width: 100px;
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
