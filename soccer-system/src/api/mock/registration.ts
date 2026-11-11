import { ApiError } from '../error'
import type {
  Registration,
  RegistrationApi,
  RegistrationInput,
  RegistrationQuery,
  SchoolRegistrationApi,
  SchoolRegistrationInput,
} from '../types'
import { teamCompleteness } from '../teamCompleteness'
import { requireSession } from './session'
import { readTeams } from './team'
import { readTournaments } from './tournament'

// 报名 mock 服务：市州初审 → 省级终审，两级均可驳回并通知球队重新提交
// 数据落在 localStorage，管理员端与用户端读写同一份数据

const STORAGE_KEY = 'soccer-registrations'

const SEED: Registration[] = [
  {
    id: 'r-001',
    tournamentId: 't-province-autumn-middle',
    tournamentName: '2026 省青少年校园足球联赛（秋季）',
    team: '实验中学足球队',
    school: '实验中学',
    city: '成都市',
    group: '中学组',
    players: 18,
    submitTime: '2026-10-16 14:20',
    status: '待初审',
    ownerAccount: 'user001',
    canResubmit: false,
    resubmitCount: 0,
  },
  {
    id: 'r-002',
    tournamentId: 't-province-champion',
    tournamentName: '2026 省青少年足球冠军杯',
    team: '实验中学足球队',
    school: '实验中学',
    city: '成都市',
    group: '中学组',
    players: 16,
    submitTime: '2026-09-28 10:05',
    status: '已通过',
    ownerAccount: 'user001',
    canResubmit: false,
    resubmitCount: 0,
  },
  {
    id: 'r-003',
    tournamentId: 't-province-autumn-middle',
    tournamentName: '2026 省青少年校园足球联赛（秋季）',
    team: '实小少年队',
    school: '实验小学',
    city: '成都市',
    group: '小学组',
    players: 12,
    submitTime: '2026-10-14 09:40',
    status: '已驳回',
    rejectReason: '缺少 3 名球员的学籍证明，请补充材料后重新提交。',
    rejectBy: '成都市教育局',
    rejectTime: '2026-10-15 10:30',
    ownerAccount: 'user001',
    canResubmit: true,
    resubmitCount: 0,
  },
  {
    id: 'r-004',
    tournamentId: 't-city-chengdu',
    tournamentName: '2026 成都市校园足球联赛',
    team: '成都七中球队',
    school: '成都七中',
    city: '成都市',
    group: '高中组',
    players: 20,
    submitTime: '2026-10-16 09:10',
    status: '待初审',
    ownerAccount: 'user002',
    canResubmit: false,
    resubmitCount: 0,
  },
  {
    id: 'r-005',
    tournamentId: 't-province-university',
    tournamentName: '2026 省大学生足球锦标赛',
    team: '川师大队',
    school: '四川师范大学',
    city: '成都市',
    group: '高校组',
    players: 22,
    submitTime: '2026-10-14 16:45',
    status: '已通过',
    ownerAccount: 'user003',
    canResubmit: false,
    resubmitCount: 0,
  },
  {
    id: 'r-006',
    tournamentId: 't-province-autumn-primary',
    tournamentName: '2026 省青少年校园足球联赛（秋季）· 小学组',
    team: '第一实验小学队',
    school: '第一实验小学',
    city: '绵阳市',
    group: '小学组',
    players: 12,
    submitTime: '2026-10-15 11:02',
    status: '待初审',
    ownerAccount: 'user004',
    canResubmit: false,
    resubmitCount: 0,
  },
]

function delay(ms = 260) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function nowText() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function load(): Registration[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      save(SEED)
      return SEED.map((r) => ({ ...r }))
    }
    return JSON.parse(raw) as Registration[]
  } catch {
    return SEED.map((r) => ({ ...r }))
  }
}

function save(list: Registration[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // 隐私模式写入失败时保持内存数据可用
  }
}

function clone(r: Registration): Registration {
  return { ...r }
}

/** 汇总数据等只读场景使用：读取全部报名 */
export function readRegistrations(): Registration[] {
  return load()
}

