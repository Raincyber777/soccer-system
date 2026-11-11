import { ApiError } from '../error'
import type {
  Player,
  PlayerApi,
  PlayerDetail,
  PlayerMatchRecord,
  PlayerQuery,
  PlayerSeasonStats,
  PlayerTournamentStats,
} from '../types'
import { readTeams } from './team'
import { readMatchEvents } from './matchEvent'
import { requireSession } from './session'

// 球员 mock 服务：球员基础档案 + 比赛明细，全量统计由明细聚合得出
// 球员公示状态可在管理端切换，数据落在 localStorage

const ROSTER: Player[] = [
  {
    id: 'p-001',
    name: '王小磊',
    idCard: '5101**********0011',
    teamId: 'team-001',
    team: '成都市实验中学足球队',
    school: '成都市实验中学',
    city: '成都市',
    group: '中学组',
    jerseyNo: 9,
    position: '前锋',
    birthDate: '2009-03-12',
    height: 176,
    weight: 64,
    status: '已公示',
    account: 'student001',
  },
  {
    id: 'p-002',
    name: '李泽宇',
    idCard: '5101**********0022',
    teamId: 'team-001',
    team: '成都市实验中学足球队',
    school: '成都市实验中学',
    city: '成都市',
    group: '中学组',
    jerseyNo: 8,
    position: '中场',
    birthDate: '2009-06-25',
    height: 172,
    weight: 61,
    status: '已公示',
  },
  {
    id: 'p-003',
    name: '陈昊',
    idCard: '5101**********0033',
    teamId: 'team-001',
    team: '成都市实验中学足球队',
    school: '成都市实验中学',
    city: '成都市',
    group: '中学组',
    jerseyNo: 4,
    position: '后卫',
    birthDate: '2009-01-08',
    height: 180,
    weight: 70,
    status: '待审核',
  },
  {
    id: 'p-004',
    name: '赵一鸣',
    idCard: '5101**********0044',
    teamId: 'team-001',
    team: '成都市实验中学足球队',
    school: '成都市实验中学',
    city: '成都市',
    group: '中学组',
    jerseyNo: 1,
    position: '门将',
    birthDate: '2009-08-19',
    height: 183,
    weight: 75,
    status: '已公示',
  },
  {
    id: 'p-005',
    name: '孙浩然',
    idCard: '5101**********0055',
    teamId: 'team-001',
    team: '成都市实验中学足球队',
    school: '成都市实验中学',
    city: '成都市',
    group: '中学组',
    jerseyNo: 6,
    position: '中场',
    birthDate: '2010-02-02',
    height: 170,
    weight: 58,
    status: '未公示',
  },
  {
    id: 'p-006',
    name: '张明轩',
    idCard: '5101**********0066',
    teamId: 'team-002',
    team: '成都七中球队',
    school: '成都七中',
    city: '成都市',
    group: '高中组',
    jerseyNo: 10,
    position: '前锋',
    birthDate: '2008-05-16',
    height: 178,
    weight: 66,
    status: '已公示',
  },
  {
    id: 'p-007',
    name: '刘宇',
    idCard: '5101**********0077',
    teamId: 'team-002',
    team: '成都七中球队',
    school: '成都七中',
    city: '成都市',
    group: '高中组',
    jerseyNo: 5,
    position: '后卫',
    birthDate: '2008-09-30',
    height: 182,
    weight: 72,
    status: '已公示',
  },
  {
    id: 'p-008',
    name: '林子涵',
    idCard: '5107**********0088',
    teamId: 'team-003',
    team: '第一实验小学队',
    school: '第一实验小学',
    city: '绵阳市',
    group: '小学组',
    jerseyNo: 7,
    position: '前锋',
    birthDate: '2014-11-05',
    height: 148,
    weight: 38,
    status: '待审核',
  },
  {
    id: 'p-009',
    name: '周子豪',
    idCard: '5101**********0099',
    teamId: 'team-004',
    team: '川师大队',
    school: '四川师范大学',
    city: '成都市',
    group: '高校组',
    jerseyNo: 10,
    position: '中场',
    birthDate: '2003-04-21',
    height: 175,
    weight: 68,
    status: '已公示',
  },
  {
    id: 'p-010',
    name: '吴俊杰',
    idCard: '5101**********0100',
    teamId: 'team-004',
    team: '川师大队',
    school: '四川师范大学',
    city: '成都市',
    group: '高校组',
    jerseyNo: 1,
    position: '门将',
    birthDate: '2003-07-09',
    height: 187,
    weight: 80,
    status: '已公示',
  },
]

