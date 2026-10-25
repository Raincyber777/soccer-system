import { api, getPage } from './client'
import { errMsg } from './manage'

// 报名与两级审核：列表按登录角色数据域返回（city 本区域 / school 本队 / admin 全省）。
// 读失败（未登录/网络异常）返回 null，页面展示空态；
// 审核/删除失败抛 ApiError，页面展示后端 message（驳回必填原因等）。

/** 报名状态机：pending_city_review → pending_province_review → approved / rejected */
export type RegistrationStatus = 'pending_city_review' | 'pending_province_review' | 'approved' | 'rejected'

/** 列表项 GET /api/registrations/（RegistrationListSerializer） */
export interface RegistrationList {
  id: number
  tournament_name: string
  team: number | null
  team_name: string
  group_type: string
  group_type_display: string
  city_code: string
  city_name: string
  leader_name: string
  phone: string
  player_count: number
  coach_name: string
  status: RegistrationStatus
  status_display: string
  submit_time: string
}

/** 审核记录（ReviewLog） */
export interface ReviewLogItem {
  id: number
  stage: string
  result: 'approve' | 'reject'
  reason: string
  operator_name: string
  created_at: string
}

/** 详情（含球员名单/附件/审核记录） */
export interface RegistrationDetail extends RegistrationList {
  remark: string
  review_logs: ReviewLogItem[]
  registration_players: { id: number; name: string; id_card: string; jersey_number: number | null; position: string }[]
  player_excel: string | null
  photo_zip: string | null
  stamp_file: string | null
  updated_at: string
}

/** 读失败回退 null：调用方据此展示空态 */
async function tryList<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch {
    return null
  }
}

export function fetchRegistrations(params?: Record<string, unknown>) {
  return tryList(() => getPage<RegistrationList>('/api/registrations/', { page_size: 100, ...params }))
}

export function fetchRegistrationDetail(id: number) {
  return tryList(() => api.get<never, RegistrationDetail>(`/api/registrations/${id}/`))
}

/** 审核记录（含驳回原因），用户端「查看审核」与管理端详情共用 */
export function fetchReviewLogs(id: number) {
  return tryList(() => api.get<never, ReviewLogItem[]>(`/api/registrations/${id}/review-logs/`))
}

/** 初审（市州）：approve → 待终审；reject → 已驳回（reason 必填） */
export function firstReview(id: number, result: 'approve' | 'reject', reason = '') {
  return api.post<never, unknown>(`/api/registrations/${id}/first-review/`, { result, reason })
}

/** 终审（省级）：approve → 已通过并进入公示 */
export function finalReview(id: number, result: 'approve' | 'reject', reason = '') {
  return api.post<never, unknown>(`/api/registrations/${id}/final-review/`, { result, reason })
}

/** 球队修改/删除自己的报名：仅待初审或已驳回状态（后端校验） */
export function deleteRegistration(id: number) {
  return api.delete(`/api/registrations/${id}/`)
}

/** 报名信息表下载（后端输出 CSV，Excel/WPS 可开）：带 token 拉流后触发浏览器保存 */
export async function downloadRegistrationWord(id: number, teamName: string) {
  const blob = await api.get<never, Blob>(`/api/registrations/${id}/download/word/`, { responseType: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `报名信息表-${teamName || id}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ---------- 赛事下拉与报名提交 ----------

export interface ApiTournamentOption {
  id: number
  name: string
  /** 赛事覆盖的组别（JSON 数组，如 ['primary','middle']） */
  group_types: string[] | string
  organizer: string
  sign_start_at: string | null
  sign_end_at: string | null
  status: string
  status_display: string
  [key: string]: unknown
}

/** 赛事列表（报名表单下拉）GET /api/portal/tournaments/ */
export function fetchTournaments() {
  return tryList(() => getPage<ApiTournamentOption>('/api/portal/tournaments/', { page_size: 50 }))
}

/** 球队提交报名（后端置状态为待初审；school 只能为本人的球队提交） */
export function createRegistration(payload: {
  tournament: number
  team: number
  group_type: string
  leader_name: string
  phone: string
  player_count: number
  coach_name: string
  remark?: string
}) {
  return api.post<never, RegistrationDetail>('/api/registrations/', payload)
}

// ---------- 附件上传（multipart） ----------

/** 上传报名附件：POST multipart /upload/（field 为 player_excel / photo_zip / stamp_file 之一，不改审核状态） */
export function uploadRegistrationFile(
  id: number,
  field: 'player_excel' | 'photo_zip' | 'stamp_file',
  file: File,
) {
  const fd = new FormData()
  fd.append('field', field)
  fd.append('file', file)
  return api.post<never, RegistrationDetail>(`/api/registrations/${id}/upload/`, fd)
}

/** 通用文件上传 POST /api/common/upload/（form-data file + scene，返回 url/path/name） */
export function uploadCommonFile(file: File, scene: string) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('scene', scene)
  return api.post<never, { url: string; path: string; name: string }>('/api/common/upload/', fd)
}

export { errMsg }
