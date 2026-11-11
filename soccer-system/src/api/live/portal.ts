import { mockPortalApi } from '../mock/portal'
import type { PortalApi, PortalMatch } from '../types'
import { api } from './client'

// 门户：赛程接公众端比赛列表；新闻/政策/榜单后端暂无接口，继续使用 mock

interface ApiPublicMatch {
  id: number
  group_type_label: string
  home_team_name: string
  away_team_name: string
  match_time: string
  venue: string | null
  status: 'not_started' | 'live' | 'finished'
  status_label: string
  home_score: number
  away_score: number
}

interface PageData<T> {
  list: T[]
  next_page: number | null
  total: number
  page: number
  page_size: number
}

function toPortalMatch(row: ApiPublicMatch): PortalMatch {
  return {
    id: row.id,
    match: `${row.home_team_name} vs ${row.away_team_name}`,
    group: row.group_type_label,
    home: row.home_team_name,
    score: row.status === 'not_started' ? '—' : `${row.home_score} - ${row.away_score}`,
    away: row.away_team_name,
    time: row.match_time,
    venue: row.venue || '',
    status: row.status_label,
    phase: row.status_label,
  }
}

export const livePortalApi: PortalApi = {
  ...mockPortalApi,

  async schedule(): Promise<PortalMatch[]> {
    const data = await api.get<PageData<ApiPublicMatch>>('/api/public/live/matches', { page_size: 100 })
    return (data.list || []).map(toPortalMatch)
  },
}
