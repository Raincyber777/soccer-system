import { personaLabels, type UserPersona, type UserRole } from '../../stores/auth'

// 登录/注册共用的"账号库"逻辑：演示账号 + localStorage 注册表
// 目前没有后端，用本地数据模拟按账号识别角色；接入接口时替换这里

// 演示账号（内置"账号库"）：登录时按账号反查角色与身份
export interface DemoAccount {
  role: UserRole
  persona?: UserPersona
  icon: string
  label: string
  account: string
  password: string
}

export const demoAccounts: DemoAccount[] = [
  { role: 'user', persona: 'leader', icon: 'user', label: '用户端 · 球队负责人', account: 'user001', password: '123456' },
  { role: 'user', persona: 'student', icon: 'user', label: '用户端 · 学生运动员', account: 'student001', password: '123456' },
  { role: 'user', persona: 'coach', icon: 'user', label: '用户端 · 教练员', account: 'coach001', password: '123456' },
  { role: 'admin', icon: 'shield', label: '管理员端 · 普通管理员', account: 'admin001', password: '123456' },
  { role: 'super', icon: 'crown', label: '超级管理员端 · 超级管理员', account: 'super001', password: '123456' },
]

// 已注册的参赛账号保存在 localStorage，模拟后端账号库；接入后端时替换这里
export interface RegisteredUser {
  account: string
  password: string
  school: string
  schoolCode: string
  email: string
  persona: UserPersona
}

const REGISTERED_KEY = 'soccer-registered-users'

export function loadRegistered(): RegisteredUser[] {
  try {
    const raw = localStorage.getItem(REGISTERED_KEY)
    return raw ? (JSON.parse(raw) as RegisteredUser[]) : []
  } catch {
    return []
  }
}

export function saveRegistered(list: RegisteredUser[]) {
  try {
    localStorage.setItem(REGISTERED_KEY, JSON.stringify(list))
  } catch {
    /* 忽略存储异常（如隐私模式） */
  }
}

export interface ResolvedAccount {
  role: UserRole
  persona: UserPersona
  password: string
  label: string
}

// 账号解析：先查内置演示账号，再查本地已注册账号；都查不到说明账号不存在
export function resolveAccount(account: string): ResolvedAccount | null {
  const key = account.trim().toLowerCase()
  const demo = demoAccounts.find((d) => d.account.toLowerCase() === key)
  if (demo) {
    return { role: demo.role, persona: demo.persona ?? 'leader', password: demo.password, label: demo.label }
  }
  const registered = loadRegistered().find((u) => u.account.toLowerCase() === key)
  if (registered) {
    return {
      role: 'user',
      persona: registered.persona,
      password: registered.password,
      label: `用户端 · ${personaLabels[registered.persona]}`,
    }
  }
  return null
}

export function dashboardPath(role: UserRole) {
  return role === 'super' ? '/super/dashboard' : role === 'admin' ? '/admin/dashboard' : '/user/dashboard'
}

export const roleTexts: Record<UserRole, string> = {
  user: '用户端',
  admin: '管理员端',
  super: '超级管理员端',
}
