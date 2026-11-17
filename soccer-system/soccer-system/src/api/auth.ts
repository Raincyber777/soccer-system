import { api, TOKEN_KEY } from './client'
import type { UserPersona, UserRole } from '../stores/auth'

// 认证接口：登录 / 注册换 JWT，token 写入 sessionStorage，按后端角色映射前端三端
// 契约：《赛事系统前端接口需求文档》§1——POST /api/auth/login/、/api/auth/register/

/** 后端 UserSerializer 输出（登录/注册响应 data.user） */
export interface ApiUser {
  id: number
  username: string
  role: string
  role_display: string
  persona: string
  real_name: string
  phone: string
  email: string
  region_code: string
  region_name: string
  unit_name: string
  is_active: boolean
  is_superuser: boolean
  date_joined: string
}

/** 登录/注册响应 data：JWT 对 + 用户信息，access 有效期 2 小时 */
export interface AuthSession {
  access: string
  refresh: string
  token_type: string
  expires_in: number
  user: ApiUser
}

/** 注册载荷：仅开放用户端三种身份（leader→school / student→athlete / coach→coach） */
export interface RegisterPayload {
  username: string
  password: string
  role: 'school' | 'athlete' | 'coach'
  school_code: string
  email?: string
  phone?: string
  real_name?: string
}

const REFRESH_KEY = 'soccer-refresh-token'

/** 登录态落盘：access 供请求拦截器注入 Bearer，refresh 备后续续期 */
export function saveAuthSession(session: AuthSession) {
  sessionStorage.setItem(TOKEN_KEY, session.access)
  sessionStorage.setItem(REFRESH_KEY, session.refresh)
}

/** 登出清 token，避免残留 access 继续被注入请求头 */
export function clearAuthSession() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_KEY)
}

export function apiLogin(username: string, password: string) {
  return api.post<never, AuthSession>('/api/auth/login/', { username, password })
}

export function apiRegister(payload: RegisterPayload) {
  return api.post<never, AuthSession>('/api/auth/register/', payload)
}

/** 登录成功后写入前端登录态所需的一切 */
export interface MappedLogin {
  role: UserRole
  persona?: UserPersona
  /** 管理端顶栏身份标签「角色 · 所属机构」，用户端留空 */
  staffLabel: string
  realName: string
}

/**
 * 后端角色 → 前端三端映射：
 * admin（省最高）→ /super；city（市州，region_code 数据域）→ /admin；
 * school/athlete/coach → /user 三身份；province 为保留角色，按省级处理。
 */
export function mapBackendUser(user: ApiUser): MappedLogin {
  const org = user.unit_name || user.region_name || ''
  const staffLabel = org ? `${user.role_display} · ${org}` : user.role_display
  const realName = user.real_name || user.username
  switch (user.role) {
    case 'admin':
      return { role: 'super', staffLabel, realName }
    case 'province':
      return { role: 'super', staffLabel: org ? staffLabel : '省级管理员 · 省本级', realName }
    case 'city':
      return { role: 'admin', staffLabel, realName }
    case 'athlete':
      return { role: 'user', persona: 'student', staffLabel: '', realName }
    case 'coach':
      return { role: 'user', persona: 'coach', staffLabel: '', realName }
    case 'school':
    default:
      return { role: 'user', persona: 'leader', staffLabel: '', realName }
  }
}
