import { ApiError } from '../error'
import type {
  SchoolTournamentApi,
  Tournament,
  TournamentApi,
  TournamentInput,
  TournamentLevel,
  TournamentMaterial,
  TournamentMaterialInput,
  TournamentQuery,
  TournamentStatus,
} from '../types'
import { requireSession } from './session'

// 赛事 mock 服务：数据落在 localStorage，页面通过统一契约调用
// 赛事发布权限：校级 / 市级 / 省级三类独立，发布后用户端赛事列表才可见

const STORAGE_KEY = 'soccer-tournaments'

const SEED: Tournament[] = [
  {
    id: 't-province-autumn-middle',
    name: '2026 省青少年校园足球联赛（秋季）',
    level: 'province',
    group: '中学组',
    organizer: '省教育厅',
    signStart: '2026-10-15',
    signEnd: '2026-11-05',
    status: '报名中',
    registrationEnabled: true,
    createdBy: 'super001',
    createdAt: '2026-09-20 10:00',
  },
  {
    id: 't-province-autumn-primary',
    name: '2026 省青少年校园足球联赛（秋季）· 小学组',
    level: 'province',
    group: '小学组',
    organizer: '省教育厅',
    signStart: '2026-10-15',
    signEnd: '2026-11-05',
    status: '报名中',
    registrationEnabled: true,
    createdBy: 'super001',
    createdAt: '2026-09-20 10:10',
  },
  {
    id: 't-city-chengdu',
    name: '2026 成都市校园足球联赛',
    level: 'city',
    group: '中学组',
    organizer: '成都市教育局',
    signStart: '2026-10-20',
    signEnd: '2026-11-10',
    status: '报名中',
    registrationEnabled: true,
    createdBy: 'admin001',
    createdAt: '2026-10-08 09:30',
  },
  {
    id: 't-school-experimental',
    name: '2026 实验中学秋季校内联赛',
    level: 'school',
    group: '中学组',
    organizer: '实验中学',
    signStart: '2026-11-01',
    signEnd: '2026-11-20',
    status: '报名中',
    registrationEnabled: true,
    createdBy: 'admin001',
    createdAt: '2026-10-30 16:20',
    schoolCode: '5101080009',
  },
  {
    id: 't-province-university',
    name: '2026 省大学生足球锦标赛',
    level: 'province',
    group: '高校组',
    organizer: '省体育局',
    signStart: '2026-09-20',
    signEnd: '2026-10-10',
    status: '已截止',
    registrationEnabled: false,
    createdBy: 'super001',
    createdAt: '2026-09-01 11:00',
  },
  {
    id: 't-province-champion',
    name: '2026 省青少年足球冠军杯',
    level: 'province',
    group: '高中组',
    organizer: '省足协',
    signStart: '2026-11-01',
    signEnd: '2026-11-20',
    status: '未发布',
    registrationEnabled: false,
    createdBy: 'super001',
    createdAt: '2026-10-25 14:00',
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

function load(): Tournament[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      save(SEED)
      return SEED.map((t) => ({ ...t }))
    }
    return JSON.parse(raw) as Tournament[]
  } catch {
    return SEED.map((t) => ({ ...t }))
  }
}

function save(list: Tournament[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // 隐私模式写入失败时保持内存数据可用
  }
}

function clone(t: Tournament): Tournament {
  return { ...t }
}

/** 汇总数据等只读场景使用：读取全部赛事 */
export function readTournaments(): Tournament[] {
  return load()
}

function update(id: string, patch: Partial<Tournament>): Tournament {
  const list = load()
  const index = list.findIndex((t) => t.id === id)
  const current = list[index]
  if (index < 0 || !current) throw new ApiError(4001, '赛事不存在或已被删除')
  const updated = { ...current, ...patch }
  list[index] = updated
  save(list)
  return clone(updated)
}

const LEVEL_ORDER: Record<TournamentLevel, number> = { province: 0, city: 1, school: 2 }

/** 普通管理员只能操作自己创建的校级/市级赛事，省级赛事收口超级管理员 */
function assertCanManage(current: Tournament) {
  const session = requireSession()
  if (session.role === 'super') return
  if (session.role !== 'admin') throw new ApiError(4030, '当前账号无权管理赛事')
  if (current.level === 'province') throw new ApiError(4031, '省级赛事仅超级管理员可操作')
  if (current.createdBy !== session.account) throw new ApiError(4032, '仅赛事创建人可操作该赛事')
}

