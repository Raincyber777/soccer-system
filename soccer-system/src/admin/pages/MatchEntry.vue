<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataForm from '../../components/common/DataForm.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, SearchField, TableColumn } from '../../components/common/types'
import {
  createGoalRecord,
  createPenalty,
  createReferee,
  deleteGoalRecord,
  deletePenalty,
  deleteReferee,
  errMsg,
  fetchAdminMatches,
  fetchGoalRecords,
  fetchPenalties,
  fetchReferees,
  updateGoalRecord,
  updatePenalty,
  updateReferee,
} from '../../api/manage'
import { fetchPlayers } from '../../api/person'
import type { ApiMatch } from '../../api/types'

// 赛事信息录入：对阵的新增/删除在「对阵信息管理」，本页按场次维护
// 进球记录、判罚与裁判员（先在上方选择场次，再在各分区录入/修改/删除）。

const searchFields: SearchField[] = [
  { key: 'team', label: '球队名称', placeholder: '输入对阵球队' },
  { key: 'status', label: '比赛状态', type: 'select', options: ['未开始', '进行中', '已结束', '已延期'] },
]

const matchColumns: TableColumn[] = [
  { key: 'match', label: '场次' },
  { key: 'home', label: '主队', width: '130px' },
  { key: 'away', label: '客队', width: '130px' },
  { key: 'time', label: '比赛时间', width: '160px' },
  { key: 'status', label: '状态', width: '90px' },
]

type MatchRow = {
  id: number
  match: string
  home: string
  away: string
  time: string
  status: string
}

const matches = ref<ApiMatch[]>([])
const filters = ref<Record<string, string>>({})
const filteredMatches = computed<MatchRow[]>(() =>
  matches.value
    .map((m) => ({
      id: m.id,
      match: `${m.group_type_display} ${m.round_name}`.trim(),
      home: m.home_team_name,
      away: m.away_team_name,
      time: (m.match_time || '').slice(0, 16).replace('T', ' '),
      status: m.status_display,
    }))
    .filter((r) => {
      if (filters.value.team && !`${r.home}${r.away}`.includes(filters.value.team.trim())) return false
      if (filters.value.status && r.status !== filters.value.status) return false
      return true
    }),
)

// ---------- 球员下拉（进球/判罚共用） ----------

const players = ref<{ id: number; name: string; team_name: string }[]>([])
const playerOptions = computed(() => players.value.map((p) => `${p.name}（${p.team_name}）`))
const playerIdByOption = computed(() => {
  const map = new Map<string, number>()
  players.value.forEach((p, i) => map.set(playerOptions.value[i] ?? '', p.id))
  return map
})
const playerOptionById = computed(() => {
  const map = new Map<number, string>()
  players.value.forEach((p, i) => map.set(p.id, playerOptions.value[i] ?? ''))
  return map
})

// ---------- 当前场次与三块数据 ----------

const currentMatch = ref<ApiMatch | null>(null)
const currentMatchLabel = computed(() => {
  const m = currentMatch.value
  if (!m) return ''
  return `${m.group_type_display} ${m.round_name}：${m.home_team_name} vs ${m.away_team_name}`.trim()
})

// 进球
type GoalRow = {
  id: number
  playerId: number
  player: string
  team: string
  goals: number
  assists: number
  minute: string
  note: string
}
const goalRows = ref<GoalRow[]>([])
const goalEditingId = ref<number | null>(null)
const goalInitial = ref<Record<string, string>>({})
const goalFormKey = ref(0)
const goalFields = computed<FormField[]>(() => [
  { key: 'player', label: '进球球员', type: 'select', options: playerOptions.value, placeholder: '请选择球员' },
  { key: 'goals', label: '进球数', type: 'number', placeholder: '本场进球数' },
  { key: 'assists', label: '助攻数', type: 'number', placeholder: '不填按 0 计' },
  { key: 'minute', label: '进球分钟', type: 'number', placeholder: '如 45' },
  { key: 'note', label: '备注', placeholder: '选填' },
])

