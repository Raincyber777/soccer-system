import { getPage, api } from './client'
import type { ApiMatch, ApiNews, ApiPolicy, ApiScorer } from './types'
import type { ApiStandingRow } from './stats'

// 门户公开数据获取：数据全部来自后端，与各管理页同口径；
// 后端不可用或暂无数据时返回空数组，页面展示空态。

/** 新闻/政策条目：后端 content 为富文本 HTML，弹窗优先用 html 渲染 */
export interface NewsItem {
  tag: string
  title: string
  source: string
  date: string
  summary: string
  html?: string
}

// 用 type 而非 interface：type 别名带隐式索引签名，可直接传给 DataTable 的 rows（Record<string, unknown>[]）
export type MatchRow = {
  match: string
  group: string
  home: string
  score: string
  away: string
  time: string
  venue: string
  status: string
}

export type StandingRow = {
  rank: number
  team: string
  group: string
  played: number
  win: number
  draw: number
  loss: number
  gf: number
  ga: number
  diff: string
  points: number
}

export type ScorerRow = {
  rank: number
  name: string
  team: string
  goals: number
  assists: number
}

/** 新闻列表：后端 content 为富文本 HTML，直接随行带回给弹窗 v-html 渲染 */
function newsFromApi(item: ApiNews): NewsItem {
  const date = (item.published_at || item.created_at).slice(0, 10)
  return {
    tag: item.category_display,
    title: item.title,
    // 后端 News.source 是发布来源（单位名），无来源时退回发布人
    source: item.source || item.created_by_name || '赛事组委会',
    date,
    summary: item.summary,
    html: item.content,
  }
}

function policyFromApi(item: ApiPolicy): NewsItem {
  const date = (item.published_at || item.created_at).slice(0, 10)
  return {
    tag: '政策文件',
    title: item.title,
    source: item.issuing_org || '四川省教育厅',
    date,
    summary: item.summary,
    html: item.content,
  }
}

export async function fetchNews(): Promise<NewsItem[]> {
  try {
    const list = await getPage<ApiNews>('/api/portal/news/', { page_size: 100, ordering: '-published_at' })
    return list.map(newsFromApi)
  } catch {
    return []
  }
}

export async function fetchPolicies(): Promise<NewsItem[]> {
  try {
    const list = await getPage<ApiPolicy>('/api/portal/policy/', { page_size: 100, ordering: '-published_at' })
    return list.map(policyFromApi)
  } catch {
    return []
  }
}

function matchFromApi(m: ApiMatch): MatchRow {
  return {
    match: `${m.group_type_display} ${m.round_name}`.trim(),
    group: m.group_type_display,
    home: m.home_team_name,
    score: m.result ? `${m.result.home_score} : ${m.result.away_score}` : '—',
    away: m.away_team_name,
    time: m.match_time,
    venue: m.venue,
    status: m.status_display,
  }
}

/** 赛程赛果：page_size 上限 100，一次取全量由前端按组别过滤 */
export async function fetchMatches(): Promise<MatchRow[]> {
  try {
    const list = await getPage<ApiMatch>('/api/portal/matches/', { page_size: 100, ordering: 'match_time' })
    return list.map(matchFromApi)
  } catch {
    return []
  }
}

/** 射手榜：后端聚合（仅统计已发布赛果的进球），助攻同口径 */
export async function fetchScorers(): Promise<ScorerRow[]> {
  try {
    const list = await getPage<ApiScorer>('/api/portal/stats/ranking/', { limit: 50 })
    return list.map((s) => ({
      rank: s.rank,
      name: s.player_name,
      team: s.team_name,
      goals: s.total_goals,
      assists: s.assists,
    }))
  } catch {
    return []
  }
}

/**
 * 积分榜：后端聚合（/api/portal/stats/standings/，胜 3 平 1 负 0，
 * 同分按净胜球 → 进球数 → 球队名，按组别分段排名），仅统计已发布赛果。
 */
export async function fetchStandings(): Promise<StandingRow[]> {
  try {
    const data = await api.get<never, { group_type: string | null; results: ApiStandingRow[] }>(
      '/api/portal/stats/standings/',
    )
    return data.results.map((r) => ({
      rank: r.rank ?? 0,
      team: r.team_name,
      group: r.group_type_display,
      played: r.played,
      win: r.win,
      draw: r.draw,
      loss: r.loss,
      gf: r.goals_for,
      ga: r.goals_against,
      diff: r.goals_for - r.goals_against > 0 ? `+${r.goals_for - r.goals_against}` : String(r.goals_for - r.goals_against),
      points: r.points,
    }))
  } catch {
    return []
  }
}

export { api }
