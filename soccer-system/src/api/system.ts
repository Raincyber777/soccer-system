import { api, getPage } from './client'
import { errMsg } from './manage'

// 操作日志（管理端）与系统参数（省级管理）：
// 日志按登录角色数据域返回（city 只见本区域账号操作）；
// 系统参数读需登录、改仅管理员。

export interface ApiAuditLog {
  id: number
  account: string
  role: string
  action: string
  ip: string | null
  created_at: string
}

/** 操作日志（后端支持 keyword/date_from/date_to 过滤） */
export function fetchAuditLogs(params?: Record<string, unknown>) {
  return getPage<ApiAuditLog>('/api/admin/audit-logs/', params).catch(() => null)
}

export interface ApiSystemConfig {
  id: number
  key: string
  name: string
  description: string
  value: string
  updated_at: string
}

/** 系统参数（无分页，data 直接是数组） */
export function fetchSystemConfigs() {
  return api.get<never, ApiSystemConfig[]>('/api/common/configs/').catch(() => null)
}

export function updateSystemConfig(id: number, value: string) {
  return api.patch<never, ApiSystemConfig>(`/api/common/configs/${id}/`, { value })
}

export { errMsg }
