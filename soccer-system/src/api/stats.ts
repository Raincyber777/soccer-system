import { api } from './client'

// 赛事统计（公开聚合接口，非分页）：射手榜 / 积分榜 / 组别进球统计。
// 只统计「已发布赛果」的比赛；读失败返回 null，页面展示空态。

export interface ApiScorerRow {
  rank: number
  player_id: number
  player_name: string
  jersey_number: number | null
  position: string
  team_id: number
  team_name: string
  group_type: string
  group_type_display: string
  total_goals: number
  assists: number
  match_count: number
}

export interface ApiStandingRow {
  rank?: number
  team_id: number
  team_name: string
  group_type: string
  group_type_display: string
  played: number
  win: number
  draw: number
  loss: number
  goals_for: number
  goals_against: number
  points: number
}

export interface ApiGroupGoals {
  group_type: string
  group_type_display: string
  team_count: number
  player_count: number
  scorer_count: number
  total_goals: number
  top_players: ApiScorerRow[]
}

async function tryStats<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch {
    return null
  }
}

/** 射手榜：?group_type=&limit=（limit 默认 20，上限 100） */
export function fetchScorerRanking(groupType?: string, limit = 20) {
  return tryStats(() =>
    api.get<never, { group_type: string | null; results: ApiScorerRow[] }>('/api/portal/stats/ranking/', {
      params: { group_type: groupType || undefined, limit },
    }),
  )
}

/** 积分榜：胜 3 平 1 负 0，同分按净胜球 → 进球数 → 球队名，按组别分段排名 */
export function fetchStandings(groupType?: string) {
  return tryStats(() =>
    api.get<never, { group_type: string | null; results: ApiStandingRow[] }>('/api/portal/stats/standings/', {
      params: { group_type: groupType || undefined },
    }),
  )
}

/** 组别进球统计：球队数/球员数/进球人数/总进球与组内最佳射手 */
export function fetchGroupGoals(groupType?: string, limit = 5) {
  return tryStats(() =>
    api.get<never, { groups: ApiGroupGoals[] }>('/api/portal/stats/group-goals/', {
      params: { group_type: groupType || undefined, limit },
    }),
  )
}