const SEASON_A = '2026 省青少年校园足球联赛（秋季）'
const SEASON_B = '2026 成都市校园足球联赛'
const SEASON_C = '2026 省青少年足球冠军杯'

const RECORDS: PlayerMatchRecord[] = [
  // 王小磊：省秋季联赛 3 场 + 市联赛 2 场
  { id: 'm-101', date: '2026-10-18', tournamentName: SEASON_A, opponent: '绵阳南山中学', score: '2:1', result: '胜', starts: true, minutes: 90, goals: 1, assists: 0, yellowCards: 0, redCards: 0, rating: 7.4 },
  { id: 'm-102', date: '2026-10-12', tournamentName: SEASON_A, opponent: '成都七中球队', score: '1:1', result: '平', starts: true, minutes: 90, goals: 1, assists: 0, yellowCards: 0, redCards: 0, rating: 7.1 },
  { id: 'm-103', date: '2026-10-05', tournamentName: SEASON_A, opponent: '自贡一中', score: '3:0', result: '胜', starts: true, minutes: 78, goals: 2, assists: 1, yellowCards: 0, redCards: 0, rating: 8.5 },
  { id: 'm-104', date: '2026-09-27', tournamentName: SEASON_B, opponent: '师大附中队', score: '0:2', result: '负', starts: true, minutes: 90, goals: 0, assists: 0, yellowCards: 1, redCards: 0, rating: 6.2 },
  { id: 'm-105', date: '2026-09-20', tournamentName: SEASON_B, opponent: '成都列五中学', score: '4:2', result: '胜', starts: false, minutes: 55, goals: 2, assists: 0, yellowCards: 0, redCards: 0, rating: 7.9 },
  { id: 'm-106', date: '2026-11-08', tournamentName: SEASON_A, opponent: '师大附中', score: '2:0', result: '胜', starts: true, minutes: 90, goals: 1, assists: 0, yellowCards: 0, redCards: 0, rating: 7.6 },
  { id: 'm-107', date: '2026-11-03', tournamentName: SEASON_A, opponent: '市二中', score: '1:1', result: '平', starts: true, minutes: 90, goals: 1, assists: 1, yellowCards: 1, redCards: 0, rating: 7.2 },

  // 李泽宇：省秋季联赛 3 场
  { id: 'm-201', date: '2026-10-18', tournamentName: SEASON_A, opponent: '绵阳南山中学', score: '2:1', result: '胜', starts: true, minutes: 90, goals: 0, assists: 1, yellowCards: 0, redCards: 0, rating: 7.2 },
  { id: 'm-202', date: '2026-10-12', tournamentName: SEASON_A, opponent: '成都七中球队', score: '1:1', result: '平', starts: true, minutes: 86, goals: 0, assists: 0, yellowCards: 0, redCards: 0, rating: 6.8 },
  { id: 'm-203', date: '2026-10-05', tournamentName: SEASON_A, opponent: '自贡一中', score: '3:0', result: '胜', starts: true, minutes: 90, goals: 1, assists: 2, yellowCards: 0, redCards: 0, rating: 8.2 },
  { id: 'm-204', date: '2026-11-08', tournamentName: SEASON_A, opponent: '师大附中', score: '2:0', result: '胜', starts: true, minutes: 88, goals: 0, assists: 1, yellowCards: 0, redCards: 0, rating: 7.0 },

  // 陈昊：省秋季联赛 3 场 + 市联赛 1 场
  { id: 'm-301', date: '2026-10-18', tournamentName: SEASON_A, opponent: '绵阳南山中学', score: '2:1', result: '胜', starts: true, minutes: 90, goals: 0, assists: 0, yellowCards: 1, redCards: 0, rating: 6.9 },
  { id: 'm-302', date: '2026-10-12', tournamentName: SEASON_A, opponent: '成都七中球队', score: '1:1', result: '平', starts: true, minutes: 90, goals: 0, assists: 0, yellowCards: 0, redCards: 0, rating: 7.0 },
  { id: 'm-303', date: '2026-10-05', tournamentName: SEASON_A, opponent: '自贡一中', score: '3:0', result: '胜', starts: true, minutes: 90, goals: 0, assists: 1, yellowCards: 0, redCards: 0, rating: 7.3 },
  { id: 'm-304', date: '2026-09-27', tournamentName: SEASON_B, opponent: '师大附中队', score: '0:2', result: '负', starts: true, minutes: 90, goals: 0, assists: 0, yellowCards: 0, redCards: 0, rating: 6.4 },
  { id: 'm-305', date: '2026-11-08', tournamentName: SEASON_A, opponent: '师大附中', score: '2:0', result: '胜', starts: true, minutes: 90, goals: 0, assists: 0, yellowCards: 1, redCards: 0, rating: 6.8 },

  // 赵一鸣（门将）：省秋季联赛 3 场
  { id: 'm-401', date: '2026-10-18', tournamentName: SEASON_A, opponent: '绵阳南山中学', score: '2:1', result: '胜', starts: true, minutes: 90, goals: 0, assists: 0, yellowCards: 0, redCards: 0, rating: 7.5 },
  { id: 'm-402', date: '2026-10-12', tournamentName: SEASON_A, opponent: '成都七中球队', score: '1:1', result: '平', starts: true, minutes: 90, goals: 0, assists: 0, yellowCards: 0, redCards: 0, rating: 7.6 },
  { id: 'm-403', date: '2026-10-05', tournamentName: SEASON_A, opponent: '自贡一中', score: '3:0', result: '胜', starts: true, minutes: 90, goals: 0, assists: 0, yellowCards: 0, redCards: 0, rating: 8.0 },

  // 孙浩然：市联赛 2 场
  { id: 'm-501', date: '2026-09-27', tournamentName: SEASON_B, opponent: '师大附中队', score: '0:2', result: '负', starts: false, minutes: 32, goals: 0, assists: 0, yellowCards: 1, redCards: 0, rating: 5.8 },
  { id: 'm-502', date: '2026-09-20', tournamentName: SEASON_B, opponent: '成都列五中学', score: '4:2', result: '胜', starts: true, minutes: 70, goals: 0, assists: 1, yellowCards: 0, redCards: 0, rating: 7.0 },

  // 张明轩（成都七中）：省秋季联赛 2 场 + 冠军杯 1 场
  { id: 'm-601', date: '2026-10-12', tournamentName: SEASON_A, opponent: '成都市实验中学足球队', score: '1:1', result: '平', starts: true, minutes: 90, goals: 1, assists: 0, yellowCards: 0, redCards: 0, rating: 7.5 },
  { id: 'm-602', date: '2026-09-28', tournamentName: SEASON_A, opponent: '达州一中', score: '2:0', result: '胜', starts: true, minutes: 85, goals: 2, assists: 0, yellowCards: 0, redCards: 0, rating: 8.1 },
  { id: 'm-603', date: '2026-09-14', tournamentName: SEASON_C, opponent: '宜宾六中', score: '3:1', result: '胜', starts: true, minutes: 90, goals: 1, assists: 1, yellowCards: 1, redCards: 0, rating: 7.8 },

  // 刘宇（成都七中）：省秋季联赛 2 场
  { id: 'm-701', date: '2026-10-12', tournamentName: SEASON_A, opponent: '成都市实验中学足球队', score: '1:1', result: '平', starts: true, minutes: 90, goals: 0, assists: 0, yellowCards: 1, redCards: 0, rating: 6.6 },
  { id: 'm-702', date: '2026-09-28', tournamentName: SEASON_A, opponent: '达州一中', score: '2:0', result: '胜', starts: true, minutes: 90, goals: 0, assists: 0, yellowCards: 0, redCards: 0, rating: 7.2 },

  // 林子涵（第一实验小学）：市联赛 1 场
  { id: 'm-801', date: '2026-10-06', tournamentName: SEASON_B, opponent: '绵阳实验小学', score: '2:2', result: '平', starts: true, minutes: 60, goals: 1, assists: 0, yellowCards: 0, redCards: 0, rating: 7.0 },

  // 周子豪（川师大）：冠军杯 2 场
  { id: 'm-901', date: '2026-09-14', tournamentName: SEASON_C, opponent: '西南科技大学', score: '1:0', result: '胜', starts: true, minutes: 90, goals: 0, assists: 1, yellowCards: 0, redCards: 0, rating: 7.3 },
  { id: 'm-902', date: '2026-09-07', tournamentName: SEASON_C, opponent: '成都体育学院', score: '0:3', result: '负', starts: true, minutes: 78, goals: 0, assists: 0, yellowCards: 0, redCards: 0, rating: 6.1 },

  // 吴俊杰（川师大，门将）：冠军杯 2 场
  { id: 'm-1101', date: '2026-09-14', tournamentName: SEASON_C, opponent: '西南科技大学', score: '1:0', result: '胜', starts: true, minutes: 90, goals: 0, assists: 0, yellowCards: 0, redCards: 0, rating: 7.4 },
  { id: 'm-1102', date: '2026-09-07', tournamentName: SEASON_C, opponent: '成都体育学院', score: '0:3', result: '负', starts: true, minutes: 90, goals: 0, assists: 0, yellowCards: 0, redCards: 0, rating: 6.0 },
]

