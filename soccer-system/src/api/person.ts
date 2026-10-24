import { api, getPage } from './client'
import { errMsg } from './manage'
import type { ApiCoach, ApiPlayer } from './team'

// 管理端人员管理 + 公示 + 身份核验：
// 审核走 POST /api/portal/{players|coaches}/{id}/review/（pending→active/rejected）
// 公示接口公开（仅 active 名单），核验需管理端登录（注册生效 + 报名通过才算过）

async function tryList<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch {
    return null
  }
}

/** 管理端人员列表（分页接口，支持 name/id_card 等后端参数） */
export function fetchPlayers(params?: Record<string, unknown>) {
  return tryList(() => getPage<ApiPlayer>('/api/portal/players/', { page_size: 100, ...params }))
}

export function fetchCoaches(params?: Record<string, unknown>) {
  return tryList(() => getPage<ApiCoach>('/api/portal/coaches/', { page_size: 100, ...params }))
}

/** 审核：approve 置已生效 / reject 置已驳回（city 本区域、admin 全省） */
export function reviewPerson(kind: 'players' | 'coaches', id: number, result: 'approve' | 'reject') {
  return api.post<never, unknown>(`/api/portal/${kind}/${id}/review/`, { result })
}

/** 公示/取消公示：is_active 控制是否出现在公示名单 */
export function setPersonActive(kind: 'players' | 'coaches', id: number, is_active: boolean) {
  return api.patch<never, unknown>(`/api/portal/${kind}/${id}/`, { is_active })
}

// ---------- 公示（公开，仅 active 名单；data 直接是数组） ----------

export function fetchPublicityPlayers(params?: Record<string, unknown>) {
  return tryList(() => api.get<never, ApiPlayer[]>('/api/portal/publicity/players/', { params }))
}

export function fetchPublicityCoaches(params?: Record<string, unknown>) {
  return tryList(() => api.get<never, ApiCoach[]>('/api/portal/publicity/coaches/', { params }))
}

// ---------- 身份核验（管理端） ----------

export interface VerifyResult {
  name: string
  id_card: string
  team_name: string
  player_status: string | null
  registration_status: string | null
  verify_result: 'pass' | 'fail'
  verify_result_display: string
}

/** 参赛身份核验：注册已生效 + 所在球队有已通过的报名 → 通过 */
export function verifyAthlete(idCard: string) {
  return api.get<never, VerifyResult>('/api/portal/verify/', { params: { id_card: idCard } })
}

export { errMsg }