// 判罚
type PenaltyRow = {
  id: number
  playerId: number
  player: string
  type: string
  minute: string
  reason: string
}
const penaltyRows = ref<PenaltyRow[]>([])
const penaltyEditingId = ref<number | null>(null)
const penaltyInitial = ref<Record<string, string>>({})
const penaltyFormKey = ref(0)
const penaltyFields = computed<FormField[]>(() => [
  { key: 'player', label: '被罚球员', type: 'select', options: playerOptions.value, placeholder: '请选择球员' },
  { key: 'type', label: '判罚类型', type: 'select', options: ['黄牌', '红牌'] },
  { key: 'minute', label: '分钟', type: 'number', placeholder: '如 78' },
  { key: 'reason', label: '判罚原因', placeholder: '如拖延时间、恶意犯规' },
])
const TYPE_TO_API: Record<string, 'yellow' | 'red'> = { 黄牌: 'yellow', 红牌: 'red' }

// 裁判
type RefereeRow = {
  id: number
  name: string
  role: string
  cert: string
}
const refereeRows = ref<RefereeRow[]>([])
const refEditingId = ref<number | null>(null)
const refInitial = ref<Record<string, string>>({})
const refFormKey = ref(0)
const refFields = computed<FormField[]>(() => [
  { key: 'name', label: '裁判姓名', placeholder: '输入姓名' },
  { key: 'role', label: '执裁角色', type: 'select', options: ['主裁判', '边裁', '第四官员'] },
  { key: 'cert', label: '裁判等级', placeholder: '如国家一级' },
])
const ROLE_TO_API: Record<string, 'main' | 'linesman' | 'fourth'> = { 主裁判: 'main', 边裁: 'linesman', 第四官员: 'fourth' }

const goalColumns: TableColumn[] = [
  { key: 'player', label: '球员', width: '150px' },
  { key: 'team', label: '球队' },
  { key: 'goals', label: '进球', width: '70px' },
  { key: 'assists', label: '助攻', width: '70px' },
  { key: 'minute', label: '分钟', width: '70px' },
  { key: 'note', label: '备注' },
]
const penaltyColumns: TableColumn[] = [
  { key: 'player', label: '球员', width: '150px' },
  { key: 'type', label: '类型', width: '80px' },
  { key: 'minute', label: '分钟', width: '80px' },
  { key: 'reason', label: '原因' },
]
const refereeColumns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '120px' },
  { key: 'role', label: '角色', width: '100px' },
  { key: 'cert', label: '等级' },
]

async function refreshPlayers() {
  const list = await fetchPlayers()
  if (list) players.value = list.map((p) => ({ id: p.id, name: p.name, team_name: p.team_name }))
}

async function loadMatchData(matchId: number) {
  const [goals, penalties, referees] = await Promise.all([
    fetchGoalRecords(matchId),
    fetchPenalties(matchId),
    fetchReferees(matchId),
  ])
  if (goals) {
    goalRows.value = goals.map((g) => ({
      id: g.id,
      playerId: g.player,
      player: g.player_name,
      team: g.team_name || '—',
      goals: g.goals,
      assists: g.assists,
      minute: g.minute === null ? '—' : `${g.minute}'`,
      note: g.note || '—',
    }))
  }
  if (penalties) {
    penaltyRows.value = penalties.map((p) => ({
      id: p.id,
      playerId: p.player,
      player: p.player_name,
      type: p.type === 'red' ? '红牌' : '黄牌',
      minute: p.minute === null ? '—' : `${p.minute}'`,
      reason: p.reason || '—',
    }))
  }
  if (referees) {
    refereeRows.value = referees.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role_display,
      cert: r.cert_level || '—',
    }))
  }
}