const ID_TO_PLAYER_RECORDS: Record<string, PlayerMatchRecord[]> = {
  'p-001': RECORDS.filter((r) => r.id.startsWith('m-1')),
  'p-002': RECORDS.filter((r) => r.id.startsWith('m-2')),
  'p-003': RECORDS.filter((r) => r.id.startsWith('m-3')),
  'p-004': RECORDS.filter((r) => r.id.startsWith('m-4')),
  'p-005': RECORDS.filter((r) => r.id.startsWith('m-5')),
  'p-006': RECORDS.filter((r) => r.id.startsWith('m-6')),
  'p-007': RECORDS.filter((r) => r.id.startsWith('m-7')),
  'p-008': RECORDS.filter((r) => r.id.startsWith('m-8')),
  'p-009': RECORDS.filter((r) => r.id.startsWith('m-9')),
  'p-010': RECORDS.filter((r) => r.id.startsWith('m-11')),
}

const STORAGE_KEY = 'soccer-players'

function delay(ms = 280) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function load(): Player[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      save(ROSTER)
      return ROSTER.map((p) => ({ ...p }))
    }
    const parsed = JSON.parse(raw) as Player[]
    return migrate(Array.isArray(parsed) ? parsed : ROSTER)
  } catch {
    return ROSTER.map((p) => ({ ...p }))
  }
}

