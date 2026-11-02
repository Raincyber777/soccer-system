import { reactive } from 'vue'
import { clearAuthSession } from '../api/auth'

// 登录状态：JWT 走后端 /api/auth/*（token 由 api/auth.ts 写入 sessionStorage），
// 登录态本体存 sessionStorage 供刷新恢复
export type UserRole = 'user' | 'admin' | 'super'

// 用户端登录身份：决定用户端菜单可见性（运动员中心/教练员中心按身份显示）
export type UserPersona = 'leader' | 'student' | 'coach'

export const roleLabels: Record<UserRole, string> = {
  user: '用户端用户',
  admin: '普通管理员',
  super: '超级管理员',
}

export const personaLabels: Record<UserPersona, string> = {
  leader: '球队负责人',
  student: '学生运动员',
  coach: '教练员',
}

interface AuthState {
  role: UserRole | null
  persona: UserPersona | null
  account: string
  /** 后端登录返回的管理端身份「角色 · 所属机构」，用户端为空串 */
  staffLabel: string
}

const STORAGE_KEY = 'soccer-auth'

function loadState(): AuthState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      // 旧版本登录态没有 staffLabel 字段，用默认值兜底
      const parsed = JSON.parse(raw) as Partial<AuthState>
      return { role: null, persona: null, account: '', staffLabel: '', ...parsed }
    }
  } catch {
    // 解析失败按未登录处理
  }
  return { role: null, persona: null, account: '', staffLabel: '' }
}

const state = reactive<AuthState>(loadState())

function saveState() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // 隐私模式等场景下允许失败，仅影响刷新后的登录态
  }
}

export function useAuth() {
  function loginAs(role: UserRole, account: string, persona: UserPersona = 'leader', staffLabel = '') {
    state.role = role
    state.account = account
    // 只有用户端区分身份，管理端身份清空（顶栏展示 staffLabel）
    state.persona = role === 'user' ? persona : null
    state.staffLabel = role === 'user' ? '' : staffLabel
    saveState()
  }

  function logout() {
    state.role = null
    state.persona = null
    state.account = ''
    state.staffLabel = ''
    // 登出同步清 JWT，避免残留 access 继续被请求拦截器注入
    clearAuthSession()
    saveState()
  }

  return { state, roleLabels, personaLabels, loginAs, logout }
}