async function onSelectMatch(action: string, row: Record<string, unknown>) {
  const r = row as unknown as MatchRow
  const match = matches.value.find((m) => m.id === r.id)
  if (!match) return
  currentMatch.value = match
  // 切换场次时清掉未提交的编辑态
  goalEditingId.value = null
  penaltyEditingId.value = null
  refEditingId.value = null
  goalFormKey.value++
  penaltyFormKey.value++
  refFormKey.value++
  await loadMatchData(r.id)
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  void action
}

function onSearch(f: Record<string, string>) {
  filters.value = f
}

function requireMatch(): boolean {
  if (currentMatch.value) return true
  alert('请先在上方场次列表选择一场比赛')
  return false
}

function playerOf(option: string): number | null {
  return playerIdByOption.value.get(option) ?? null
}

// ---------- 进球提交 ----------

async function onSubmitGoal(data: Record<string, string>) {
  if (!requireMatch()) return
  const playerId = playerOf(data.player ?? '')
  if (playerId === null) {
    alert('请选择进球球员')
    return
  }
  const payload = {
    match: currentMatch.value!.id,
    player: playerId,
    goals: Number(data.goals) || 0,
    assists: Number(data.assists) || 0,
    minute: data.minute ? Number(data.minute) : null,
    note: (data.note ?? '').trim(),
  }
  try {
    if (goalEditingId.value !== null) {
      await updateGoalRecord(goalEditingId.value, payload)
      goalEditingId.value = null
      goalInitial.value = {}
    } else {
      await createGoalRecord(payload)
    }
    goalFormKey.value++
    await loadMatchData(currentMatch.value!.id)
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onActionGoal(action: string, row: Record<string, unknown>) {
  const r = row as unknown as GoalRow
  if (action === '修改') {
    goalEditingId.value = r.id
    goalInitial.value = {
      player: playerOptionById.value.get(r.playerId) ?? '',
      goals: String(r.goals),
      assists: String(r.assists),
      minute: r.minute === '—' ? '' : r.minute.replace("'", ''),
      note: r.note === '—' ? '' : r.note,
    }
    goalFormKey.value++
    return
  }
  if (action === '删除') {
    if (!confirm(`确认删除 ${r.player} 的进球记录？`)) return
    try {
      await deleteGoalRecord(r.id)
      if (currentMatch.value) await loadMatchData(currentMatch.value.id)
    } catch (err) {
      alert(errMsg(err))
    }
  }
}

// ---------- 判罚提交 ----------

async function onSubmitPenalty(data: Record<string, string>) {
  if (!requireMatch()) return
  const playerId = playerOf(data.player ?? '')
  if (playerId === null) {
    alert('请选择被罚球员')
    return
  }
  const payload = {
    match: currentMatch.value!.id,
    player: playerId,
    type: TYPE_TO_API[data.type ?? '黄牌'] ?? 'yellow',
    minute: data.minute ? Number(data.minute) : null,
    reason: (data.reason ?? '').trim(),
  }
  try {
    if (penaltyEditingId.value !== null) {
      await updatePenalty(penaltyEditingId.value, payload)
      penaltyEditingId.value = null
      penaltyInitial.value = {}
    } else {
      await createPenalty(payload)
    }
    penaltyFormKey.value++
    await loadMatchData(currentMatch.value!.id)
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onActionPenalty(action: string, row: Record<string, unknown>) {
  const r = row as unknown as PenaltyRow
  if (action === '修改') {
    penaltyEditingId.value = r.id
    penaltyInitial.value = {
      player: playerOptionById.value.get(r.playerId) ?? '',
      type: r.type,
      minute: r.minute === '—' ? '' : r.minute.replace("'", ''),
      reason: r.reason === '—' ? '' : r.reason,
    }
    penaltyFormKey.value++
    return
  }
  if (action === '删除') {
    if (!confirm(`确认删除 ${r.player} 的判罚记录？`)) return
    try {
      await deletePenalty(r.id)
      if (currentMatch.value) await loadMatchData(currentMatch.value.id)
    } catch (err) {
      alert(errMsg(err))
    }
  }
}

// ---------- 裁判提交 ----------

async function onSubmitReferee(data: Record<string, string>) {
  if (!requireMatch()) return
  const name = (data.name ?? '').trim()
  if (!name) {
    alert('请填写裁判姓名')
    return
  }
  const payload = {
    match: currentMatch.value!.id,
    name,
    role: ROLE_TO_API[data.role ?? '主裁判'] ?? 'main',
    cert_level: (data.cert ?? '').trim(),
  }
  try {
    if (refEditingId.value !== null) {
      await updateReferee(refEditingId.value, payload)
      refEditingId.value = null
      refInitial.value = {}
    } else {
      await createReferee(payload)
    }
    refFormKey.value++
    await loadMatchData(currentMatch.value!.id)
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onActionReferee(action: string, row: Record<string, unknown>) {
  const r = row as unknown as RefereeRow
  if (action === '修改') {
    refEditingId.value = r.id
    refInitial.value = { name: r.name, role: r.role, cert: r.cert === '—' ? '' : r.cert }
    refFormKey.value++
    return
  }
  if (action === '删除') {
    if (!confirm(`确认删除裁判 ${r.name} 的记录？`)) return
    try {
      await deleteReferee(r.id)
      if (currentMatch.value) await loadMatchData(currentMatch.value.id)
    } catch (err) {
      alert(errMsg(err))
    }
  }
}

onMounted(() => {
  void refreshPlayers()
  void fetchAdminMatches().then((list) => {
    if (list) matches.value = list
  })
})
</script>

<template>
  <PageHeader title="赛事信息录入" desc="按场次录入进球、判罚与裁判员信息；对阵的新增/删除请前往「对阵信息管理」" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="() => onSearch({})" />

  <h3 class="section-title">场次列表</h3>
  <DataTable
    :columns="matchColumns"
    :rows="filteredMatches"
    :actions="['进球信息', '判罚信息', '裁判员']"
    @action="onSelectMatch"
  />

  <template v-if="currentMatch">
    <h3 class="section-title">进球记录 — {{ currentMatchLabel }}</h3>
    <DataForm
      :key="`g${goalFormKey}`"
      :fields="goalFields"
      :submit-text="goalEditingId ? '保存修改' : '登记进球'"
      :initial="goalInitial"
      @submit="onSubmitGoal"
    />
    <p v-if="!goalRows.length" class="page-tip" style="margin: 10px 0">该场次暂无进球记录。</p>
    <DataTable v-else :columns="goalColumns" :rows="goalRows" :actions="['修改', '删除']" @action="onActionGoal" />

    <h3 class="section-title">判罚信息 — {{ currentMatchLabel }}</h3>
    <DataForm
      :key="`p${penaltyFormKey}`"
      :fields="penaltyFields"
      :submit-text="penaltyEditingId ? '保存修改' : '登记判罚'"
      :initial="penaltyInitial"
      @submit="onSubmitPenalty"
    />
    <p v-if="!penaltyRows.length" class="page-tip" style="margin: 10px 0">该场次暂无判罚记录。</p>
    <DataTable v-else :columns="penaltyColumns" :rows="penaltyRows" :actions="['修改', '删除']" @action="onActionPenalty" />

    <h3 class="section-title">裁判员 — {{ currentMatchLabel }}</h3>
    <DataForm
      :key="`r${refFormKey}`"
      :fields="refFields"
      :submit-text="refEditingId ? '保存修改' : '添加裁判'"
      :initial="refInitial"
      @submit="onSubmitReferee"
    />
    <p v-if="!refereeRows.length" class="page-tip" style="margin: 10px 0">该场次暂无裁判员记录。</p>
    <DataTable v-else :columns="refereeColumns" :rows="refereeRows" :actions="['修改', '删除']" @action="onActionReferee" />
  </template>
  <p v-else class="page-tip">点击场次行的「进球信息 / 判罚信息 / 裁判员」加载该场比赛的数据录入面板。</p>
</template>
