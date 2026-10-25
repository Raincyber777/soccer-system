import { api, getPage } from './client'
import { errMsg } from './manage'

// 用户端球队/球员/教练管理：school 角色可写本人球队资源
// （后端 IsStaffOrTeamOwner + 对象级 owner 校验双重把关）。
// 读失败返回 null（页面展示空态），写失败抛 ApiError 由页面提示。

export interface ApiTeam {
  id: number
  name: string
  school: number | null
  school_name: string
  school_code: string
  group_type: string
  group_type_display: string
  founded_at: string | null
  captain: string
  intro: string
  owner: number | null
  city_name: string
}

export interface ApiPlayer {
  id: number
  team: number
  team_name: string
  group_type_display: string
  name: string
  gender: string
  birth_date: string
  id_card: string
  school: string | null
  school_code: string
  school_name: string
  grade: string
  position: string
  jersey_number: number | null
  phone: string
  photo_url: string
  status: string
  status_display: string
  is_active: boolean
}

export interface ApiCoach {
  id: number
  name: string
  gender: string
  birth_date: string
  id_card: string
  phone: string
  unit_name: string
  years: number | null
  cert_level: string
  category: string
  team: number | null
  team_name: string
  status: string
  status_display: string
}

/** 读失败回退 null：调用方据此展示空态 */
async function tryList<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch {
    return null
  }
}

// ---------- 球队 /api/portal/teams/ ----------

/** 球队列表（公开读，staff 视角看全省）：参赛管理检索用 */
export function fetchTeams(params?: Record<string, unknown>) {
  return tryList(() => getPage<ApiTeam>('/api/portal/teams/', { page_size: 100, ...params }))
}

/** 我的球队（?mine=true，school 登录后通常 0 或 1 支） */
export function fetchMyTeam() {
  return tryList(async () => {
    const list = await getPage<ApiTeam>('/api/portal/teams/', { mine: 'true', page_size: 10 })
    return list[0] ?? null
  })
}

export interface TeamPayload {
  name: string
  /** 学校外键值：School 模型主键即标识码 code */
  school: string
  founded_at?: string
  captain?: string
  intro?: string
}

export function createTeam(payload: TeamPayload) {
  return api.post<never, ApiTeam>('/api/portal/teams/', payload)
}

export function updateTeam(id: number, payload: Partial<TeamPayload>) {
  return api.patch<never, ApiTeam>(`/api/portal/teams/${id}/`, payload)
}

/** 学校标识码 → 学校记录（School 主键即 code；接口无分页，data 直接是数组） */
export async function fetchSchoolCode(code: string): Promise<string | null> {
  try {
    const list = await api.get<never, { code: string; name: string }[]>('/api/common/schools/', {
      params: { keyword: code },
    })
    return list.find((s) => s.code === code)?.code ?? list[0]?.code ?? null
  } catch {
    return null
  }
}

// ---------- 球员 /api/portal/players/ ----------

export function fetchPlayers(params?: Record<string, unknown>) {
  return tryList(() => getPage<ApiPlayer>('/api/portal/players/', { page_size: 100, ...params }))
}

export interface PlayerPayload {
  team: number
  name: string
  gender?: string
  birth_date?: string
  id_card: string
  grade?: string
  position?: string
  jersey_number?: number | null
}

export function createPlayer(payload: PlayerPayload) {
  return api.post<never, ApiPlayer>('/api/portal/players/', payload)
}

export function updatePlayer(id: number, payload: Partial<PlayerPayload>) {
  return api.patch<never, ApiPlayer>(`/api/portal/players/${id}/`, payload)
}

export function deletePlayer(id: number) {
  return api.delete(`/api/portal/players/${id}/`)
}

// ---------- 教练 /api/portal/coaches/ ----------

export function fetchCoaches(params?: Record<string, unknown>) {
  return tryList(() => getPage<ApiCoach>('/api/portal/coaches/', { page_size: 100, ...params }))
}

export interface CoachPayload {
  team: number | null
  name: string
  gender?: string
  birth_date?: string
  id_card: string
  phone?: string
  unit_name?: string
  cert_level?: string
  category?: string
  years?: number | null
}

export function createCoach(payload: CoachPayload) {
  return api.post<never, ApiCoach>('/api/portal/coaches/', payload)
}

export function updateCoach(id: number, payload: Partial<CoachPayload>) {
  return api.patch<never, ApiCoach>(`/api/portal/coaches/${id}/`, payload)
}

export function deleteCoach(id: number) {
  return api.delete(`/api/portal/coaches/${id}/`)
}

export { errMsg }
