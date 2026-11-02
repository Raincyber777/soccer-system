<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'
import { SICHUAN_CITY_OPTIONS } from '../../data/sichuan-schools'
import { fetchAdminMatches } from '../../api/manage'
import type { ApiMatch } from '../../api/types'
import { fetchCoaches, fetchPlayers, fetchTeams, type ApiTeam } from '../../api/team'
import { fetchSelectionScores, selectionStageDisplay, type ApiSelectionScore } from '../../api/selection'

// 参赛管理：全省球队检索、查看成员/教练/比赛记录、球员遴选档案（名单×评分 join）。
// 球队/球员/教练公开可读，评分需登录读取；失败时展示空态。

const teamSearch: SearchField[] = [
  { key: 'team', label: '球队名称', placeholder: '输入球队名称' },
  { key: 'city', label: '市州', type: 'select', options: SICHUAN_CITY_OPTIONS },
  { key: 'group', label: '赛事类别', type: 'select', options: ['小学组', '中学组', '高中组', '高校组'] },
]

const teamColumns: TableColumn[] = [
  { key: 'team', label: '球队名称' },
  { key: 'city', label: '市州', width: '100px' },
  { key: 'school', label: '所属学校', width: '150px' },
  { key: 'group', label: '组别', width: '90px' },
]

interface TeamRow {
  id: number
  team: string
  city: string
  school: string
  group: string
}

const teams = ref<TeamRow[]>([])

const teamFilters = ref<Record<string, string>>({})
const displayTeams = computed(() =>
  teams.value.filter((t) => {
    if (teamFilters.value.team && !t.team.includes(teamFilters.value.team.trim())) return false
    if (teamFilters.value.city && t.city !== teamFilters.value.city) return false
    if (teamFilters.value.group && t.group !== teamFilters.value.group) return false
    return true
  }),
)

const archiveSearch: SearchField[] = [
  { key: 'idCard', label: '身份证号', placeholder: '按身份证号搜索档案' },
  { key: 'team', label: '队伍', placeholder: '按队伍搜索档案' },
]

const archiveColumns: TableColumn[] = [
  { key: 'name', label: '球员', width: '100px' },
  { key: 'team', label: '队伍' },
  { key: 'updated', label: '档案更新时间', width: '160px' },
  { key: 'status', label: '状态', width: '100px' },
]

interface ArchiveRow {
  playerId: number
  name: string
  team: string
  idCard: string
  updated: string
  status: string
  score: ApiSelectionScore | null
}

const archives = ref<ArchiveRow[]>([])

const archiveFilters = ref<Record<string, string>>({})
const displayArchives = computed(() =>
  archives.value.filter((a) => {
    const kw = archiveFilters.value.idCard?.trim() ?? ''
    if (kw && !a.idCard.includes(kw)) return false
    if (archiveFilters.value.team && !a.team.includes(archiveFilters.value.team.trim())) return false
    return true
  }),
)

async function refresh() {
  const [teamList, matchList, playerList, scoreList] = await Promise.all([
    fetchTeams(),
    fetchAdminMatches(),
    fetchPlayers({ page_size: 100 }),
    fetchSelectionScores(),
  ])
  if (teamList) {
    teams.value = teamList.map((t: ApiTeam) => ({
      id: t.id,
      team: t.name,
      city: t.city_name || '—',
      school: t.school_name || '—',
      group: t.group_type_display || '—',
    }))
  }
  if (playerList) {
    const scoreByPlayer = new Map<number, ApiSelectionScore>()
    ;(scoreList ?? []).forEach((s) => scoreByPlayer.set(s.player, s))
    archives.value = playerList.map((p) => {
      const score = scoreByPlayer.get(p.id) ?? null
      return {
        playerId: p.id,
        name: p.name,
        team: p.team_name,
        idCard: p.id_card,
        updated: score ? (score.created_at || '').slice(0, 16).replace('T', ' ') : '—',
        status: score ? selectionStageDisplay(score.status) : '未评分',
        score,
      }
    })
  }
}

onMounted(refresh)

function onTeamSearch(filters: Record<string, string>) {
  teamFilters.value = filters
}

function onArchiveSearch(filters: Record<string, string>) {
  archiveFilters.value = filters
}

async function onViewMembers(row: TeamRow) {
  const players = await fetchPlayers({ team: row.id })
  if (!players) {
    alert('获取球员名单失败，请确认后端服务可用')
    return
  }
  const list = players.map((p) => `${p.name}（${p.position || '位置未填'} · ${p.status_display}）`)
  alert(`「${row.team}」注册球员 ${players.length} 人${list.length ? '\n' + list.join('\n') : ''}`)
}

async function onViewCoaches(row: TeamRow) {
  const coaches = await fetchCoaches({ team: row.id })
  if (!coaches) {
    alert('获取教练名单失败，请确认后端服务可用')
    return
  }
  const list = coaches.map((c) => `${c.name}（${c.cert_level || '教练'}）`)
  alert(`「${row.team}」教练 ${coaches.length} 人${list.length ? '\n' + list.join('\n') : ''}`)
}

async function onActionTeam(action: string, row: Record<string, unknown>) {
  const r = row as unknown as TeamRow
  if (action === '查看成员') await onViewMembers(r)
  else if (action === '查看教练') await onViewCoaches(r)
  else if (action === '查看比赛记录') await showMatchRecord(r)
}

function onActionArchive(action: string, row: Record<string, unknown>) {
  if (action !== '查看档案') return
  const r = row as unknown as ArchiveRow
  const s = r.score
  alert(
    s
      ? `${r.name}（${r.team}）\n技术评分：${s.technical}｜体能评分：${s.physical}\n总分：${s.total}｜阶段：${selectionStageDisplay(s.status)}`
      : `${r.name}（${r.team}）暂无遴选评分记录`,
  )
}

// 比赛记录按需查询（含对阵与比分）
async function showMatchRecord(row: TeamRow) {
  const matchList = (await fetchAdminMatches()) ?? []
  const mine = matchList.filter((m: ApiMatch) => m.home_team_name === row.team || m.away_team_name === row.team)
  const lines = mine.map((m) => {
    const r = m.result
    const score = r ? `，比分 ${r.home_score}:${r.away_score}` : ''
    return `${m.group_type_display} ${m.round_name}：${m.home_team_name} vs ${m.away_team_name}（${m.status_display}${score}）`
  })
  alert(`「${row.team}」共 ${mine.length} 场比赛${lines.length ? '\n' + lines.join('\n') : ''}`)
}
</script>

<template>
  <PageHeader title="参赛管理" desc="查看与管理参赛球队、成员、教练及比赛记录，维护球员遴选档案" />

  <h3 class="section-title">球队信息</h3>
  <SearchBar :fields="teamSearch" @search="onTeamSearch" @reset="onTeamSearch" />
  <DataTable
    :columns="teamColumns"
    :rows="displayTeams"
    :actions="['查看成员', '查看教练', '查看比赛记录']"
    @action="onActionTeam"
  />

  <h3 class="section-title">球员遴选档案</h3>
  <SearchBar :fields="archiveSearch" @search="onArchiveSearch" @reset="onArchiveSearch" />
  <DataTable :columns="archiveColumns" :rows="displayArchives" :actions="['查看档案']" @action="onActionArchive" />
</template>
