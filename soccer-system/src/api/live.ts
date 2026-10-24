import { api, getPage } from './client'
import { errMsg } from './manage'

// 赛事直播：图文条目（match-events）+ 视频直播链接（live-streams）。
// 均为 IsStaffOrReadOnly：公开可读、管理端可写；支持 match/status 查询参数。

async function tryList<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch {
    return null
  }
}

// ---------- 图文直播条目 /api/portal/match-events/ ----------

export type MatchEventType = 'goal' | 'substitution' | 'card' | 'text'

export interface ApiMatchEvent {
  id: number
  match: number
  minute: number | null
  type: MatchEventType
  type_display: string
  content: string
  published_at: string
}

/** 图文条目（?match= 场次过滤；不传返回全部，按发布时间升序） */
export function fetchMatchEvents(params?: Record<string, unknown>) {
  return tryList(() => getPage<ApiMatchEvent>('/api/portal/match-events/', { page_size: 200, ...params }))
}

export function createMatchEvent(payload: {
  match: number
  minute?: number | null
  type: MatchEventType
  content: string
}) {
  return api.post<never, ApiMatchEvent>('/api/portal/match-events/', payload)
}

export function deleteMatchEvent(id: number) {
  return api.delete(`/api/portal/match-events/${id}/`)
}

// ---------- 视频直播链接 /api/portal/live-streams/ ----------

export type LiveStreamStatus = 'pending' | 'live' | 'ended'

export interface ApiLiveStream {
  id: number
  match: number
  match_display: string
  platform: string
  url: string
  status: LiveStreamStatus
  status_display: string
  created_at: string
}

export function fetchLiveStreams(params?: Record<string, unknown>) {
  return tryList(() => getPage<ApiLiveStream>('/api/portal/live-streams/', { page_size: 100, ...params }))
}

export interface LiveStreamPayload {
  match: number
  platform?: string
  url: string
  status?: LiveStreamStatus
}

export function createLiveStream(payload: LiveStreamPayload) {
  return api.post<never, ApiLiveStream>('/api/portal/live-streams/', payload)
}

export function updateLiveStream(id: number, payload: Partial<LiveStreamPayload>) {
  return api.patch<never, ApiLiveStream>(`/api/portal/live-streams/${id}/`, payload)
}

export function deleteLiveStream(id: number) {
  return api.delete(`/api/portal/live-streams/${id}/`)
}

export { errMsg }
