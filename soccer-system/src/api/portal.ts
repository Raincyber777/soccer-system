import { getPage, api } from './client'
import type { ApiMatch, ApiNews, ApiPolicy, ApiScorer } from './types'
import { news as mockNews, policies as mockPolicies, type NewsItem } from '../data/portal-news'
import { mockMatches, type MatchRow } from '../data/portal-matches'
import { mockScorers, mockStandings, type ScorerRow, type StandingRow } from '../data/portal-rankings'
import type { ApiStandingRow } from './stats'

// 门户公开数据获取：优先请求后端，请求失败（后端未启动/超时/业务码非 0）时
// 自动回退到本地演示数据，保证答辩演示与离线浏览不中断。
// 每个函数都保证 resolve（内部已兜底），调用方无需 try/catch。

/** 新闻列表：后端 content 为富文本 HTML，直接随行带回给弹窗 v-html 渲染 */
export type NewsWithHtml = NewsItem & { html?: string }

function newsFromApi(item: ApiNews): NewsWithHtml {
  const date = (item.published_at || item.created_at).slice(0, 10)
  return {
    tag: item.category_display,
    title: item.title,
    // 后端 News.source 是发布来源（单位名），无来源时退回发布人
    source: item.source || item.created_by_name || '赛事组委会',
    date,
    summary: item.summary,
    body: [],
    html: item.content,
  }
}

function policyFromApi(item: ApiPolicy): NewsWithHtml {
  const date = (item.published_at || item.created_at).slice(0, 10)
  return {
    tag: '政策文件',
    title: item.title,
    source: item.issuing_org || '四川省教育厅',
    date,
    summary: item.summary,
    body: [],
    html: item.content,
  }
}

export async function fetchNews(): Promise<NewsWithHtml[]> {
  try {
    const list = await getPage<ApiNews>('/api/portal/news/', { page_size: 100, ordering: '-published_at' })
    return list.length ? list.map(newsFromApi) : mockNews
  } catch {
    return mockNews
  }
}

export async function fetchPolicies(): Promise<NewsWithHtml[]> {
  try {
    const list = await getPage<ApiPolicy>('/api/portal/policy/', { page_size: 100, ordering: '-published_at' })
    return list.length ? list.map(policyFromApi) : mockPolicies
  } catch {
    return mockPolicies
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
    return list.length ? list.map(matchFromApi) : mockMatches
  } catch {
    return mockMatches
  }
}

/** 射手榜：后端聚合（仅统计已发布赛果的进球），助攻同口径 */
export async function fetchScorers(): Promise<ScorerRow[]> {
  try {
    const list = await getPage<ApiScorer>('/api/portal/stats/ranking/', { limit: 50 })
    if (!list.length) return mockScorers
    return list.map((s) => ({
      rank: s.rank,
      name: s.player_name,
      team: s.team_name,
      goals: s.total_goals,
      assists: s.assists,
    }))
  } catch {
    return mockScorers
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
    if (!data.results.length) return mockStandings
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
    return mockStandings
  }
}

export { api }
