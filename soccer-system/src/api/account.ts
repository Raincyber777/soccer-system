import { api, getPage } from './client'
import { errMsg } from './manage'

// 账户管理 /api/admin/users/：city 只见本区域、admin 全省（后端 apply_region_scope）。
// 删除账户仅 admin 角色可执行；重置密码与禁用/启用为独立 action（POST）。
// 读失败返回 null（页面保留演示数据），写失败抛 ApiError 由页面提示。

export interface ApiUser {
  id: number
  username: string
  role: string
  role_display: string
  persona: string
  real_name: string
  phone: string
  email: string
  region_code: string | null
  region_name: string
  unit_name: string
  is_active: boolean
  is_superuser: boolean
  date_joined: string
}

export interface UserCreatePayload {
  username: string
  password: string
  real_name?: string
  role: string
  unit_name?: string
  phone?: string
  /** 所属市州区划码：省本级账户可不传（city 开户会被后端强制归属本区域） */
  region_code?: string
}

export interface UserUpdatePayload {
  real_name?: string
  unit_name?: string
  phone?: string
  region_code?: string
}

/** 读失败回退 null：调用方据此决定是否保留本地演示行 */
async function tryList<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch {
    return null
  }
}

/** 账户列表（分页；keyword/role/status 过滤由后端处理） */
export function fetchUsers(params?: Record<string, unknown>) {
  return tryList(() => getPage<ApiUser>('/api/admin/users/', { page_size: 100, ...params }))
}

export function createUser(payload: UserCreatePayload) {
  return api.post<never, ApiUser>('/api/admin/users/', payload)
}

export function updateUser(id: number, payload: UserUpdatePayload) {
  return api.patch<never, ApiUser>(`/api/admin/users/${id}/`, payload)
}

/** 删除账户：仅省级管理员（admin）可执行，后端校验 */
export function deleteUser(id: number) {
  return api.delete(`/api/admin/users/${id}/`)
}

/** 重置密码为初始密码（123456），返回后端提示文案 */
export function resetUserPassword(id: number) {
  return api.post<never, { detail: string }>(`/api/admin/users/${id}/reset-password/`)
}

/** 禁用/启用账户（可逆），返回切换后的状态 */
export function toggleUserActive(id: number) {
  return api.post<never, { detail: string; is_active: boolean }>(`/api/admin/users/${id}/toggle-active/`)
}

export { errMsg }