export const mockTournamentApi: TournamentApi = {
  async list(query: TournamentQuery = {}) {
    await delay()
    let list = load()

    if (query.level) list = list.filter((t) => t.level === query.level)
    if (query.status) list = list.filter((t) => t.status === query.status)
    if (query.publishedOnly) {
      list = list.filter((t) => t.status !== '未发布' && t.status !== '已下架')
    }
    if (query.keyword) {
      const key = query.keyword.trim().toLowerCase()
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(key) ||
          t.organizer.toLowerCase().includes(key) ||
          t.group.toLowerCase().includes(key),
      )
    }

    return list
      .slice()
      .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || b.createdAt.localeCompare(a.createdAt))
      .map(clone)
  },

  async create(input: TournamentInput) {
    await delay(360)
    const session = requireSession()
    if (session.role !== 'admin' && session.role !== 'super') {
      throw new ApiError(4030, '当前账号无权发布赛事')
    }
    if (input.level === 'province' && session.role !== 'super') {
      throw new ApiError(4033, '省级赛事仅超级管理员可发布')
    }
    if (!input.name.trim()) throw new ApiError(4101, '请填写赛事名称')
    if (input.name.trim().length > 60) throw new ApiError(4105, '赛事名称不能超过 60 个字符')
    if (!input.organizer.trim()) throw new ApiError(4102, '请填写主办单位')
    if (input.organizer.trim().length > 40) throw new ApiError(4106, '主办单位不能超过 40 个字符')
    if (!input.signStart || !input.signEnd) throw new ApiError(4103, '请选择报名起止时间')
    if (input.signStart > input.signEnd) throw new ApiError(4104, '报名开始时间不能晚于结束时间')

    const tournament: Tournament = {
      id: `t-${Date.now()}`,
      name: input.name.trim(),
      level: input.level,
      group: input.group,
      organizer: input.organizer.trim(),
      signStart: input.signStart,
      signEnd: input.signEnd,
      status: '未发布',
      registrationEnabled: false,
      createdBy: session.account,
      createdAt: nowText(),
    }
    const list = load()
    list.unshift(tournament)
    save(list)
    return clone(tournament)
  },

  async publish(id: string) {
    await delay()
    const current = load().find((t) => t.id === id)
    if (!current) throw new ApiError(4001, '赛事不存在或已被删除')
    assertCanManage(current)
    return update(id, { status: '报名中', registrationEnabled: true })
  },

  async offline(id: string) {
    await delay()
    const current = load().find((t) => t.id === id)
    if (!current) throw new ApiError(4001, '赛事不存在或已被删除')
    assertCanManage(current)
    return update(id, { status: '已下架', registrationEnabled: false })
  },

  async setRegistration(id: string, enabled: boolean) {
    await delay()
    const current = load().find((t) => t.id === id)
    if (!current) throw new ApiError(4001, '赛事不存在或已被删除')
    assertCanManage(current)
    if (current.status === '未发布' || current.status === '已下架') {
      throw new ApiError(4002, '请先发布赛事，再控制报名开关')
    }
    const status: TournamentStatus = enabled ? '报名中' : '已截止'
    return update(id, { status, registrationEnabled: enabled })
  },

  async getMaterial(id: string) {
    await delay()
    return readMaterials()[id] ?? null
  },

  async saveMaterial(id: string, input: TournamentMaterialInput) {
    await delay(360)
    const current = load().find((t) => t.id === id)
    if (!current) throw new ApiError(4001, '赛事不存在或已被删除')
    assertCanManage(current)
    if (current.level !== 'school') throw new ApiError(4003, '仅校级赛事支持手动上传赛事资料')
    if (!input.schedule && !input.results && !input.roster) {
      throw new ApiError(4004, '请至少上传一份赛事资料')
    }
    const material: TournamentMaterial = {
      tournamentId: id,
      schedule: input.schedule,
      results: input.results,
      roster: input.roster,
      uploadedAt: nowText(),
    }
    const list = readMaterials()
    list[id] = material
    saveMaterials(list)
    return { ...material }
  },
}

