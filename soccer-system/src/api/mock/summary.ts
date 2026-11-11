import type { DataSummary, SummaryApi, SummaryRow, TournamentLevel } from '../types'
import { readTeams } from './team'
import { readPlayers } from './player'
import { readRegistrations } from './registration'
import { readTournaments } from './tournament'

// 汇总数据 mock 服务：按市州 / 组别聚合球队、球员与报名情况
// 全部数据来自各 mock 数据源，管理员端与用户端的操作会实时体现在汇总结果里

const LEVEL_LABEL: Record<TournamentLevel, string> = {
  school: '校级比赛',
  city: '市级比赛',
  province: '省级比赛',
}

function delay(ms = 280) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function nowText() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function round(n: number, digits = 1) {
  const base = 10 ** digits
  return Math.round(n * base) / base
}

interface Bucket {
  teams: number
  players: number
  registrations: number
  approved: number
  pending: number
  rejected: number
}

function emptyBucket(): Bucket {
  return { teams: 0, players: 0, registrations: 0, approved: 0, pending: 0, rejected: 0 }
}

function aggregate(keyOf: (value: { city: string; group: string }) => string) {
  const teams = readTeams()
  const players = readPlayers()
  const registrations = readRegistrations()

  const buckets = new Map<string, Bucket>()
  const bucketOf = (key: string) => {
    const bucket = buckets.get(key) ?? emptyBucket()
    buckets.set(key, bucket)
    return bucket
  }

  for (const team of teams) bucketOf(keyOf(team)).teams += 1
  for (const player of players) bucketOf(keyOf(player)).players += 1
  for (const registration of registrations) {
    const bucket = bucketOf(keyOf(registration))
    bucket.registrations += 1
    if (registration.status === '已通过') bucket.approved += 1
    else if (registration.status === '已驳回') bucket.rejected += 1
    else bucket.pending += 1
  }

  const rows: SummaryRow[] = [...buckets.entries()].map(([key, bucket]) => ({
    key,
    ...bucket,
    approvalRate: bucket.registrations ? round((bucket.approved / bucket.registrations) * 100) : 0,
  }))
  rows.sort((a, b) => b.registrations - a.registrations || b.teams - a.teams)
  return rows
}

export const mockSummaryApi: SummaryApi = {
  async summary(): Promise<DataSummary> {
    await delay()
    const teams = readTeams()
    const players = readPlayers()
    const registrations = readRegistrations()
    const tournaments = readTournaments()

    const approvedTotal = registrations.filter((r) => r.status === '已通过').length
    const rejectedTotal = registrations.filter((r) => r.status === '已驳回').length
    const pendingTotal = registrations.length - approvedTotal - rejectedTotal

    const levels: TournamentLevel[] = ['province', 'city', 'school']

    return {
      teamTotal: teams.length,
      playerTotal: players.length,
      registrationTotal: registrations.length,
      approvedTotal,
      pendingTotal,
      rejectedTotal,
      approvalRate: registrations.length ? round((approvedTotal / registrations.length) * 100) : 0,
      byCity: aggregate((v) => v.city || '未填写'),
      byGroup: aggregate((v) => v.group || '未填写'),
      tournamentLevels: levels.map((level) => ({
        level,
        label: LEVEL_LABEL[level],
        total: tournaments.filter((t) => t.level === level).length,
        open: tournaments.filter((t) => t.level === level && t.status === '报名中').length,
      })),
      generatedAt: nowText(),
    }
  },
}