/** 旧数据补齐账号绑定：仅在账号尚未绑定任何球员时恢复种子绑定，避免覆盖实名结果 */
function migrate(list: Player[]): Player[] {
  const bound = new Set(list.map((p) => p.account).filter(Boolean) as string[])
  return list.map((player) => {
    const seed = ROSTER.find((item) => item.id === player.id)
    if (seed?.account && !player.account && !bound.has(seed.account)) {
      bound.add(seed.account)
      return { ...player, account: seed.account }
    }
    return player
  })
}

function save(list: Player[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // 隐私模式写入失败时保持内存数据可用
  }
}

function clone(p: Player): Player {
  return { ...p }
}

/** 汇总数据等只读场景使用：读取全部球员 */
export function readPlayers(): Player[] {
  return load()
}

/** AI 报告等只读场景使用：读取单个球员的比赛明细 */
export function readPlayerRecords(id: string): PlayerMatchRecord[] {
  return (ID_TO_PLAYER_RECORDS[id] ?? []).map((r) => ({ ...r }))
}

/** 实名审核通过后绑定唯一账号：先解除该账号原有绑定，再写入目标球员 */
export function bindPlayerAccount(playerId: string, account: string): Player | null {
  const list = load()
  const index = list.findIndex((p) => p.id === playerId)
  if (index < 0) return null
  for (const player of list) {
    if (player.account === account) delete player.account
  }
  const target = list[index]
  if (!target) return null
  target.account = account
  save(list)
  return clone(target)
}

