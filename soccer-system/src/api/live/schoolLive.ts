import { ApiError } from '../error'
import type {
  FaceVerifyRecord,
  LineupPlayer,
  LiveEventInput,
  LiveEventType,
  LiveLink,
  LiveMatchEvent,
  MatchFile,
  MatchFileCategory,
  MatchLineup,
  MatchReferee,
  MatchSide,
  MatchStateRecord,
  RefereeInput,
  RefereeRole,
  SchoolLiveApi,
} from '../types'
import { api, clientToken } from './client'

// 校级比赛运营：/api/school/live/*
// 后端事件类型/裁判角色/文件类别为英文枚举，前端为中文，统一在此转换

interface ApiEvent {
  id: number
  type: string
  type_label: string
  minute: number
  team_side: MatchSide | null
  player_name: string | null
  player_no: number | null
  related_player_name: string | null
  content: string | null
  created_at: string
}

interface ApiMatchDetail {
  id: number
  status: 'not_started' | 'live' | 'finished'
  status_label: string
  home_score: number
  away_score: number
  version: number
  updated_at: string
  lineup_home: { name: string; no: string; position?: string; is_captain?: boolean }[]
  lineup_away: { name: string; no: string; position?: string; is_captain?: boolean }[]
  live_link: string | null
}

interface ApiEventResult {
  event: ApiEvent | null
  home_score: number
  away_score: number
  version: number
}

const EVENT_TYPE_TO_CN: Record<string, LiveEventType> = {
  goal: '进球',
  yellow: '黄牌',
  red: '红牌',
  substitution: '换人',
  text: '文字',
}

const EVENT_TYPE_TO_API: Record<LiveEventType, string> = {
  进球: 'goal',
  黄牌: 'yellow',
  红牌: 'red',
  换人: 'substitution',
  文字: 'text',
}

const REFEREE_ROLE_TO_CN: Record<string, RefereeRole> = {
  chief: '主裁判',
  assistant: '助理裁判',
  fourth: '第四官员',
}

const REFEREE_ROLE_TO_API: Record<RefereeRole, string> = {
  主裁判: 'chief',
  助理裁判: 'assistant',
  第四官员: 'fourth',
}

const FILE_TYPE_TO_CN: Record<string, MatchFileCategory> = {
  sign_in: '签到表',
  record_confirm: '记录确认单',
  referee_report: '裁判报告单',
}

const FILE_TYPE_TO_API: Record<MatchFileCategory, string> = {
  签到表: 'sign_in',
  记录确认单: 'record_confirm',
  裁判报告单: 'referee_report',
}

const SIDE_LABEL: Record<MatchSide, string> = { home: '主队', away: '客队' }

// 后端单事件接口不带 match_id，按 matchId → eventId 反查补全
const eventMatchCache = new Map<number, number>()

function toEvent(row: ApiEvent, matchId: number): LiveMatchEvent {
  const side = row.team_side || 'home'
  return {
    id: row.id,
    match_id: matchId,
    type: EVENT_TYPE_TO_CN[row.type] || '文字',
    minute: row.minute,
    side,
    side_display: SIDE_LABEL[side],
    player_name: row.player_name || '',
    note: row.content || (row.related_player_name ? `换上 ${row.related_player_name}` : null),
    created_by: '',
    created_at: row.created_at,
  }
}

function eventPayload(input: LiveEventInput) {
  const isText = input.type === '文字'
  return {
    type: EVENT_TYPE_TO_API[input.type],
    minute: input.minute,
    team_side: isText ? null : input.side,
    player_name: isText ? '' : input.player_name,
    content: input.note || '',
    related_player_name: input.type === '换人' ? input.note || '' : '',
    client_token: clientToken(),
  }
}

function toLineupPlayer(row: { name: string; no: string; position?: string }, side: MatchSide, index: number): LineupPlayer {
  const positions: LineupPlayer['position'][] = ['门将', '后卫', '中场', '前锋']
  const position = positions.includes(row.position as LineupPlayer['position'])
    ? (row.position as LineupPlayer['position'])
    : '中场'
  return {
    id: `${side}-${index}`,
    name: row.name,
    jersey_no: Number(row.no) || 0,
    position,
  }
}