function update(id: string, patch: Partial<Registration>): Registration {
  const list = load()
  const index = list.findIndex((r) => r.id === id)
  const current = list[index]
  if (index < 0 || !current) throw new ApiError(5001, '报名记录不存在或已被删除')
  const updated = { ...current, ...patch }
  list[index] = updated
  save(list)
  return clone(updated)
}

function matches(r: Registration, query: RegistrationQuery) {
  if (query.city && r.city !== query.city) return false
  if (query.group && r.group !== query.group) return false
  if (query.status && r.status !== query.status) return false
  if (query.keyword) {
    const key = query.keyword.trim().toLowerCase()
    if (
      !r.team.toLowerCase().includes(key) &&
      !r.school.toLowerCase().includes(key) &&
      !r.tournamentName.toLowerCase().includes(key)
    ) {
      return false
    }
  }
  return true
}

export const mockRegistrationApi: RegistrationApi = {
  async list(query: RegistrationQuery = {}) {
    await delay()
    return load()
      .filter((r) => matches(r, query))
      .sort((a, b) => b.submitTime.localeCompare(a.submitTime))
      .map(clone)
  },

  async listMine() {
    await delay()
    const session = requireSession()
    return load()
      .filter((r) => r.ownerAccount === session.account)
      .sort((a, b) => b.submitTime.localeCompare(a.submitTime))
      .map(clone)
  },

  async create(input: RegistrationInput) {
    await delay(420)
    const session = requireSession()
    if (session.role !== 'user') throw new ApiError(5111, '仅用户端账号可提交报名')

    if (!input.tournamentId || !input.tournamentName) throw new ApiError(5101, '请选择报名赛事')
    if (!input.team.trim()) throw new ApiError(5102, '请填写参赛球队名称')
    if (!input.school.trim()) throw new ApiError(5103, '请填写所属学校')
    if (!Number.isFinite(input.players) || input.players <= 0) {
      throw new ApiError(5104, '请填写正确的参赛人数')
    }
    if (input.team.trim().length > 30) throw new ApiError(5113, '参赛球队名称不能超过 30 个字符')
    if (input.school.trim().length > 40) throw new ApiError(5114, '所属学校名称不能超过 40 个字符')
    if ((input.leader ?? '').trim().length > 20 || (input.coach ?? '').trim().length > 20) {
      throw new ApiError(5115, '领队/教练姓名不能超过 20 个字符')
    }
    if ((input.remark ?? '').length > 200) throw new ApiError(5116, '备注不能超过 200 个字符')
    if (input.players > 60) throw new ApiError(5117, '参赛人数不能超过 60 人')
    const phone = (input.phone ?? '').trim()
    if (phone && !/^1\d{10}$/.test(phone)) throw new ApiError(5118, '请输入正确的 11 位手机号')

    // 赛事状态由服务端校验，防止绕过页面直接向未开放赛事报名
    const tournament = readTournaments().find((t) => t.id === input.tournamentId)
    if (!tournament) throw new ApiError(5105, '所选赛事不存在或已被删除')
    if (tournament.status !== '报名中' || !tournament.registrationEnabled) {
      throw new ApiError(5106, '该赛事当前未开放报名')
    }
    const start = new Date(`${tournament.signStart}T00:00:00`).getTime()
    const end = new Date(`${tournament.signEnd}T23:59:59`).getTime()
    const now = Date.now()
    if (Number.isFinite(start) && now < start) throw new ApiError(5107, '该赛事报名尚未开始')
    if (Number.isFinite(end) && now > end) throw new ApiError(5108, '该赛事报名已截止')

    // 报名资格由服务端按当前账号的球队资料判定，不能只依赖页面提示
    const team = readTeams().find((t) => t.ownerAccount === session.account) ?? null
    const completeness = teamCompleteness(team)
    if (!completeness.complete) {
      throw new ApiError(5109, `球队信息尚未完善（${completeness.missing.join('、')}），请先完善球队信息`)
    }

    const teamName = input.team.trim()
    const duplicated = load().some(
      (r) => r.tournamentId === tournament.id && r.team.trim().toLowerCase() === teamName.toLowerCase(),
    )
    if (duplicated) throw new ApiError(5110, '该球队已报名此赛事，请在我的报名中查看')

    const registration: Registration = {
      id: `r-${Date.now()}`,
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      team: teamName,
      school: input.school.trim(),
      city: input.city,
      group: input.group,
      players: input.players,
      submitTime: nowText(),
      status: '待初审',
      ownerAccount: session.account,
      leader: input.leader,
      phone: input.phone,
      coach: input.coach,
      remark: input.remark,
      canResubmit: false,
      resubmitCount: 0,
    }
    const list = load()
    list.unshift(registration)
    save(list)
    return clone(registration)
  },

  async approve(id: string, stage: 'city' | 'province') {
    await delay()
    const session = requireSession()
    if (session.role !== 'admin' && session.role !== 'super') {
      throw new ApiError(4030, '当前账号无权审核报名')
    }
    const current = load().find((r) => r.id === id)
    if (!current) throw new ApiError(5001, '报名记录不存在或已被删除')

    // 严格按状态机流转，禁止从控制台跳过初审或重复审批
    if (stage === 'city' && current.status !== '待初审') {
      throw new ApiError(5203, '仅「待初审」的报名可通过市州初审')
    }
    if (stage === 'province' && current.status !== '已提交省级') {
      throw new ApiError(5204, '仅「已提交省级」的报名可通过省级终审')
    }

    return update(id, {
      status: stage === 'province' ? '已通过' : '已提交省级',
      rejectReason: undefined,
      rejectBy: undefined,
      rejectTime: undefined,
      canResubmit: false,
    })
  },

  async reject(id: string, reason: string, reviewer: string) {
    await delay()
    const session = requireSession()
    if (session.role !== 'admin' && session.role !== 'super') {
      throw new ApiError(4030, '当前账号无权审核报名')
    }
    const text = reason.trim()
    if (!text) throw new ApiError(5201, '请填写驳回原因')

    const current = load().find((r) => r.id === id)
    if (!current) throw new ApiError(5001, '报名记录不存在或已被删除')
    if (current.status !== '待初审' && current.status !== '已提交省级') {
      throw new ApiError(5205, '仅「待初审」或「已提交省级」的报名可驳回')
    }

    return update(id, {
      status: '已驳回',
      rejectReason: text,
      rejectBy: reviewer,
      rejectTime: nowText(),
      canResubmit: true,
    })
  },

  async resubmit(id: string) {
    await delay(360)
    const session = requireSession()
    const current = load().find((r) => r.id === id)
    if (!current) throw new ApiError(5001, '报名记录不存在或已被删除')
    if (session.role === 'user' && current.ownerAccount !== session.account) {
      throw new ApiError(5112, '无权操作其他球队的报名')
    }
    if (current.status !== '已驳回') throw new ApiError(5202, '当前状态无需重新提交')

    return update(id, {
      status: '待初审',
      submitTime: nowText(),
      rejectReason: undefined,
      rejectBy: undefined,
      rejectTime: undefined,
      canResubmit: false,
      resubmitCount: current.resubmitCount + 1,
    })
  },
}