/** 当前账号对应的球员：实名绑定优先，其次球队队长，最后取球队首名球员 */
function currentPlayer(): Player | null {
  const session = requireSession()
  const list = load()
  const byAccount = list.find((p) => p.account === session.account)
  if (byAccount) return byAccount
  const team = readTeams().find((t) => t.ownerAccount === session.account)
  if (!team) return null
  return (
    list.find((p) => p.teamId === team.id && p.name === team.captain) ??
    list.find((p) => p.teamId === team.id) ??
    null
  )
}

/** 补录事件按「赛事 + 对手」与比赛明细对齐：同一场取较大值，避免与明细重复计数 */
function eventDeltas(playerId: string, records: PlayerMatchRecord[]) {
  const grouped = new Map<string, { tournamentName: string; goals: number; assists: number }>()
  for (const event of readMatchEvents()) {
    if (event.playerId !== playerId) continue
    if (event.type !== '进球' && event.type !== '助攻') continue
    const opponent = event.home === event.team ? event.away : event.home
    const key = `${event.tournamentName}|${opponent}`
    const acc = grouped.get(key) ?? { tournamentName: event.tournamentName, goals: 0, assists: 0 }
    if (event.type === '进球') acc.goals += 1
    else acc.assists += 1
    grouped.set(key, acc)
  }
  for (const [key, acc] of grouped) {
    const matched = records.find((r) => `${r.tournamentName}|${r.opponent}` === key)
    acc.goals = Math.max(0, acc.goals - (matched?.goals ?? 0))
    acc.assists = Math.max(0, acc.assists - (matched?.assists ?? 0))
  }
  return [...grouped.values()]
}

function deltaTotals(deltas: { goals: number; assists: number }[]) {
  return deltas.reduce(
    (sum, d) => ({ goals: sum.goals + d.goals, assists: sum.assists + d.assists }),
    { goals: 0, assists: 0 },
  )
}

export interface PlayerSeasonTotals {
  player: Player
  matches: number
  goals: number
  assists: number
  avgRating: number
}

/** 门户射手榜与 AI 报告共用：球员赛季统计 = 比赛明细 + 补录事件增量 */
export function readPlayerTotals(): PlayerSeasonTotals[] {
  return load().map((player) => {
    const records = ID_TO_PLAYER_RECORDS[player.id] ?? []
    const extra = deltaTotals(eventDeltas(player.id, records))
    return {
      player: clone(player),
      matches: records.length,
      goals: records.reduce((sum, r) => sum + r.goals, 0) + extra.goals,
      assists: records.reduce((sum, r) => sum + r.assists, 0) + extra.assists,
      avgRating: records.length
        ? round(records.reduce((sum, r) => sum + r.rating, 0) / records.length, 1)
        : 0,
    }
  })
}

function round(n: number, digits = 2) {
  const base = 10 ** digits
  return Math.round(n * base) / base
}

function seasonStats(
  records: PlayerMatchRecord[],
  extra: { goals: number; assists: number } = { goals: 0, assists: 0 },
): PlayerSeasonStats {
  const matches = records.length
  if (!matches) {
    return {
      matches: 0,
      starts: 0,
      minutes: 0,
      goals: extra.goals,
      assists: extra.assists,
      yellowCards: 0,
      redCards: 0,
      avgRating: 0,
      goalsPerMatch: 0,
      winRate: 0,
    }
  }
  const goals = records.reduce((sum, r) => sum + r.goals, 0) + extra.goals
  const assists = records.reduce((sum, r) => sum + r.assists, 0) + extra.assists
  const wins = records.filter((r) => r.result === '胜').length
  return {
    matches,
    starts: records.filter((r) => r.starts).length,
    minutes: records.reduce((sum, r) => sum + r.minutes, 0),
    goals,
    assists,
    yellowCards: records.reduce((sum, r) => sum + r.yellowCards, 0),
    redCards: records.reduce((sum, r) => sum + r.redCards, 0),
    avgRating: round(records.reduce((sum, r) => sum + r.rating, 0) / matches, 1),
    goalsPerMatch: round(goals / matches, 2),
    winRate: round((wins / matches) * 100, 1),
  }
}

