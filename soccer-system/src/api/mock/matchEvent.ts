import { ApiError } from '../error'
import type { MatchEvent, MatchEventApi, MatchEventInput, MatchEventQuery } from '../types'

// 比赛事件补录 mock 服务：管理员录入进球、助攻、红黄牌与换人事件
// 事件落在 localStorage，门户 AI 报告与球员详情会读取这些补录数据

const STORAGE_KEY = 'soccer-match-events'

const SEED: MatchEvent[] = [
  {
    id: 'ev-001',
    tournamentId: 't-province-autumn-middle',
    tournamentName: '2026 省青少年校园足球联赛（秋季）',
    matchLabel: '中学组 第 1 轮',
    home: '成都市实验中学足球队',
    away: '绵阳南山中学',
    playerId: 'p-001',
    playerName: '王小磊',
    team: '成都市实验中学足球队',
    type: '进球',
    minute: 18,
    note: '禁区内右脚推射',
    createdBy: 'admin001',
    createdAt: '2026-10-18 20:10',
  },
  {
    id: 'ev-002',
    tournamentId: 't-province-autumn-middle',
    tournamentName: '2026 省青少年校园足球联赛（秋季）',
    matchLabel: '中学组 第 1 轮',
    home: '成都市实验中学足球队',
    away: '绵阳南山中学',
    playerId: 'p-002',
    playerName: '李泽宇',
    team: '成都市实验中学足球队',
    type: '助攻',
    minute: 18,
    note: '左路直塞助攻',
    createdBy: 'admin001',
    createdAt: '2026-10-18 20:12',
  },
  {
    id: 'ev-003',
    tournamentId: 't-province-autumn-middle',
    tournamentName: '2026 省青少年校园足球联赛（秋季）',
    matchLabel: '中学组 第 1 轮',
    home: '成都市实验中学足球队',
    away: '绵阳南山中学',
    playerId: 'p-003',
    playerName: '陈昊',
    team: '成都市实验中学足球队',
    type: '黄牌',
    minute: 34,
    note: '战术犯规',
    createdBy: 'admin001',
    createdAt: '2026-10-18 20:15',
  },
  {
    id: 'ev-004',
    tournamentId: 't-province-autumn-middle',
    tournamentName: '2026 省青少年校园足球联赛（秋季）',
    matchLabel: '中学组 第 2 轮',
    home: '成都市实验中学足球队',
    away: '自贡一中',
    playerId: 'p-002',
    playerName: '李泽宇',
    team: '成都市实验中学足球队',
    type: '进球',
    minute: 55,
    note: '远射破门',
    createdBy: 'admin001',
    createdAt: '2026-10-05 17:30',
  },
  {
    id: 'ev-005',
    tournamentId: 't-province-autumn-middle',
    tournamentName: '2026 省青少年校园足球联赛（秋季）',
    matchLabel: '中学组 第 2 轮',
    home: '成都市实验中学足球队',
    away: '自贡一中',
    playerId: 'p-001',
    playerName: '王小磊',
    team: '成都市实验中学足球队',
    type: '进球',
    minute: 71,
    note: '反击单刀',
    createdBy: 'admin001',
    createdAt: '2026-10-05 17:32',
  },
  {
    id: 'ev-006',
    tournamentId: 't-province-autumn-middle',
    tournamentName: '2026 省青少年校园足球联赛（秋季）',
    matchLabel: '中学组 第 3 轮',
    home: '成都市实验中学足球队',
    away: '成都七中球队',
    playerId: 'p-006',
    playerName: '张明轩',
    team: '成都七中球队',
    type: '进球',
    minute: 40,
    note: '点球',
    createdBy: 'admin001',
    createdAt: '2026-10-12 16:20',
  },
  {
    id: 'ev-007',
    tournamentId: 't-city-chengdu',
    tournamentName: '2026 成都市校园足球联赛',
    matchLabel: '中学组 第 2 轮',
    home: '成都市实验中学足球队',
    away: '师大附中队',
    playerId: 'p-005',
    playerName: '孙浩然',
    team: '成都市实验中学足球队',
    type: '黄牌',
    minute: 62,
    note: '拉拽对手',
    createdBy: 'admin001',
    createdAt: '2026-09-27 18:05',
  },
  {
    id: 'ev-008',
    tournamentId: 't-city-chengdu',
    tournamentName: '2026 成都市校园足球联赛',
    matchLabel: '中学组 第 2 轮',
    home: '成都市实验中学足球队',
    away: '师大附中队',
    playerId: 'p-004',
    playerName: '赵一鸣',
    team: '成都市实验中学足球队',
    type: '换人',
    minute: 75,
    note: '因伤被替换下场',
    createdBy: 'admin001',
    createdAt: '2026-09-27 18:08',
  },
]