// ===== 校级管理员 · 本校报名 =====

/** 校级账号必须绑定学校才能管理报名 */
function requireSchoolRegistrar() {
  const session = requireSession()
  if (session.role !== 'school') throw new ApiError(40300, '仅校级管理员可管理本校报名')
  const schoolCode = session.schoolCode ?? ''
  if (!schoolCode) throw new ApiError(20004, '当前账号未绑定学校，不能管理报名')
  return { session, schoolCode }
}

/** 本校球队负责人账号集合：报名数据按此裁剪，不暴露他校报名 */
function ownTeamAccounts(schoolCode: string) {
  return new Set(
    readTeams()
      .filter((team) => team.schoolCode === schoolCode)
      .map((team) => team.ownerAccount),
  )
}

/** 「成都市实验中学」与「实验中学」视为同一所学校 */
function normalizeSchoolName(name: string) {
  return (name ?? '').replace(/^(四川省|成都市)/, '').trim()
}

/** 报名归属判定：账号属于本校球队，且报名学校与本校一致 */
function isOwnRegistration(
  registration: Registration,
  accounts: Set<string>,
  schoolName: string,
) {
  return (
    accounts.has(registration.ownerAccount) &&
    normalizeSchoolName(registration.school) === normalizeSchoolName(schoolName)
  )
}

