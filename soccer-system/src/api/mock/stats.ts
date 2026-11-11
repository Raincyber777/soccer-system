import type {
  DataScopeLevel,
  StatMatchRow,
  StatOptions,
  StatPlayerRow,
  StatQuery,
  StatRange,
  StatResult,
  StatTotals,
  StatsApi,
} from '../types'
import { readPlayers, readPlayerRecords } from './player'
import { readTeams } from './team'
import { requireSession } from './session'

// 数据统计 mock：按行政范围（省/市/区/校）+ 时间 + 球队 + 比赛维度聚合
// 数据源为球员比赛明细，汇总值全部实时计算，避免与球员档案不一致

const RANGE_DAYS: Record<Exclude<StatRange, 'all'>, number> = { week: 7, month: 30 }
const RANGE_LABEL: Record<StatRange, string> = { all: '全部时间', week: '最近一周', month: '最近一个月' }

function delay(ms = 260) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function nowText() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function cutoffOf(range: StatRange) {
  if (range === 'all') return ''
  const date = new Date()
  date.setDate(date.getDate() - RANGE_DAYS[range])
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function scopeLabel(scope: DataScopeLevel, query: StatQuery, schoolName: string) {
  if (scope === 'city') return `${query.city || '本市'} · 市级`
  if (scope === 'district') return `${query.city ? `${query.city} · ` : ''}${query.district || '本区县'} · 区县级`
  if (scope === 'school') return `${schoolName || '本校'} · 校级`
  return '全省数据'
}

function emptyTotals(): StatTotals {
  return { matches: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 }
}

/** 校级账号强制限定本校，不信任前端传入的范围 */
function resolveQuery(query: StatQuery) {
  const session = requireSession()
  if (session.role === 'school') {
    return {
      ...query,
      scope: 'school' as DataScopeLevel,
      city: '',
      district: '',
      schoolCode: session.schoolCode ?? '',
    }
  }
  return query
}

export const mockStatsApi: StatsApi = {
  async options(): Promise<StatOptions> {
    await delay()
    const teams = readTeams()
    const players = readPlayers()
    const schools = new Map<string, { code: string; name: string; city: string; district: string }>()
    for (const team of teams) {
      if (!schools.has(team.schoolCode)) {
        schools.set(team.schoolCode, {
          code: team.schoolCode,
          name: team.school,
          city: team.city,
          district: team.district ?? '',
        })
      }
    }
    const matches = new Set<string>()
    for (const player of players) {
      for (const record of readPlayerRecords(player.id)) matches.add(record.opponent)
    }
    return {
      cities: [...new Set(teams.map((team) => team.city).filter(Boolean))].sort(),
      districts: [...new Set(teams.map((team) => team.district ?? '').filter(Boolean))].sort(),
      schools: [...schools.values()].sort((a, b) => a.name.localeCompare(b.name)),
      teams: [...new Set([...teams.map((team) => team.name), ...players.map((player) => player.team)])].sort(),
      matches: [...matches].sort(),
    }
  },

  async query(rawQuery: StatQuery = {}): Promise<StatResult> {
    await delay()
    const query = resolveQuery(rawQuery)
    const scope: DataScopeLevel = query.scope ?? 'province'
    const range: StatRange = query.range ?? 'all'
    const cutoff = cutoffOf(range)

    const teams = readTeams()
    const teamById = new Map(teams.map((team) => [team.id, team]))
    const schoolName = teams.find((team) => team.schoolCode === query.schoolCode)?.school ?? ''

    const players = readPlayers().filter((player) => {
      const team = teamById.get(player.teamId)
      const city = team?.city ?? player.city
      const district = team?.district ?? ''
      const schoolCode = team?.schoolCode ?? ''
      if (scope === 'city' && query.city && city !== query.city) return false
      if (scope === 'district') {
        if (query.city && city !== query.city) return false
        if (query.district && district !== query.district) return false
      }
      if (scope === 'school' && query.schoolCode && schoolCode !== query.schoolCode) return false
      if (query.team && player.team !== query.team) return false
      return true
    })

    const totals = emptyTotals()
    const playerRows: StatPlayerRow[] = []
    const matchRows: StatMatchRow[] = []

    for (const player of players) {
      const records = readPlayerRecords(player.id).filter((record) => {
        if (cutoff && record.date < cutoff) return false
        if (query.match && record.opponent !== query.match) return false
        return true
      })
      if (!records.length) continue

      const row: StatPlayerRow = {
        playerId: player.id,
        name: player.name,
        team: player.team,
        school: player.school,
        city: player.city,
        matches: records.length,
        goals: records.reduce((sum, record) => sum + record.goals, 0),
        assists: records.reduce((sum, record) => sum + record.assists, 0),
        yellowCards: records.reduce((sum, record) => sum + record.yellowCards, 0),
        redCards: records.reduce((sum, record) => sum + record.redCards, 0),
      }
      playerRows.push(row)

      totals.matches += row.matches
      totals.goals += row.goals
      totals.assists += row.assists
      totals.yellowCards += row.yellowCards
      totals.redCards += row.redCards

      for (const record of records) {
        matchRows.push({
          id: record.id,
          date: record.date,
          opponent: record.opponent,
          score: record.score,
          result: record.result,
          playerId: player.id,
          playerName: player.name,
          team: player.team,
          goals: record.goals,
          assists: record.assists,
          yellowCards: record.yellowCards,
          redCards: record.redCards,
        })
      }
    }

    playerRows.sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name))
    matchRows.sort((a, b) => b.date.localeCompare(a.date) || a.playerName.localeCompare(b.playerName))

    return {
      totals,
      players: playerRows,
      matches: matchRows,
      scopeLabel: scopeLabel(scope, query, schoolName),
      rangeLabel: RANGE_LABEL[range],
      generatedAt: nowText(),
    }
  },
}
