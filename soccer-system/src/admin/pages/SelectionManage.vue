<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataForm from '../../components/common/DataForm.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'
import { fetchPlayers } from '../../api/person'
import type { ApiPlayer } from '../../api/team'
import {
  createSelectionScore,
  deleteSelectionScore,
  errMsg,
  fetchSelectionScores,
  SELECTION_STAGE_DISPLAY,
  updateSelectionScore,
  type ApiSelectionScore,
  type ScoreValue,
} from '../../api/selection'

// 遴选初选：录入球员技评/体能评分（后端自动合计），通过进入复选、未通过淘汰。
// 球员下拉来自注册名单，组别随球员自动带出。

const searchFields: SearchField[] = [
  { key: 'name', label: '球员姓名', placeholder: '输入球员姓名' },
  { key: 'group', label: '组别', type: 'select', options: ['小学组', '中学组', '高中组', '高校组'] },
]

const GROUP_TO_API: Record<string, string> = {
  小学组: 'primary',
  中学组: 'middle',
  高中组: 'high',
  高校组: 'university',
}

const columns: TableColumn[] = [
  { key: 'name', label: '球员', width: '100px' },
  { key: 'team', label: '队伍' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'skill', label: '技评得分', width: '90px' },
  { key: 'physical', label: '体能得分', width: '90px' },
  { key: 'total', label: '总分', width: '80px' },
  { key: 'status', label: '状态', width: '100px' },
]

interface ScoreRow {
  id: number
  playerId: number
  name: string
  team: string
  group: string
  skill: ScoreValue
  physical: ScoreValue
  total: ScoreValue
  status: string
}

const players = ref<ApiPlayer[]>([])
const allRows = ref<ScoreRow[]>([])
const rows = ref<ScoreRow[]>([])
const editingId = ref<number | null>(null)
const formKey = ref(0)
const formInitial = ref<Record<string, string>>({})
const filters = ref<Record<string, string>>({})

const playerOptions = computed(() => players.value.map((p) => `${p.name}（${p.group_type_display}）`))
const playerByOption = computed(() => {
  const map = new Map<string, ApiPlayer>()
  players.value.forEach((p, i) => map.set(playerOptions.value[i] ?? '', p))
  return map
})

const formFields = computed(() => [
  { key: 'player', label: '球员', type: 'select' as const, options: playerOptions.value, placeholder: '请选择球员' },
  { key: 'skill', label: '技评得分', type: 'number' as const, placeholder: '0-100' },
  { key: 'physical', label: '体能得分', type: 'number' as const, placeholder: '0-100' },
])

function applyFilter() {
  let list = allRows.value
  if (filters.value.name) list = list.filter((r) => r.name.includes(filters.value.name!.trim()))
  rows.value = list
}

async function refresh() {
  const plist = await fetchPlayers({ page_size: 200 })
  if (plist) players.value = plist
  const list = await fetchSelectionScores()
  if (!list) return // 后端不可用：保留当前数据
  allRows.value = list.map((s: ApiSelectionScore) => ({
    id: s.id,
    playerId: s.player,
    name: s.player_name,
    team: s.player_team || '—',
    group: s.group_type_display,
    skill: s.technical,
    physical: s.physical,
    total: s.total,
    status: SELECTION_STAGE_DISPLAY[s.status] ?? s.status,
  }))
  applyFilter()
}

onMounted(refresh)

function onSearch(f: Record<string, string>) {
  filters.value = f
  applyFilter()
}

async function onSubmit(data: Record<string, string>) {
  const player = playerByOption.value.get(data.player ?? '')
  if (!player) {
    alert('请选择球员')
    return
  }
  const skill = Number(data.skill)
  const physical = Number(data.physical)
  if (Number.isNaN(skill) || Number.isNaN(physical) || skill < 0 || physical < 0) {
    alert('请填写有效的技评/体能得分（≥0）')
    return
  }
  // 组别随球员自动带出（与球队组别一致）
  const groupApi = GROUP_TO_API[player.group_type_display] ?? 'primary'
  try {
    if (editingId.value !== null) {
      await updateSelectionScore(editingId.value, {
        player: player.id,
        group_type: groupApi,
        technical: skill,
        physical,
      })
      editingId.value = null
      formInitial.value = {}
    } else {
      await createSelectionScore({ player: player.id, group_type: groupApi, technical: skill, physical })
    }
    formKey.value++
    await refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

async function setStatus(row: ScoreRow, status: string, confirmText: string) {
  if (!confirm(confirmText)) return
  try {
    await updateSelectionScore(row.id, { status })
    await refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onAction(action: string, row: Record<string, unknown>) {
  const r = row as unknown as ScoreRow
  if (action === '修改') {
    editingId.value = r.id
    const idx = players.value.findIndex((p) => p.id === r.playerId)
    formInitial.value = {
      player: idx >= 0 ? (playerOptions.value[idx] ?? '') : `${r.name}（${r.group}）`,
      skill: String(r.skill),
      physical: String(r.physical),
    }
    formKey.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  if (action === '通过') {
    if (r.status !== '初选评分') {
      alert(`该球员状态为「${r.status}」，无需操作`)
      return
    }
    await setStatus(r, 'first_passed', `确认「${r.name}」初选通过，进入复选名单？`)
    return
  }
  if (action === '未通过') {
    if (r.status !== '初选评分') {
      alert(`该球员状态为「${r.status}」，无需操作`)
      return
    }
    await setStatus(r, 'rejected', `确认「${r.name}」初选未通过？`)
    return
  }
  if (action === '删除') {
    if (!confirm(`确认删除「${r.name}」的遴选评分？`)) return
    try {
      await deleteSelectionScore(r.id)
      if (editingId.value === r.id) {
        editingId.value = null
        formInitial.value = {}
      }
      await refresh()
    } catch (err) {
      alert(errMsg(err))
    }
  }
}
</script>

<template>
  <PageHeader title="遴选初选" desc="录入球员技评/体能评分，初选通过后进入复选名单（总分自动合计）" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <h3 v-if="editingId" class="section-title">修改评分</h3>
  <h3 v-else class="section-title">录入评分</h3>
  <DataForm :key="formKey" :fields="formFields" :submit-text="editingId ? '保存修改' : '录入评分'" :initial="formInitial" @submit="onSubmit" />

  <h3 class="section-title">初选评分（{{ rows.length }}）</h3>
  <DataTable
    :columns="columns"
    :rows="rows"
    :actions="['通过', '未通过', '修改', '删除']"
    @action="onAction"
  />
</template>
