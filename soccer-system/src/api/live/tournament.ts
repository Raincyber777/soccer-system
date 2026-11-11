import { mockTournamentApi } from '../mock/tournament'
import type { Tournament, TournamentApi, TournamentQuery } from '../types'
import { api } from './client'

// 赛事：后端 Competition 只有名称/年份/状态，其余字段用契约默认值补齐
// 完整赛事管理（等级/组别/报名时间/发布）仍需后端扩展，暂保留 mock 写接口

interface ApiCompetition {
  id: number
  name: string
  year: number
  status: 'open' | 'closed'
  status_display: string
  created_at: string
}

interface PageData<T> {
  list: T[]
  next_page: number | null
  total: number
  page: number
  page_size: number
}

function toTournament(row: ApiCompetition): Tournament {
  const open = row.status === 'open'
  return {
    id: String(row.id),
    name: row.name,
    level: 'province',
    group: '中学组',
    organizer: '四川省教育厅',
    signStart: `${row.year}-01-01`,
    signEnd: `${row.year}-12-31`,
    status: open ? '报名中' : '已截止',
    registrationEnabled: open,
    createdBy: '系统',
    createdAt: row.created_at,
  }
}

export const liveTournamentApi: TournamentApi = {
  ...mockTournamentApi,

  async list(query?: TournamentQuery): Promise<Tournament[]> {
    const data = await api.get<PageData<ApiCompetition>>('/api/competitions', {
      status: query?.status === '报名中' ? 'open' : query?.status === '已截止' ? 'closed' : undefined,
      page_size: 100,
    })
    let list = (data.list || []).map(toTournament)
    if (query?.keyword) {
      const keyword = query.keyword.trim()
      list = list.filter((item) => item.name.includes(keyword))
    }
    return list
  },
}