function delay(ms = 260) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function nowText() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function load(): MatchEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      save(SEED)
      return SEED.map((e) => ({ ...e }))
    }
    return JSON.parse(raw) as MatchEvent[]
  } catch {
    return SEED.map((e) => ({ ...e }))
  }
}

function save(list: MatchEvent[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // 隐私模式写入失败时保持内存数据可用
  }
}

/** 门户 AI 报告等只读场景使用：读取全部比赛事件 */
export function readMatchEvents(): MatchEvent[] {
  return load()
}

function matchesQuery(e: MatchEvent, query: MatchEventQuery) {
  if (query.tournamentId && e.tournamentId !== query.tournamentId) return false
  if (query.playerId && e.playerId !== query.playerId) return false
  if (query.team && e.team !== query.team) return false
  if (query.type && e.type !== query.type) return false
  if (query.keyword) {
    const key = query.keyword.trim().toLowerCase()
    const text = [e.playerName, e.team, e.matchLabel, e.home, e.away, e.tournamentName].join(' ').toLowerCase()
    if (!text.includes(key)) return false
  }
  return true
}

export const mockMatchEventApi: MatchEventApi = {
  async list(query: MatchEventQuery = {}) {
    await delay()
    return load()
      .filter((e) => matchesQuery(e, query))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((e) => ({ ...e }))
  },

  async create(input: MatchEventInput) {
    await delay(320)
    if (!input.tournamentId || !input.tournamentName) throw new ApiError(6301, '请选择赛事')
    if (!input.matchLabel.trim()) throw new ApiError(6302, '请填写场次')
    if (input.matchLabel.trim().length > 30) throw new ApiError(6308, '场次说明不能超过 30 个字符')
    if (!input.home.trim() || !input.away.trim()) throw new ApiError(6303, '请填写对阵双方')
    if (input.home.trim().length > 30 || input.away.trim().length > 30) {
      throw new ApiError(6309, '球队名称不能超过 30 个字符')
    }
    if ((input.note ?? '').trim().length > 100) throw new ApiError(6310, '事件说明不能超过 100 个字符')
    if (!input.playerId || !input.playerName) throw new ApiError(6304, '请选择事件球员')
    if (!input.type) throw new ApiError(6305, '请选择事件类型')
    if (!Number.isFinite(input.minute) || input.minute < 0 || input.minute > 120) {
      throw new ApiError(6306, '比赛时间需在 0 - 120 分钟之间')
    }

    const event: MatchEvent = {
      id: `ev-${Date.now()}`,
      tournamentId: input.tournamentId,
      tournamentName: input.tournamentName,
      matchLabel: input.matchLabel.trim(),
      home: input.home.trim(),
      away: input.away.trim(),
      playerId: input.playerId,
      playerName: input.playerName,
      team: input.team,
      type: input.type,
      minute: input.minute,
      note: input.note?.trim() || undefined,
      createdBy: input.createdBy,
      createdAt: nowText(),
    }
    const list = load()
    list.unshift(event)
    save(list)
    return { ...event }
  },

  async remove(id: string) {
    await delay()
    const list = load()
    const index = list.findIndex((e) => e.id === id)
    if (index < 0) throw new ApiError(6307, '事件不存在或已被删除')
    list.splice(index, 1)
    save(list)
  },
}
