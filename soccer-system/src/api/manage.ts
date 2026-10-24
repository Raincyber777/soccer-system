import { api, getPage } from './client'
import type { ApiMatch, ApiNews, ApiPolicy } from './types'

// 管理端内容管理：新闻/政策/对阵/赛果的真实 CRUD。
// 读失败（后端未启动/未登录）返回 null，页面保留演示数据；
// 写失败直接抛 ApiError，由页面提示后端 message（如无权限/参数错误）。

/** 读失败回退 null：调用方据此决定是否保留本地演示行 */
async function tryList<T>(url: string, params?: Record<string, unknown>): Promise<T[] | null> {
  try {
    return await getPage<T>(url, params)
  } catch {
    return null
  }
}

// ---------- 新闻 /api/portal/news/ ----------

export interface NewsPayload {
  title: string
  summary: string
  content: string
  category: 'news' | 'report' | 'announcement'
  source?: string
  is_published?: boolean
}

export function fetchAdminNews() {
  return tryList<ApiNews>('/api/portal/news/', { page_size: 100, ordering: '-published_at' })
}

export function createNews(payload: NewsPayload) {
  return api.post<never, ApiNews>('/api/portal/news/', payload)
}

export function updateNews(id: number, payload: Partial<NewsPayload>) {
  return api.patch<never, ApiNews>(`/api/portal/news/${id}/`, payload)
}

export function deleteNews(id: number) {
  return api.delete(`/api/portal/news/${id}/`)
}

// ---------- 政策 /api/portal/policy/ ----------

export interface PolicyPayload {
  title: string
  summary: string
  content: string
  issuing_org?: string
  is_published?: boolean
}

export function fetchAdminPolicies() {
  return tryList<ApiPolicy>('/api/portal/policy/', { page_size: 100, ordering: '-published_at' })
}

export function createPolicy(payload: PolicyPayload) {
  return api.post<never, ApiPolicy>('/api/portal/policy/', payload)
}

export function updatePolicy(id: number, payload: Partial<PolicyPayload>) {
  return api.patch<never, ApiPolicy>(`/api/portal/policy/${id}/`, payload)
}

export function deletePolicy(id: number) {
  return api.delete(`/api/portal/policy/${id}/`)
}

// ---------- 球队下拉 /api/portal/teams/ ----------

export interface ApiTeamOption {
  id: number
  name: string
  group_type: string
}

export function fetchTeamOptions() {
  return tryList<ApiTeamOption>('/api/portal/teams/', { page_size: 100 })
}

// ---------- 对阵 /api/portal/matches/ ----------

export type MatchGroup = 'primary' | 'middle' | 'high' | 'university'
export type MatchStatus = 'scheduled' | 'ongoing' | 'finished' | 'postponed'

export interface MatchPayload {
  group_type: MatchGroup
  round_name?: string
  home_team: number
  away_team: number
  match_time: string
  venue?: string
  status?: MatchStatus
}

export function fetchAdminMatches() {
  return tryList<ApiMatch>('/api/portal/matches/', { page_size: 100, ordering: 'match_time' })
}

export function createMatch(payload: MatchPayload) {
  return api.post<never, ApiMatch>('/api/portal/matches/', payload)
}

export function updateMatch(id: number, payload: Partial<MatchPayload>) {
  return api.patch<never, ApiMatch>(`/api/portal/matches/${id}/`, payload)
}

export function deleteMatch(id: number) {
  return api.delete(`/api/portal/matches/${id}/`)
}

// ---------- 赛果 /api/portal/results/ ----------

export interface ResultPayload {
  match: number
  home_score: number
  away_score: number
  is_published?: boolean
}

export function createResult(payload: ResultPayload) {
  return api.post<never, unknown>('/api/portal/results/', payload)
}

/** 发布/撤回赛果：发布后端会自动把对阵置为完赛并推断获胜方 */
export function publishResult(id: number, is_published: boolean) {
  return api.patch<never, unknown>(`/api/portal/results/${id}/`, { is_published })
}

export function deleteResult(id: number) {
  return api.delete(`/api/portal/results/${id}/`)
}

// ---------- 进球记录 /api/portal/goals/（射手榜数据源，一场一球员一条） ----------

export interface ApiGoalRecord {
  id: number
  match: number
  player: number
  player_name: string
  team_name: string
  goals: number
  assists: number
  minute: number | null
  note: string
  created_at: string
}

export interface GoalRecordPayload {
  match: number
  player: number
  goals: number
  assists?: number
  minute?: number | null
  note?: string
}

export function fetchGoalRecords(match?: number) {
  return tryList<ApiGoalRecord>('/api/portal/goals/', { page_size: 100, ...(match ? { match } : {}) })
}

export function createGoalRecord(payload: GoalRecordPayload) {
  return api.post<never, ApiGoalRecord>('/api/portal/goals/', payload)
}

export function updateGoalRecord(id: number, payload: Partial<GoalRecordPayload>) {
  return api.patch<never, ApiGoalRecord>(`/api/portal/goals/${id}/`, payload)
}

export function deleteGoalRecord(id: number) {
  return api.delete(`/api/portal/goals/${id}/`)
}

// ---------- 判罚 /api/portal/penalties/ ----------

export interface ApiPenalty {
  id: number
  match: number
  player: number
  player_name: string
  type: 'yellow' | 'red'
  minute: number | null
  reason: string
  created_at: string
}

export interface PenaltyPayload {
  match: number
  player: number
  type: 'yellow' | 'red'
  minute?: number | null
  reason?: string
}

export function fetchPenalties(match?: number) {
  return tryList<ApiPenalty>('/api/portal/penalties/', { page_size: 100, ...(match ? { match } : {}) })
}

export function createPenalty(payload: PenaltyPayload) {
  return api.post<never, ApiPenalty>('/api/portal/penalties/', payload)
}

export function updatePenalty(id: number, payload: Partial<PenaltyPayload>) {
  return api.patch<never, ApiPenalty>(`/api/portal/penalties/${id}/`, payload)
}

export function deletePenalty(id: number) {
  return api.delete(`/api/portal/penalties/${id}/`)
}

// ---------- 裁判员 /api/portal/referees/（一场多条） ----------

export interface ApiReferee {
  id: number
  match: number
  name: string
  role: 'main' | 'linesman' | 'fourth'
  role_display: string
  cert_level: string
}

export interface RefereePayload {
  match: number
  name: string
  role: 'main' | 'linesman' | 'fourth'
  cert_level?: string
}

export function fetchReferees(match?: number) {
  return tryList<ApiReferee>('/api/portal/referees/', { page_size: 100, ...(match ? { match } : {}) })
}

export function createReferee(payload: RefereePayload) {
  return api.post<never, ApiReferee>('/api/portal/referees/', payload)
}

export function updateReferee(id: number, payload: Partial<RefereePayload>) {
  return api.patch<never, ApiReferee>(`/api/portal/referees/${id}/`, payload)
}

export function deleteReferee(id: number) {
  return api.delete(`/api/portal/referees/${id}/`)
}

/** 统一错误文案：ApiError 用后端 message，其余给通用提示 */
export function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : '操作失败，请稍后重试'
}
