import { ApiError } from '../error'
import type { AuthApi, LoginEntry, LoginInput, LoginResult, RegisterInput } from '../types'
import { api, clearTokens, setTokens } from './client'

// 真实认证接口：手机号走统一登录，邮箱走管理员登录
// 后端角色：admin/province/city/school/athlete/coach/personal

interface ApiProfile {
  id: number
  name?: string
  phone?: string | null
  school_id?: number
  city_id?: number
  county?: string
  team_id?: number | null
  jersey_no?: number | null
  position?: string | null
  status?: string
  reject_reason?: string | null
}

interface ApiUser {
  id: number
  name: string
  phone: string | null
  email: string | null
  role: string
  role_display: string
  status: string
  is_admin: boolean
  permissions: string[]
  profile: ApiProfile | null
  date_joined: string
}

interface AuthSession {
  token: string
  access: string
  refresh: string
  token_type: string
  user: ApiUser
}

const REGISTER_ROLE: Record<RegisterInput['persona'], string> = {
  leader: 'personal',
  student: 'athlete',
  coach: 'coach',
}

const PHONE_RE = /^1[3-9]\d{9}$/
const LIVE_SESSION_KEY = 'soccer-live-session'

function cacheLiveSession(result: LoginResult) {
  try {
    sessionStorage.setItem(LIVE_SESSION_KEY, JSON.stringify(result))
  } catch {
    // 隐私模式失败时不影响真实登录
  }
}

function accountOf(user: ApiUser): string {
  return user.phone || user.email || user.name
}

export function mapUser(user: ApiUser): LoginResult {
  const schoolCode = user.profile?.school_id ? String(user.profile.school_id) : undefined
  const schoolName = user.role === 'school' ? user.profile?.name : undefined
  const district = user.profile?.county || undefined

  switch (user.role) {
    case 'admin':
    case 'province':
      return {
        role: 'super',
        account: accountOf(user),
        label: '超级管理员端 · 省级管理员',
        permissions: user.permissions,
      }
    case 'city':
      return {
        role: 'admin',
        account: accountOf(user),
        label: '管理端 · 市州管理员',
        city: '',
        permissions: user.permissions,
      }
    case 'county':
      return {
        role: 'admin',
        account: accountOf(user),
        label: '管理端 · 区县管理员',
        district,
        permissions: user.permissions,
      }
    case 'school':
      return {
        role: 'school',
        account: accountOf(user),
        label: '校级管理员端',
        schoolCode,
        schoolName,
        permissions: user.permissions,
      }
    case 'athlete':
      return {
        role: 'user',
        persona: 'student',
        account: accountOf(user),
        label: '用户端 · 学生运动员',
        permissions: user.permissions,
      }
    case 'coach':
      return {
        role: 'user',
        persona: 'coach',
        account: accountOf(user),
        label: '用户端 · 教练员',
        permissions: user.permissions,
      }
    default:
      return {
        role: 'user',
        persona: 'leader',
        account: accountOf(user),
        label: '用户端 · 球队负责人',
        schoolName: user.profile?.name,
        district,
        permissions: user.permissions,
      }
  }
}

function saveSession(session: AuthSession) {
  setTokens(session.access || session.token, session.refresh)
}

function assertEntry(result: LoginResult, entry: LoginEntry) {
  const allowed =
    entry === 'user'
      ? result.role === 'user'
      : result.role === 'admin' || result.role === 'super' || result.role === 'school'
  if (!allowed) {
    throw new ApiError(1003, '该账号不属于当前登录入口，请确认账号类型')
  }
}

export const liveAuthApi: AuthApi = {
  listDemoAccounts() {
    return []
  },

  async login({ account, password, entry }: LoginInput): Promise<LoginResult> {
    const trimmed = account.trim()
    const path = trimmed.includes('@') ? '/api/admin/auth/login' : '/api/auth/login'
    const payload = trimmed.includes('@')
      ? { email: trimmed, password }
      : { phone: trimmed, password }

    const session = await api.post<AuthSession>(path, payload)
    const result = mapUser(session.user)
    // 先校验入口再落盘 token，避免入口不符时留下无效会话
    assertEntry(result, entry)
    saveSession(session)
    sessionStorage.setItem('soccer-role', result.role)
    cacheLiveSession(result)
    return result
  },

  async register(input: RegisterInput): Promise<LoginResult> {
    const phone = input.username.trim()
    if (!PHONE_RE.test(phone)) {
      throw new ApiError(10001, '注册账号需使用 11 位手机号')
    }
    const session = await api.post<AuthSession>('/api/auth/register', {
      name: phone,
      phone,
      password: input.password,
      role: REGISTER_ROLE[input.persona],
    })
    saveSession(session)
    const result = mapUser(session.user)
    sessionStorage.setItem('soccer-role', result.role)
    cacheLiveSession(result)
    return result
  },

  async restore(): Promise<LoginResult | null> {
    try {
      const user = await api.get<ApiUser>('/api/auth/me')
      const result = mapUser(user)
      sessionStorage.setItem('soccer-role', result.role)
      cacheLiveSession(result)
      return result
    } catch {
      clearTokens()
      return null
    }
  },

  clearSession() {
    clearTokens()
    sessionStorage.removeItem('soccer-role')
    sessionStorage.removeItem(LIVE_SESSION_KEY)
  },
}
