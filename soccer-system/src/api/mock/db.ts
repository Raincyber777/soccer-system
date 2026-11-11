import type { DemoAccount, RegisterInput } from '../types'
import type { UserPersona } from '../../stores/auth'
import { ApiError } from '../error'

// 本地模拟数据库：开发环境演示账号 + 已注册账号
// 演示账号仅在开发环境内置，生产构建会被 Vite 静态求值后整段剔除，避免凭据进入 dist
// 注册账号的密码使用 PBKDF2 派生后写入 localStorage，不保存明文

/** 校级账号默认权限点：角色默认 + 管理员追加，去重叠加 */
export const SCHOOL_ADMIN_PERMISSIONS = [
  'live:match:view',
  'live:match:create',
  'live:match:update',
  'live:match:delete',
  'live:event:manage',
  'live:referee:manage',
  'live:file:manage',
  'live:link:manage',
  'live:face:manage',
]

const DEV_DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'user',
    persona: 'leader',
    icon: 'user',
    label: '用户端 · 球队负责人',
    account: 'user001',
    password: '123456',
    city: '成都市',
    district: '成华区',
  },
  {
    role: 'user',
    persona: 'student',
    icon: 'user',
    label: '用户端 · 学生运动员',
    account: 'student001',
    password: '123456',
    city: '成都市',
    district: '成华区',
  },
  {
    role: 'user',
    persona: 'coach',
    icon: 'user',
    label: '用户端 · 教练员',
    account: 'coach001',
    password: '123456',
    city: '成都市',
    district: '成华区',
  },
  {
    role: 'admin',
    icon: 'shield',
    label: '管理端 · 普通管理员',
    account: 'admin001',
    password: '123456',
    city: '成都市',
  },
  {
    role: 'super',
    icon: 'crown',
    label: '超级管理员端 · 超级管理员',
    account: 'super001',
    password: '123456',
  },
  {
    role: 'school',
    icon: 'shield',
    label: '校级端 · 校级管理员',
    account: 'school001',
    password: '123456',
    schoolCode: '5101080009',
    schoolName: '成都市实验中学',
    permissions: SCHOOL_ADMIN_PERMISSIONS,
    city: '成都市',
    district: '成华区',
  },
]

/** 生产构建下为空数组：演示账号只在开发环境可用 */
export const DEMO_ACCOUNTS: DemoAccount[] = import.meta.env.DEV ? DEV_DEMO_ACCOUNTS : []

/** 本地已注册账号结构（password 字段仅用于兼容旧版明文数据迁移） */
export interface RegisteredUser {
  account: string
  email: string
  school: string
  schoolCode: string
  persona: UserPersona
  /** PBKDF2 派生出的密码摘要 */
  passwordHash?: string
  /** 每个账号独立的随机盐 */
  salt?: string
  /** 旧版本遗留的明文密码，首次登录成功后会被迁移并删除 */
  password?: string
}

const REGISTERED_KEY = 'soccer-registered-users'
const PBKDF2_ITERATIONS = 10_000

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
    // 隐私模式等场景下允许写入失败，仅影响下次打开页面时的本地账号
  }
}

export function findRegistered(account: string): RegisteredUser | undefined {
  const key = account.trim().toLowerCase()
  return loadRegistered().find((u) => u.account.toLowerCase() === key)
}

export function isAccountTaken(account: string): boolean {
  const key = account.trim().toLowerCase()
  return (
    DEMO_ACCOUNTS.some((d) => d.account.toLowerCase() === key) ||
    loadRegistered().some((u) => u.account.toLowerCase() === key)
  )
}

function randomSalt(): string {
  const bytes = new Uint8Array(16)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** 使用 PBKDF2 派生密码摘要；非安全上下文（如局域网 http）直接拒绝，避免降级为明文 */
async function derivePassword(password: string, salt: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new ApiError(9001, '当前访问地址不支持安全加密，请使用 localhost 或 HTTPS 访问')
  }
  const encoder = new TextEncoder()
  const key = await subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  )
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function insertRegistered(payload: RegisterInput): Promise<void> {
  const salt = randomSalt()
  const passwordHash = await derivePassword(payload.password, salt)
  const list = loadRegistered()
  list.push({
    account: payload.username,
    email: payload.email,
    school: payload.school,
    schoolCode: payload.schoolCode,
    persona: payload.persona,
    salt,
    passwordHash,
  })
  saveRegistered(list)
}

/** 校验注册账号密码；旧版明文记录会在首次校验时迁移为 PBKDF2 摘要 */
export async function verifyRegistered(user: RegisteredUser, password: string): Promise<boolean> {
  if (user.password) {
    const salt = randomSalt()
    const passwordHash = await derivePassword(user.password, salt)
    const migrated = loadRegistered().map((u) =>
      u.account.toLowerCase() === user.account.toLowerCase()
        ? {
            account: u.account,
            email: u.email,
            school: u.school,
            schoolCode: u.schoolCode,
            persona: u.persona,
            salt,
            passwordHash,
          }
        : u,
    )
    saveRegistered(migrated)
    return user.password === password
  }
  if (!user.salt || !user.passwordHash) return false
  return (await derivePassword(password, user.salt)) === user.passwordHash
}

export const personaLabelOf: Record<UserPersona, string> = {
  leader: '球队负责人',
  student: '学生运动员',
  coach: '教练员',
}
