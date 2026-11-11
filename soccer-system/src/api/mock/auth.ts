import { ApiError } from '../error'
import type { AuthApi, LoginEntry, LoginInput, LoginResult, RegisterInput } from '../types'
import type { UserRole } from '../../stores/auth'
import { DEMO_ACCOUNTS, findRegistered, insertRegistered, isAccountTaken, personaLabelOf, verifyRegistered } from './db'
import { clearCurrentSession, issueSession, readCurrentSession } from './session'

// 模拟认证服务：接口签名与真实后端一致，页面通过 authApi 调用
// 关闭接口版本 —— 不发起任何网络请求，仅校验本地演示账号 / 注册账号

const MAX_ATTEMPTS = 5
const LOCK_MS = 15 * 60 * 1000
const GUARD_KEY = 'soccer-login-guard'

interface LoginGuard {
  fails: number
  lockedUntil: number
}


/** 判断账号角色是否可以从指定入口登录：管理员入口接受校级、普通管理员与超级管理员 */
function canEnterEntry(role: UserRole, entry: LoginEntry) {
  // 校级管理员与管理端统一入口：三端账号共用 /admin/login
  return entry === 'user' ? role === 'user' : role === 'admin' || role === 'super' || role === 'school'
}

/** 模拟网络延迟，让 loading / 成功提示的交互节奏接近真实接口 */
function delay(ms = 320) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------- 登录失败计数与锁定 ----------

function readGuards(): Record<string, LoginGuard> {
  try {
    const raw = localStorage.getItem(GUARD_KEY)
    return raw ? (JSON.parse(raw) as Record<string, LoginGuard>) : {}
  } catch {
    return {}
  }
}

function writeGuards(guards: Record<string, LoginGuard>) {
  try {
    localStorage.setItem(GUARD_KEY, JSON.stringify(guards))
  } catch {
    // 写入失败时退化为仅本次页面内生效
  }
}

/** 返回剩余锁定时间（毫秒），0 表示未锁定 */
function lockedMs(accountKey: string): number {
  const guard = readGuards()[accountKey]
  if (!guard) return 0
  if (guard.lockedUntil <= Date.now()) return 0
  return guard.lockedUntil - Date.now()
}

function recordFailure(accountKey: string): LoginGuard {
  const guards = readGuards()
  const current = guards[accountKey] ?? { fails: 0, lockedUntil: 0 }
  const next: LoginGuard = { fails: current.fails + 1, lockedUntil: 0 }
  if (next.fails >= MAX_ATTEMPTS) next.lockedUntil = Date.now() + LOCK_MS
  guards[accountKey] = next
  writeGuards(guards)
  return next
}

function resetFailures(accountKey: string) {
  const guards = readGuards()
  if (!guards[accountKey]) return
  delete guards[accountKey]
  writeGuards(guards)
}

// ---------- 账号解析 ----------

/** 内部解析结果：在对外返回结构上附带密码校验函数 */
type ResolvedAccount = LoginResult & { verify: (input: string) => Promise<boolean> }

async function resolveAccount(account: string): Promise<ResolvedAccount | null> {
  const key = account.trim().toLowerCase()

  const demo = DEMO_ACCOUNTS.find((d) => d.account.toLowerCase() === key)
  if (demo) {
    return {
      role: demo.role,
      persona: demo.persona,
      account: demo.account,
      label: demo.label,
      schoolCode: demo.schoolCode,
      schoolName: demo.schoolName,
      permissions: demo.permissions,
      city: demo.city,
      district: demo.district,
      verify: async (input) => input === demo.password,
    }
  }

  const registered = findRegistered(account)
  if (registered) {
    return {
      role: 'user',
      persona: registered.persona,
      account: registered.account,
      label: `用户端 · ${personaLabelOf[registered.persona]}`,
      verify: (input) => verifyRegistered(registered, input),
    }
  }

  return null
}

export const mockAuthApi: AuthApi = {
  listDemoAccounts(entry: LoginEntry) {
    return DEMO_ACCOUNTS.filter((d) => canEnterEntry(d.role, entry))
  },

  async login({ account, password, entry }: LoginInput): Promise<LoginResult> {
    await delay()
    const accountKey = account.trim().toLowerCase() || '__empty__'

    const remaining = lockedMs(accountKey)
    if (remaining > 0) {
      const minutes = Math.ceil(remaining / 60000)
      throw new ApiError(1004, `登录尝试过于频繁，请 ${minutes} 分钟后再试`)
    }

    const found = await resolveAccount(account)
    const matched = found ? await found.verify(password) : false

    // 账号不存在与密码错误统一提示，避免被用来枚举账号
    if (!found || !matched) {
      const guard = recordFailure(accountKey)
      const tail =
        guard.fails >= MAX_ATTEMPTS
          ? `，连续失败 ${MAX_ATTEMPTS} 次，已锁定 15 分钟`
          : '，请重新输入'
      throw new ApiError(1001, `账号或密码错误${tail}`)
    }

    // 密码校验通过后再校验入口，提示不区分具体角色
    if (!canEnterEntry(found.role, entry)) {
      throw new ApiError(1003, '该账号无权从此入口登录，请返回正确的登录入口')
    }

    resetFailures(accountKey)
    const result: LoginResult = {
      role: found.role,
      persona: found.persona,
      account: found.account,
      label: found.label,
      schoolCode: found.schoolCode,
      schoolName: found.schoolName,
      permissions: found.permissions,
      city: found.city,
      district: found.district,
    }
    issueSession(result)
    return result
  },

  async register(input: RegisterInput): Promise<LoginResult> {
    await delay(420)
    const account = input.username.trim()
    if (!/^[A-Za-z0-9_-]{3,20}$/.test(account)) {
      throw new ApiError(2002, '用户名需为 3-20 位字母、数字、下划线或短横线')
    }
    const email = input.email.trim()
    if (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(2003, '请输入正确的邮箱地址')
    }
    if (input.password.length < 6 || input.password.length > 64) {
      throw new ApiError(2004, '密码长度需为 6-64 位')
    }
    if (isAccountTaken(account)) {
      throw new ApiError(2001, '该账号已被注册，请换一个用户名')
    }
    await insertRegistered({ ...input, username: account })
    const result: LoginResult = {
      role: 'user',
      persona: input.persona,
      account,
      label: `用户端 · ${personaLabelOf[input.persona]}`,
    }
    issueSession(result)
    return result
  },

  async restore(): Promise<LoginResult | null> {
    const found = readCurrentSession()
    if (!found) return null
    return {
      role: found.role,
      persona: found.persona,
      account: found.account,
      label: found.label,
      schoolCode: found.schoolCode,
      schoolName: found.schoolName,
      permissions: found.permissions,
    }
  },

  clearSession() {
    try {
      clearCurrentSession()
      // 清掉旧版本可能残留的角色缓存，避免被篡改后继续生效
      sessionStorage.removeItem('soccer-auth')
    } catch {
      // 忽略隐私模式下的存储异常
    }
    // 同时清除真实接口可能残留的凭证，避免切换模式后串号
    sessionStorage.removeItem('soccer-token')
    sessionStorage.removeItem('soccer-refresh-token')
  },
}