function toLineup(detail: ApiMatchDetail): MatchLineup {
  return {
    match_id: detail.id,
    home: (detail.lineup_home || []).map((row, index) => toLineupPlayer(row, 'home', index)),
    away: (detail.lineup_away || []).map((row, index) => toLineupPlayer(row, 'away', index)),
    version: detail.version ?? 0,
    updated_at: detail.updated_at || null,
  }
}

function phaseOf(status: ApiMatchDetail['status']): MatchStateRecord['phase'] {
  if (status === 'live') return 'first_half'
  if (status === 'finished') return 'finished'
  return 'not_started'
}

export const liveSchoolLiveApi: SchoolLiveApi = {
  async events(matchId: number): Promise<LiveMatchEvent[]> {
    const rows = await api.get<ApiEvent[]>(`/api/school/live/matches/${matchId}/events`)
    rows.forEach((row) => eventMatchCache.set(row.id, matchId))
    return rows.map((row) => toEvent(row, matchId))
  },

  async createEvent(matchId: number, input: LiveEventInput): Promise<LiveMatchEvent> {
    const result = await api.post<ApiEventResult>(`/api/school/live/matches/${matchId}/events`, eventPayload(input))
    if (!result.event) throw new ApiError(-1, '事件创建失败')
    eventMatchCache.set(result.event.id, matchId)
    return toEvent(result.event, matchId)
  },

  async updateEvent(eventId: number, input: LiveEventInput): Promise<LiveMatchEvent> {
    const result = await api.put<ApiEventResult>(`/api/school/live/events/${eventId}`, eventPayload(input))
    if (!result.event) throw new ApiError(-1, '事件更新失败')
    const matchId = eventMatchCache.get(eventId) || 0
    return toEvent(result.event, matchId)
  },

  async removeEvent(eventId: number): Promise<void> {
    await api.delete<ApiEventResult>(`/api/school/live/events/${eventId}`)
  },

  async lineup(matchId: number): Promise<MatchLineup> {
    const detail = await api.get<ApiMatchDetail>(`/api/school/live/matches/${matchId}`)
    return toLineup(detail)
  },

  async saveLineup(matchId: number, input: { home: LineupPlayer[]; away: LineupPlayer[] }, version: number): Promise<MatchLineup> {
    const detail = await api.put<ApiMatchDetail>(`/api/school/live/matches/${matchId}/lineup`, {
      version,
      lineup_home: input.home.map((p) => ({ name: p.name, no: String(p.jersey_no), position: p.position })),
      lineup_away: input.away.map((p) => ({ name: p.name, no: String(p.jersey_no), position: p.position })),
    })
    return toLineup(detail)
  },

  async referees(matchId: number): Promise<MatchReferee[]> {
    const rows = await api.get<{ id: number; role: string; name: string }[]>(
      `/api/school/live/matches/${matchId}/referees`,
    )
    return rows.map((row) => ({
      id: String(row.id),
      name: row.name,
      role: REFEREE_ROLE_TO_CN[row.role] || '主裁判',
      phone: '',
    }))
  },

  async saveReferees(matchId: number, list: RefereeInput[]): Promise<MatchReferee[]> {
    const rows = await api.put<{ id: number; role: string; name: string }[]>(
      `/api/school/live/matches/${matchId}/referees`,
      { referees: list.map((item) => ({ role: REFEREE_ROLE_TO_API[item.role], name: item.name })) },
    )
    return rows.map((row) => ({
      id: String(row.id),
      name: row.name,
      role: REFEREE_ROLE_TO_CN[row.role] || '主裁判',
      phone: '',
    }))
  },

  async files(matchId: number): Promise<MatchFile[]> {
    const rows = await api.get<ApiFile[]>(`/api/school/live/matches/${matchId}/files`)
    return rows.map(toFile)
  },

  async uploadFile(matchId: number, category: MatchFileCategory, file: File): Promise<MatchFile> {
    const form = new FormData()
    form.append('type', FILE_TYPE_TO_API[category])
    form.append('file', file)
    const row = await api.upload<ApiFile>(`/api/school/live/matches/${matchId}/files`, form)
    return toFile(row)
  },

  async removeFile(fileId: string): Promise<void> {
    await api.delete(`/api/school/live/files/${fileId}`)
  },

  async downloadFile(fileId: string): Promise<Blob> {
    return api.download(`/api/school/live/files/${fileId}/download`)
  },

  async liveLink(matchId: number): Promise<LiveLink | null> {
    const detail = await api.get<ApiMatchDetail>(`/api/school/live/matches/${matchId}`)
    if (!detail.live_link) return null
    return {
      match_id: detail.id,
      platform: '其他',
      url: detail.live_link,
      updated_by: '',
      updated_at: detail.updated_at,
    }
  },

  async saveLiveLink(matchId: number, input: { platform: string; url: string }): Promise<LiveLink> {
    await api.put(`/api/school/live/matches/${matchId}/live-link`, { live_link: input.url })
    return {
      match_id: matchId,
      platform: input.platform || '其他',
      url: input.url,
      updated_by: '',
      updated_at: new Date().toISOString(),
    }
  },

  async clearLiveLink(matchId: number): Promise<void> {
    await api.put(`/api/school/live/matches/${matchId}/live-link`, { live_link: null })
  },

  async faceRecords(matchId: number): Promise<FaceVerifyRecord[]> {
    const rows = await api.get<ApiFaceRecord[]>(`/api/school/live/matches/${matchId}/face-verify-records`)
    return rows.map(toFaceRecord)
  },

  async verifyFace(matchId: number, subject: string, photo: File): Promise<FaceVerifyRecord> {
    const form = new FormData()
    form.append('player_name', subject)
    form.append('photo', photo)
    const row = await api.upload<ApiFaceRecord>(`/api/school/live/matches/${matchId}/face-verify`, form)
    return toFaceRecord(row)
  },

  async state(matchId: number): Promise<MatchStateRecord> {
    const detail = await api.get<ApiMatchDetail>(`/api/school/live/matches/${matchId}`)
    return {
      match_id: detail.id,
      home_score: detail.home_score,
      away_score: detail.away_score,
      phase: phaseOf(detail.status),
      phase_display: detail.status_label,
      source: 'system',
      source_display: '系统',
      updated_by: '',
      updated_at: detail.updated_at,
    }
  },

  async saveState(): Promise<never> {
    throw new ApiError(1002, '后端暂不支持手动修改比分与阶段')
  },

  async report(): Promise<null> {
    return null
  },

  async generateReport(): Promise<never> {
    throw new ApiError(1002, '后端暂未提供 AI 报告接口')
  },
}

interface ApiFile {
  id: number
  match_id: number
  type: string
  file_name: string
  size: number
  uploaded_by: number | null
  created_at: string
}

function toFile(row: ApiFile): MatchFile {
  return {
    id: String(row.id),
    match_id: row.match_id,
    category: FILE_TYPE_TO_CN[row.type] || '签到表',
    name: row.file_name,
    size: row.size,
    uploaded_by: row.uploaded_by == null ? '' : String(row.uploaded_by),
    uploaded_at: row.created_at,
  }
}

interface ApiFaceRecord {
  id: number
  match_id: number
  player_name: string
  player_no: string | null
  result: string
  score: string | number
  created_by: number | null
  created_at: string
}

function toFaceRecord(row: ApiFaceRecord): FaceVerifyRecord {
  return {
    id: String(row.id),
    match_id: row.match_id,
    subject: row.player_no ? `${row.player_name} (${row.player_no})` : row.player_name,
    status: row.result === 'pass' ? '通过' : '未通过',
    score: Number(row.score) || 0,
    operator: row.created_by == null ? '' : String(row.created_by),
    verified_at: row.created_at,
  }
}
