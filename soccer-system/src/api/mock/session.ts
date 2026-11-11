import { ApiError } from '../error'
import type { LoginResult } from '../types'
import type { UserPersona, UserRole } from '../../stores/auth'

// mock 会话存储：登录后签发随机令牌，sessionStorage 只保存 token
// 说明：纯前端无法真正防止篡改，接入后端后必须由服务端校验令牌

const SESSION_KEY = 'soccer-session'
const STORE_KEY = 'soccer-session-store'
const SESSION_TTL = 8 * 60 * 60 * 1000

export interface MockSession {
  token: string
  role: UserRole
  persona?: UserPersona
  account: string
  label: string
  /** 校级管理员绑定的学校与生效权限点 */
  schoolCode?: string
  schoolName?: string
  permissions?: string[]
  /** 数据范围：市州 / 区县 */
  city?: string
  district?: string
  expiresAt: number
}

export function readSessions(): MockSession[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as MockSession[]
    return list.filter((s) => s.expiresAt > Date.now())
  } catch {
    return []
  }
}

export function writeSessions(list: MockSession[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list))
  } catch {
    // 存储失败时仅影响刷新后的登录态
  }
}

function newToken(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
}

export function issueSession(result: LoginResult) {
  const token = newToken()
  const sessions = readSessions()
  sessions.push({
    token,
    role: result.role,
    persona: result.persona,
    account: result.account,
    label: result.label,
    schoolCode: result.schoolCode,
    schoolName: result.schoolName,
    permissions: result.permissions,
    city: result.city,
    district: result.district,
    expiresAt: Date.now() + SESSION_TTL,
  })
  writeSessions(sessions)
  try {
    sessionStorage.setItem(SESSION_KEY, token)
  } catch {
    // 隐私模式失败时保持内存登录态
  }
}

/** 读取当前标签页的有效会话，令牌不存在或过期时返回 null */
export function readCurrentSession(): MockSession | null {
  const token = sessionStorage.getItem(SESSION_KEY)
  if (!token) return null
  const found = readSessions().find((s) => s.token === token)
  if (!found) {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
  return found
}

/** mock 接口内部使用：无会话时直接拒绝，避免身份由调用方传参决定 */
export function requireSession(): MockSession {
  const session = readCurrentSession()
  if (session) return session

  // 真实接口模式下没有 mock 会话：以真实登录态兜底，避免混用的 mock 接口误报 401
  try {
    const raw = sessionStorage.getItem('soccer-live-session')
    if (raw) {
      const live = JSON.parse(raw) as LoginResult
      return {
        token: 'live',
        role: live.role,
        persona: live.persona,
        account: live.account,
        label: live.label,
        schoolCode: live.schoolCode,
        schoolName: live.schoolName,
        permissions: live.permissions,
        city: live.city,
        district: live.district,
        expiresAt: Date.now() + SESSION_TTL,
      }
    }
  } catch {
    // 解析失败按未登录处理
  }
  throw new ApiError(401, '登录状态已失效，请重新登录')
}

export function clearCurrentSession() {
  const token = sessionStorage.getItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
  if (token) writeSessions(readSessions().filter((s) => s.token !== token))
}