function tournamentStats(
  records: PlayerMatchRecord[],
  deltas: { tournamentName: string; goals: number; assists: number }[],
): PlayerTournamentStats[] {
  const grouped = new Map<string, PlayerMatchRecord[]>()
  for (const record of records) {
    const list = grouped.get(record.tournamentName) ?? []
    list.push(record)
    grouped.set(record.tournamentName, list)
  }
  const result = [...grouped.entries()].map(([tournamentName, list]) => {
    const extra = deltas.find((d) => d.tournamentName === tournamentName)
    return {
      tournamentName,
      matches: list.length,
      goals: list.reduce((sum, r) => sum + r.goals, 0) + (extra?.goals ?? 0),
      assists: list.reduce((sum, r) => sum + r.assists, 0) + (extra?.assists ?? 0),
      minutes: list.reduce((sum, r) => sum + r.minutes, 0),
      avgRating: round(list.reduce((sum, r) => sum + r.rating, 0) / list.length, 1),
    }
  })
  // 只有补录事件、尚无比赛明细的赛事也纳入统计
  for (const extra of deltas) {
    if (grouped.has(extra.tournamentName)) continue
    result.push({
      tournamentName: extra.tournamentName,
      matches: 0,
      goals: extra.goals,
      assists: extra.assists,
      minutes: 0,
      avgRating: 0,
    })
  }
  return result
}

function matchesQuery(p: Player, query: PlayerQuery) {
  if (query.team && p.team !== query.team) return false
  if (query.city && p.city !== query.city) return false
  if (query.group && p.group !== query.group) return false
  if (query.status && p.status !== query.status) return false
  if (query.keyword) {
    const key = query.keyword.trim().toLowerCase()
    if (
      !p.name.toLowerCase().includes(key) &&
      !p.idCard.toLowerCase().includes(key) &&
      !p.team.toLowerCase().includes(key)
    ) {
      return false
    }
  }
  return true
}

export const mockPlayerApi: PlayerApi = {
  async list(query: PlayerQuery = {}) {
    await delay()
    return load()
      .filter((p) => matchesQuery(p, query))
      .sort((a, b) => a.team.localeCompare(b.team) || a.jerseyNo - b.jerseyNo)
      .map(clone)
  },

  async getDetail(id: string) {
    await delay()
    const player = load().find((p) => p.id === id)
    if (!player) throw new ApiError(6201, '球员不存在或已被删除')

    const records = (ID_TO_PLAYER_RECORDS[player.id] ?? [])
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
    const deltas = eventDeltas(player.id, records)
    const team = readTeams().find((t) => t.id === player.teamId) ?? null

    const detail: PlayerDetail = {
      player: clone(player),
      team: team ? { ...team } : null,
      season: seasonStats(records, deltaTotals(deltas)),
      tournaments: tournamentStats(records, deltas),
      matches: records.map((r) => ({ ...r })),
    }
    return detail
  },

  async setPublic(id: string, publicized: boolean) {
    await delay()
    const list = load()
    const index = list.findIndex((p) => p.id === id)
    const current = list[index]
    if (index < 0 || !current) throw new ApiError(6201, '球员不存在或已被删除')
    const updated: Player = { ...current, status: publicized ? '已公示' : '未公示' }
    list[index] = updated
    save(list)
    return clone(updated)
  },

  async myRecords() {
    await delay()
    const player = currentPlayer()
    if (!player) return []
    return (ID_TO_PLAYER_RECORDS[player.id] ?? [])
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((record) => ({ ...record }))
  },
}
