import { api, getPage } from './client'
import { errMsg } from './manage'

// 遴选评分与最佳球员：selection-scores 一行 = 球员技评/体能总评（后端 save 时自动 total）。
// status 表达遴选阶段（后端为自由字符串，无 display 输出）：
// pending 初选评分 → first_passed 初选通过 → second_passed 复选通过 / rejected 未通过。
// 最佳球员 selection-best：pending 待公示 / publicized 已公示。

async function tryList<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch {
    return null
  }
}

export const SELECTION_STAGE_DISPLAY: Record<string, string> = {
  pending: '初选评分',
  first_passed: '初选通过',
  second_passed: '复选通过',
  rejected: '未通过',
}

/** DecimalField 序列化为字符串，展示/比较时统一 Number() */
export type ScoreValue = number | string

export function scoreNum(v: ScoreValue): number {
  return Number(v) || 0
}

export interface ApiSelectionScore {
  id: number
  player: number
  player_name: string
  player_team: string
  group_type: string
  group_type_display: string
  technical: ScoreValue
  physical: ScoreValue
  total: ScoreValue
  status: string
  created_at: string
}

/** 评分列表（?group_type= 组别过滤，按总分降序） */
export function fetchSelectionScores(params?: Record<string, unknown>) {
  return tryList(() => getPage<ApiSelectionScore>('/api/portal/selection-scores/', { page_size: 200, ...params }))
}

export interface SelectionScorePayload {
  player: number
  group_type: string
  technical: number
  physical: number
  status?: string
}

export function createSelectionScore(payload: SelectionScorePayload) {
  return api.post<never, ApiSelectionScore>('/api/portal/selection-scores/', payload)
}

export function updateSelectionScore(id: number, payload: Partial<SelectionScorePayload>) {
  return api.patch<never, ApiSelectionScore>(`/api/portal/selection-scores/${id}/`, payload)
}

export function deleteSelectionScore(id: number) {
  return api.delete(`/api/portal/selection-scores/${id}/`)
}

export interface ApiSelectionBest {
  id: number
  group_type: string
  group_type_display: string
  player: number
  player_name: string
  team_name: string
  total: ScoreValue
  status: 'pending' | 'publicized'
  created_at: string
}

export function fetchSelectionBest(params?: Record<string, unknown>) {
  return tryList(() => getPage<ApiSelectionBest>('/api/portal/selection-best/', { page_size: 50, ...params }))
}

export function createSelectionBest(payload: { group_type: string; player: number; total: number }) {
  return api.post<never, ApiSelectionBest>('/api/portal/selection-best/', payload)
}

/** 公示/取消公示 */
export function updateSelectionBest(id: number, status: 'pending' | 'publicized') {
  return api.patch<never, ApiSelectionBest>(`/api/portal/selection-best/${id}/`, { status })
}

export function deleteSelectionBest(id: number) {
  return api.delete(`/api/portal/selection-best/${id}/`)
}

export { errMsg }
