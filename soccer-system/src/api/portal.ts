import { getPage, api } from './client'
import type { ApiMatch, ApiNews, ApiPolicy, ApiScorer } from './types'
import { news as mockNews, policies as mockPolicies, type NewsItem } from '../data/portal-news'
import { mockMatches, type MatchRow } from '../data/portal-matches'
import { mockScorers, mockStandings, type ScorerRow, type StandingRow } from '../data/portal-rankings'

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

/** 射手榜：后端暂无助攻字段，assists 显示为 —（接口补齐后替换） */
export async function fetchScorers(): Promise<ScorerRow[]> {
  try {
    const list = await getPage<ApiScorer>('/api/portal/stats/ranking/', { limit: 50 })
    if (!list.length) return mockScorers
    return list.map((s) => ({
      rank: s.rank,
      name: s.player_name,
      team: s.team_name,
      goals: s.total_goals,
      assists: '—',
    }))
  } catch {
    return mockScorers
  }
}

/** 未开赛/未发布赛果的对阵不参与积分统计 */
function standingsFromMatches(matches: ApiMatch[]): StandingRow[] {
  interface Acc {
    team: string
    group: string
    played: number
    win: number
    draw: number
    loss: number
    gf: number
    ga: number
    points: number
  }

  const map = new Map<string, Acc>()
  const entry = (group: string, team: string): Acc => {
    const key = `${group}|${team}`
    let acc = map.get(key)
    if (!acc) {
      acc = { team, group, played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0, points: 0 }
      map.set(key, acc)
    }
    return acc
  }

  for (const m of matches) {
    if (!m.result) continue
    const { home_score, away_score } = m.result
    const group = m.group_type_display
    const home = entry(group, m.home_team_name)
    const away = entry(group, m.away_team_name)
    home.played += 1
    away.played += 1
    home.gf += home_score
    home.ga += away_score
    away.gf += away_score
    away.ga += home_score
    if (home_score > away_score) {
      home.win += 1
      home.points += 3
      away.loss += 1
    } else if (home_score < away_score) {
      away.win += 1
      away.points += 3
      home.loss += 1
    } else {
      home.draw += 1
      away.draw += 1
      home.points += 1
      away.points += 1
    }
  }

  // 组内排名：积分 → 净胜球 → 进球数，排序后重新编号
  const byGroup = new Map<string, Acc[]>()
  for (const acc of map.values()) {
    const list = byGroup.get(acc.group) ?? []
    list.push(acc)
    byGroup.set(acc.group, list)
  }

  const rows: StandingRow[] = []
  for (const [, list] of byGroup) {
    list.sort((a, b) => b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf || a.team.localeCompare(b.team, 'zh'))
    list.forEach((acc, index) => {
      rows.push({
        rank: index + 1,
        team: acc.team,
        group: acc.group,
        played: acc.played,
        win: acc.win,
        draw: acc.draw,
        loss: acc.loss,
        gf: acc.gf,
        ga: acc.ga,
        diff: acc.gf - acc.ga > 0 ? `+${acc.gf - acc.ga}` : String(acc.gf - acc.ga),
        points: acc.points,
      })
    })
  }
  return rows
}

/**
 * 积分榜：后端暂无 standings 接口，用公开对阵 + 已发布赛果在前端聚合（口径与
 * 需求文档 §12 一致：仅统计已发布比分，积分→净胜球→进球数排序）。后端补接口后替换。
 */
export async function fetchStandings(): Promise<StandingRow[]> {
  try {
    const list = await getPage<ApiMatch>('/api/portal/matches/', { page_size: 100, ordering: 'match_time' })
    const rows = standingsFromMatches(list)
    return rows.length ? rows : mockStandings
  } catch {
    return mockStandings
  }
}

export { api }