// 校级赛事资料：线下组织后由学校手动上传赛程、成绩与名单，按赛事 ID 存储
const MATERIAL_KEY = 'soccer-tournament-materials'

function readMaterials(): Record<string, TournamentMaterial> {
  try {
    const raw = localStorage.getItem(MATERIAL_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, TournamentMaterial>
  } catch {
    return {}
  }
}

function saveMaterials(list: Record<string, TournamentMaterial>) {
  try {
    localStorage.setItem(MATERIAL_KEY, JSON.stringify(list))
  } catch {
    // 隐私模式写入失败时保持内存数据可用
  }
}

// ===== 校级管理员 · 校级赛事发布 =====

function requireSchoolSession() {
  const session = requireSession()
  if (session.role !== 'school') throw new ApiError(40300, '仅校级管理员可发布校级赛事')
  const schoolCode = session.schoolCode ?? ''
  if (!schoolCode) throw new ApiError(20004, '当前账号未绑定学校，不能发布赛事')
  return { session, schoolCode }
}

function normalizeName(name: string) {
  return (name ?? '').replace(/^(四川省|成都市)/, '').trim()
}

/** 校级赛事归属：优先按学校标识码，历史数据按主办单位名称兜底 */
function belongsToSchool(tournament: Tournament, schoolCode: string, schoolName: string) {
  if (tournament.schoolCode) return tournament.schoolCode === schoolCode
  if (!schoolName) return false
  return normalizeName(tournament.organizer) === normalizeName(schoolName)
}

function requireOwnTournament(id: string, schoolCode: string, schoolName: string) {
  const current = load().find((t) => t.id === id)
  if (!current) throw new ApiError(4001, '赛事不存在或已被删除')
  if (current.level !== 'school') throw new ApiError(40300, '校级管理员只能管理校级赛事')
  if (!belongsToSchool(current, schoolCode, schoolName)) throw new ApiError(20004, '只能管理本校发布的赛事')
  return current
}

export const mockSchoolTournamentApi: SchoolTournamentApi = {
  async list() {
    await delay()
    const { schoolCode, session } = requireSchoolSession()
    return load()
      .filter((t) => t.level === 'school' && belongsToSchool(t, schoolCode, session.schoolName ?? ''))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(clone)
  },

  async create(input: TournamentInput) {
    await delay(360)
    const { session, schoolCode } = requireSchoolSession()
    const name = (input.name ?? '').trim()
    if (!name) throw new ApiError(4101, '请填写赛事名称')
    if (name.length > 60) throw new ApiError(4105, '赛事名称不能超过 60 个字符')
    if (!input.group.trim()) throw new ApiError(4102, '请选择参赛组别')
    if (!input.signStart || !input.signEnd) throw new ApiError(4103, '请选择报名起止时间')
    if (input.signStart > input.signEnd) throw new ApiError(4104, '报名开始时间不能晚于结束时间')

    const tournament: Tournament = {
      id: `t-school-${Date.now()}`,
      name,
      level: 'school',
      group: input.group,
      organizer: session.schoolName || input.organizer.trim() || '本校',
      signStart: input.signStart,
      signEnd: input.signEnd,
      status: '未发布',
      registrationEnabled: false,
      createdBy: session.account,
      createdAt: nowText(),
      schoolCode,
    }
    const list = load()
    list.unshift(tournament)
    save(list)
    return clone(tournament)
  },

  async publish(id: string) {
    await delay()
    const { session, schoolCode } = requireSchoolSession()
    requireOwnTournament(id, schoolCode, session.schoolName ?? '')
    return update(id, { status: '报名中', registrationEnabled: true })
  },

  async offline(id: string) {
    await delay()
    const { session, schoolCode } = requireSchoolSession()
    requireOwnTournament(id, schoolCode, session.schoolName ?? '')
    return update(id, { status: '已下架', registrationEnabled: false })
  },

  async setRegistration(id: string, enabled: boolean) {
    await delay()
    const { session, schoolCode } = requireSchoolSession()
    const current = requireOwnTournament(id, schoolCode, session.schoolName ?? '')
    if (current.status === '未发布' || current.status === '已下架') {
      throw new ApiError(4002, '请先发布赛事，再控制报名开关')
    }
    const status: TournamentStatus = enabled ? '报名中' : '已截止'
    return update(id, { status, registrationEnabled: enabled })
  },
}