export const mockSchoolRegistrationApi: SchoolRegistrationApi = {
  async list() {
    await delay()
    const { session, schoolCode } = requireSchoolRegistrar()
    const accounts = ownTeamAccounts(schoolCode)
    return load()
      .filter((r) => isOwnRegistration(r, accounts, session.schoolName ?? ''))
      .sort((a, b) => b.submitTime.localeCompare(a.submitTime))
      .map(clone)
  },

  async create(input: SchoolRegistrationInput) {
    await delay(420)
    const { schoolCode } = requireSchoolRegistrar()

    const team = readTeams().find((t) => t.id === input.teamId)
    if (!team) throw new ApiError(10001, '请选择本校球队')
    if (team.schoolCode !== schoolCode) throw new ApiError(20004, '只能为本校球队报名')

    const completeness = teamCompleteness(team)
    if (!completeness.complete) {
      throw new ApiError(5109, `球队信息尚未完善（${completeness.missing.join('、')}），请先完善球队信息`)
    }

    if (!input.tournamentId) throw new ApiError(10001, '请选择报名赛事')
    const tournament = readTournaments().find((t) => t.id === input.tournamentId)
    if (!tournament) throw new ApiError(40400, '所选赛事不存在或已被删除')
    if (tournament.status !== '报名中' || !tournament.registrationEnabled) {
      throw new ApiError(5106, '该赛事当前未开放报名')
    }
    const start = new Date(`${tournament.signStart}T00:00:00`).getTime()
    const end = new Date(`${tournament.signEnd}T23:59:59`).getTime()
    const now = Date.now()
    if (Number.isFinite(start) && now < start) throw new ApiError(5107, '该赛事报名尚未开始')
    if (Number.isFinite(end) && now > end) throw new ApiError(5108, '该赛事报名已截止')

    const players = Number(input.players)
    if (!Number.isInteger(players) || players <= 0 || players > 60) {
      throw new ApiError(10001, '参赛人数需为 1 - 60 的整数')
    }
    if ((input.leader ?? '').trim().length > 20 || (input.coach ?? '').trim().length > 20) {
      throw new ApiError(10001, '领队 / 教练姓名不能超过 20 个字符')
    }
    const phone = (input.phone ?? '').trim()
    if (phone && !/^1\d{10}$/.test(phone)) throw new ApiError(10001, '请输入正确的 11 位手机号')
    if ((input.remark ?? '').length > 200) throw new ApiError(10001, '备注不能超过 200 个字符')

    const duplicated = load().some(
      (r) => r.tournamentId === tournament.id && r.team.trim().toLowerCase() === team.name.trim().toLowerCase(),
    )
    if (duplicated) throw new ApiError(5110, '该球队已报名此赛事，请在报名列表中查看')

    const registration: Registration = {
      id: `r-${Date.now()}`,
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      team: team.name,
      school: team.school,
      city: team.city,
      group: team.group,
      players,
      submitTime: nowText(),
      status: '待初审',
      ownerAccount: team.ownerAccount,
      leader: (input.leader ?? '').trim() || undefined,
      phone: phone || undefined,
      coach: (input.coach ?? '').trim() || undefined,
      remark: (input.remark ?? '').trim() || undefined,
      canResubmit: false,
      resubmitCount: 0,
    }
    const list = load()
    list.unshift(registration)
    save(list)
    return clone(registration)
  },

  async resubmit(id: string) {
    await delay(360)
    const { session, schoolCode } = requireSchoolRegistrar()
    const accounts = ownTeamAccounts(schoolCode)
    const current = load().find((r) => r.id === id)
    if (!current) throw new ApiError(40400, '报名记录不存在或已被删除')
    if (!isOwnRegistration(current, accounts, session.schoolName ?? '')) {
      throw new ApiError(20004, '只能操作本校球队的报名')
    }
    if (current.status !== '已驳回') throw new ApiError(40002, '当前状态无需重新提交')

    return update(id, {
      status: '待初审',
      submitTime: nowText(),
      rejectReason: undefined,
      rejectBy: undefined,
      rejectTime: undefined,
      canResubmit: false,
      resubmitCount: current.resubmitCount + 1,
    })
  },
}
