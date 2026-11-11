import { reactive } from 'vue'
import { authApi, type LoginResult } from '../api'

// 全局登录状态：由认证接口恢复，页面只读取这里的 role / persona
// 登录态不再把 role 直接写进 sessionStorage，避免通过 DevTools 改字段直接提权
export type UserRole = 'user' | 'admin' | 'super' | 'school'

// 用户端登录身份：决定用户端菜单可见性（运动员中心/教练员中心按身份显示）
export type UserPersona = 'leader' | 'student' | 'coach'

export const roleLabels: Record<UserRole, string> = {
  user: '用户端用户',
  admin: '普通管理员',
  super: '超级管理员',
  school: '校级管理员',
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
  school001: '校级管理员 · 成都市实验中学',
}

interface AuthState {
  role: UserRole | null
  persona: UserPersona | null
  account: string
  /** 校级管理员绑定的学校 */
  schoolCode: string
  schoolName: string
  /** 生效权限点：校级菜单与接口按权限点放行 */
  permissions: string[]
  /** 数据范围：市州 / 区县 */
  city: string
  district: string
}

const state = reactive<AuthState>({
  role: null,
  persona: null,
  account: '',
  schoolCode: '',
  schoolName: '',
  permissions: [],
  city: '',
  district: '',
})

function applyResult(result: LoginResult) {
  state.role = result.role
  state.persona = result.role === 'user' ? result.persona ?? 'leader' : null
  state.account = result.account
  state.schoolCode = result.schoolCode ?? ''
  state.schoolName = result.schoolName ?? ''
  state.permissions = result.permissions ?? []
  state.city = result.city ?? ''
  state.district = result.district ?? ''
}

let restored = false
let restoring: Promise<void> | null = null

export function useAuth() {
  function loginAs(role: UserRole, account: string, persona: UserPersona = 'leader') {
    state.role = role
    state.account = account
    // 只有用户端区分身份，管理端身份清空
    state.persona = role === 'user' ? persona : null
    state.schoolCode = ''
    state.schoolName = ''
    state.permissions = []
    restored = true
  }

  /** 登录接口返回后写入完整登录态（含学校绑定与权限点） */
  function loginWith(result: LoginResult) {
    applyResult(result)
    restored = true
  }

  /** 首次路由守卫前恢复登录态；之后复用同一个 Promise，避免重复请求 */
  function restore(): Promise<void> {
    if (restored) return Promise.resolve()
    if (!restoring) {
      restoring = authApi
        .restore()
        .then((session) => {
          if (session) applyResult(session)
          // 清掉旧版本可能残留的 role 缓存
          sessionStorage.removeItem('soccer-auth')
        })
        .catch(() => {
          // 恢复失败按未登录处理，不阻塞页面访问
        })
        .finally(() => {
          restored = true
        })
    }
    return restoring
  }

  function logout() {
    authApi.clearSession()
    state.role = null
    state.persona = null
    state.account = ''
    state.schoolCode = ''
    state.schoolName = ''
    state.permissions = []
    state.city = ''
    state.district = ''
    restored = true
  }

  return { state, roleLabels, personaLabels, loginAs, loginWith, logout, restore }
}
