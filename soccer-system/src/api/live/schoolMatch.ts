import type { SchoolGroupType, SchoolMatch, SchoolMatchApi, SchoolMatchInput, SchoolMatchStatus } from '../types'
import { api } from './client'

// 校级比赛：/api/school/live/*，后端自动按本校数据域裁剪

interface ApiMatch {
  id: number
  group_type: SchoolGroupType
  group_type_label: string
  home_team_id: number | null
  away_team_id: number | null
  home_team_name: string
  away_team_name: string
  match_time: string
  venue: string | null
  status: SchoolMatchStatus
  status_label: string
  home_score: number
  away_score: number
  version: number
  created_by: number | string | null
}

interface PageData<T> {
  list: T[]
  next_page: number | null
  total: number
  page: number
  page_size: number
}

function phaseOf(status: SchoolMatchStatus): SchoolMatch['phase'] {
  if (status === 'live') return 'first_half'
  if (status === 'finished') return 'finished'
  return 'not_started'
}

function phaseLabel(status: SchoolMatchStatus): string {
  if (status === 'live') return '上半场'
  if (status === 'finished') return '已结束'
  return '未开始'
}

function toSchoolMatch(row: ApiMatch): SchoolMatch {
  return {
    id: row.id,
    group_type: row.group_type,
    group_type_display: row.group_type_label,
    home_team_id: row.home_team_id == null ? null : String(row.home_team_id),
    away_team_id: row.away_team_id == null ? null : String(row.away_team_id),
    home_team_name: row.home_team_name,
    away_team_name: row.away_team_name,
    match_time: row.match_time,
    venue: row.venue || '',
    status: row.status,
    status_display: row.status_label,
    phase: phaseOf(row.status),
    phase_display: phaseLabel(row.status),
    home_score: row.home_score,
    away_score: row.away_score,
    version: row.version ?? 0,
    created_by: row.created_by == null ? '' : String(row.created_by),
  }
}

function payloadOf(input: SchoolMatchInput) {
  return {
    group_type: input.group_type,
    home_team_id: input.home_team_id ? Number(input.home_team_id) : null,
    away_team_id: input.away_team_id ? Number(input.away_team_id) : null,
    home_team_name: input.home_team_name,
    away_team_name: input.away_team_name,
    match_time: input.match_time,
    venue: input.venue || '',
  }
}

export const liveSchoolMatchApi: SchoolMatchApi = {
  async list(): Promise<SchoolMatch[]> {
    const data = await api.get<PageData<ApiMatch>>('/api/school/live/matches', { page_size: 100 })
    return (data.list || []).map(toSchoolMatch)
  },

  async create(input: SchoolMatchInput): Promise<SchoolMatch> {
    const row = await api.post<ApiMatch>('/api/school/live/matches', payloadOf(input))
    return toSchoolMatch(row)
  },

  async update(id: number, input: SchoolMatchInput, version: number): Promise<SchoolMatch> {
    const row = await api.put<ApiMatch>(`/api/school/live/matches/${id}`, {
      ...payloadOf(input),
      version,
    })
    return toSchoolMatch(row)
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/api/school/live/matches/${id}`)
  },

  async setStatus(id: number, action: 'start' | 'finish'): Promise<SchoolMatch> {
    const current = await api.get<ApiMatch>(`/api/school/live/matches/${id}`)
    const row = await api.patch<ApiMatch>(`/api/school/live/matches/${id}/status`, {
      action,
      version: current.version ?? 0,
    })
    return toSchoolMatch(row)
  },
}
