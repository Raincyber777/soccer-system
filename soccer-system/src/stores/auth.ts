import { reactive } from 'vue'

// 全局模拟登录状态（没有后端，先用模块级变量保存当前登录角色）
// 接入后端后可替换为真实登录接口 + token
// 状态写入 sessionStorage：刷新页面后登录态不丢，路由守卫才能正常工作
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

// 管理端/超管端演示账号的具体身份（顶栏「端标签」旁展示）：角色 · 所属机构
// 接入后端后由登录接口按账号返回，无需前端映射
export const STAFF_IDENTITY: Record<string, string> = {
  admin001: '市州管理员 · 成都市教育局',
  super001: '省级管理员 · 省本级',
}

interface AuthState {
  role: UserRole | null
  persona: UserPersona | null
  account: string
}

const STORAGE_KEY = 'soccer-auth'

function loadState(): AuthState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as AuthState
    }
  } catch {
    // 解析失败按未登录处理
  }
  return { role: null, persona: null, account: '' }
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
  function loginAs(role: UserRole, account: string, persona: UserPersona = 'leader') {
    state.role = role
    state.account = account
    // 只有用户端区分身份，管理端身份清空
    state.persona = role === 'user' ? persona : null
    saveState()
  }

  function logout() {
    state.role = null
    state.persona = null
    state.account = ''
    saveState()
  }

  return { state, roleLabels, personaLabels, loginAs, logout }
}
