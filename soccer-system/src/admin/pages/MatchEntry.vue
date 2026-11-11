<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import DataForm from '../../components/common/DataForm.vue'
import AppModal from '../../components/common/AppModal.vue'
import type { FormField, SearchField, TableColumn } from '../../components/common/types'
import {
  matchEventApi,
  playerApi,
  tournamentApi,
  ApiError,
  type MatchEvent,
  type MatchEventType,
  type Player,
  type Tournament,
} from '../../api'
import { useAuth } from '../../stores/auth'

// 赛事信息录入（对应需求：录入/修改/删除/查看对阵双方、进球、判罚信息，录入裁判员信息）
// P3 扩展：比赛事件补录支持进球、助攻、黄牌、红牌、换人，事件将进入球员全量统计与门户 AI 报告
const auth = useAuth()

const EVENT_TYPES: MatchEventType[] = ['进球', '助攻', '黄牌', '红牌', '换人']

const searchFields: SearchField[] = [
  { key: 'keyword', label: '关键词', placeholder: '球员 / 球队 / 场次' },
  { key: 'type', label: '事件类型', type: 'select', options: EVENT_TYPES },
]

const columns: TableColumn[] = [
  { key: 'tournamentName', label: '赛事' },
  { key: 'matchLabel', label: '场次', width: '120px' },
  { key: 'versus', label: '对阵' },
  { key: 'playerName', label: '球员', width: '90px' },
  { key: 'team', label: '所属球队', width: '160px' },
  { key: 'type', label: '事件', width: '70px' },
  { key: 'minuteText', label: '时间', width: '70px' },
  { key: 'createdAt', label: '录入时间', width: '150px' },
]

const events = ref<MatchEvent[]>([])
const tournaments = ref<Tournament[]>([])
const players = ref<Player[]>([])
const loading = ref(false)
const message = ref('')

const createOpen = ref(false)
const createError = ref('')
const formVersion = ref(0)

const playerLabel = (p: Player) => `${p.name}｜${p.team}`

const formFields = computed<FormField[]>(() => [
  { key: 'tournament', label: '所属赛事', type: 'select', options: tournaments.value.map((t) => t.name) },
  { key: 'matchLabel', label: '场次', placeholder: '如：中学组 第 3 轮 / 半决赛' },
  { key: 'home', label: '主队', placeholder: '如：成都市实验中学足球队' },
  { key: 'away', label: '客队', placeholder: '如：绵阳南山中学' },
  { key: 'player', label: '事件球员', type: 'select', options: players.value.map(playerLabel) },
  { key: 'type', label: '事件类型', type: 'select', options: EVENT_TYPES },
  { key: 'minute', label: '发生时间（分钟）', type: 'number', placeholder: '0 - 120' },
  { key: 'note', label: '备注', type: 'textarea', placeholder: '选填：如禁区内推射、战术犯规' },
])

const initialForm = computed<Record<string, string>>(() => ({
  type: '进球',
  minute: '45',
}))

const rows = computed<Record<string, unknown>[]>(() =>
  events.value.map((e) => ({
    ...e,
    versus: `${e.home} vs ${e.away}`,
    minuteText: `${e.minute}'`,
  })),
)

function rowActions() {
  return ['删除']
}

async function load(filters: Record<string, string> = {}) {
  loading.value = true
  try {
    events.value = await matchEventApi.list({
      keyword: filters.keyword || undefined,
      type: (filters.type as MatchEventType) || undefined,
    })
  } catch (error) {
    message.value = error instanceof ApiError ? error.message : '事件加载失败'
  } finally {
    loading.value = false
  }
}

async function loadOptions() {
  try {
    const [list, roster] = await Promise.all([tournamentApi.list(), playerApi.list()])
    tournaments.value = list
    players.value = roster
  } catch (error) {
    message.value = error instanceof ApiError ? error.message : '基础数据加载失败'
  }
}

function openCreate() {
  createError.value = ''
  formVersion.value += 1
  createOpen.value = true
}

async function handleCreate(data: Record<string, string>) {
  createError.value = ''

  const tournament = tournaments.value.find((t) => t.name === data.tournament)
  if (!tournament) {
    createError.value = '请选择所属赛事'
    return
  }
  const player = players.value.find((p) => playerLabel(p) === data.player)
  if (!player) {
    createError.value = '请选择事件球员'
    return
  }
  const type = EVENT_TYPES.find((t) => t === data.type)
  if (!type) {
    createError.value = '请选择事件类型'
    return
  }

  try {
    await matchEventApi.create({
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      matchLabel: data.matchLabel ?? '',
      home: data.home ?? '',
      away: data.away ?? '',
      playerId: player.id,
      playerName: player.name,
      team: player.team,
      type,
      minute: Number(data.minute ?? ''),
      note: data.note,
      createdBy: auth.state.account || 'admin001',
    })
    createOpen.value = false
    message.value = '比赛事件已补录，球员全量统计与门户 AI 报告将同步更新。'
    await load()
  } catch (error) {
    createError.value = error instanceof ApiError ? error.message : '事件补录失败'
  }
}

async function handleAction(action: string, row: Record<string, unknown>) {
  if (action !== '删除') {
    message.value = `【演示】${action}：待接入后端`
    return
  }
  try {
    await matchEventApi.remove(String(row.id ?? ''))
    message.value = `已删除「${String(row.playerName ?? '')}」的${String(row.type ?? '')}记录。`
    await load()
  } catch (error) {
    message.value = error instanceof ApiError ? error.message : '删除失败'
  }
}

function onSearch(filters: Record<string, string>) {
  void load(filters)
}

onMounted(async () => {
  await Promise.all([loadOptions(), load()])
})
</script>

<template>
  <PageHeader title="赛事信息录入" desc="补录对阵双方、进球、助攻、红黄牌与换人事件，所有记录支持查看与删除" />

  <div class="toolbar">
    <span class="toolbar-hint">
      事件补录后会同步到球员全量统计与门户 AI 分析报告，请按实际比赛记录录入。
    </span>
    <button type="button" class="btn btn-primary" @click="openCreate">补录比赛事件</button>
  </div>

  <p v-if="message" class="page-tip">{{ message }}</p>

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable :columns="columns" :rows="rows" :row-actions="rowActions" @action="handleAction" />

  <p v-if="loading" class="loading-tip">正在加载比赛事件…</p>

  <AppModal :open="createOpen" title="补录比赛事件" @close="createOpen = false">
    <p class="modal-tip">
      选择赛事、场次与球员后录入事件；补录数据会进入球员全量统计和门户 AI 报告。
    </p>
    <p v-if="createError" class="form-error">{{ createError }}</p>
    <DataForm
      :key="formVersion"
      :fields="formFields"
      :initial="initialForm"
      submit-text="保存事件"
      @submit="handleCreate"
    />
  </AppModal>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  background: #fff;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 14px;
  box-shadow: var(--shadow-sm);
}

.toolbar-hint {
  font-size: 12px;
  color: var(--muted);
}

.modal-tip {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.7;
  margin-bottom: 12px;
}

.form-error {
  background: #fff2f1;
  border: 1px solid #f0c4c0;
  color: #a3312a;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 12px;
}

.loading-tip {
  margin-top: 10px;
  font-size: 12px;
  color: var(--muted);
}
</style>
