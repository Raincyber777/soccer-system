import { ApiError } from '../error'
import type {
  CoachCategory,
  Team,
  TeamApi,
  TeamCoach,
  TeamCoachInput,
  TeamImportResult,
  TeamInput,
  TeamPlayer,
  TeamPlayerInput,
  TeamPlayerPosition,
  TeamRosterApi,
} from '../types'
import { requireSession } from './session'

// 球队信息 mock 服务：一个用户账号对应一支球队，数据落在 localStorage
// 所属学校按学校标识码绑定；球队信息完善度由 teamCompleteness 统一计算

const STORAGE_KEY = 'soccer-teams'

const SEED: Team[] = [
  {
    id: 'team-001',
    name: '成都市实验中学足球队',
    city: '成都市',
    school: '成都市实验中学',
    schoolCode: '5101080009',
    district: '成华区',
    group: '中学组',
    foundTime: '2018-09-01',
    captain: '王小磊',
    intro: '球队成立于 2018 年，常年参加成都市及四川省青少年校园足球联赛，以传控与高位逼抢为主要打法，多次获得市级比赛前三名。',
    flagUploaded: true,
    logoUploaded: true,
    photoUploaded: true,
    honorUploaded: true,
    ownerAccount: 'user001',
    updatedAt: '2026-10-20 15:10',
    coaches: [
      { id: 'coach-001', name: '张建国', category: '专职教练员', level: '亚足联 C 级', phone: '13800000001' },
    ],
    players: [
      { id: 'tp-001', name: '王小磊', idCard: '5101**********0011', birthDate: '2009-03-12', position: '前锋', jerseyNo: 9, photoUploaded: true },
      { id: 'tp-002', name: '李泽宇', idCard: '5101**********0022', birthDate: '2009-06-25', position: '中场', jerseyNo: 8, photoUploaded: true },
      { id: 'tp-003', name: '陈昊', idCard: '5101**********0033', birthDate: '2009-01-08', position: '后卫', jerseyNo: 4, photoUploaded: true },
      { id: 'tp-004', name: '赵一鸣', idCard: '5101**********0044', birthDate: '2009-08-19', position: '门将', jerseyNo: 1, photoUploaded: true },
      { id: 'tp-005', name: '孙浩然', idCard: '5101**********0055', birthDate: '2010-02-02', position: '中场', jerseyNo: 6, photoUploaded: false },
    ],
  },
  {
    id: 'team-002',
    name: '成都七中球队',
    city: '成都市',
    school: '成都七中',
    schoolCode: '5101040001',
    district: '武侯区',
    group: '高中组',
    foundTime: '2015-03-01',
    captain: '陈昊',
    intro: '球队以校园足球特色校为依托，注重体教融合，近年连续进入省级联赛高中组八强。',
    flagUploaded: true,
    logoUploaded: true,
    photoUploaded: false,
    honorUploaded: false,
    ownerAccount: 'user002',
    updatedAt: '2026-10-18 09:30',
    coaches: [
      { id: 'coach-002', name: '刘洋', category: '体育教师兼任', level: '中国足协 D 级', phone: '13900000002' },
    ],
    players: [
      { id: 'tp-006', name: '张明轩', idCard: '5101**********0066', birthDate: '2008-05-16', position: '前锋', jerseyNo: 10, photoUploaded: true },
      { id: 'tp-007', name: '刘宇', idCard: '5101**********0077', birthDate: '2008-09-30', position: '后卫', jerseyNo: 5, photoUploaded: true },
    ],
  },
  {
    id: 'team-003',
    name: '第一实验小学队',
    city: '绵阳市',
    school: '第一实验小学',
    schoolCode: '5107030009',
    district: '涪城区',
    group: '小学组',
    foundTime: '2020-09-01',
    captain: '李泽宇',
    intro: '以兴趣启蒙和基础技术训练为主，队员均为三至六年级在校学生。',
    flagUploaded: false,
    logoUploaded: false,
    photoUploaded: false,
    honorUploaded: false,
    ownerAccount: 'user004',
    updatedAt: '2026-10-15 11:02',
    coaches: [],
    players: [
      { id: 'tp-008', name: '林子涵', idCard: '5107**********0088', birthDate: '2014-11-05', position: '前锋', jerseyNo: 7, photoUploaded: false },
    ],
  },
  {
    id: 'team-004',
    name: '川师大队',
    city: '成都市',
    school: '四川师范大学',
    schoolCode: '5101040101',
    district: '锦江区',
    group: '高校组',
    foundTime: '2012-05-01',
    captain: '周子豪',
    intro: '由四川师范大学在校学生组成，长期参加省大学生足球锦标赛，队内有多名体育教育专业队员。',
    flagUploaded: true,
    logoUploaded: true,
    photoUploaded: true,
    honorUploaded: true,
    ownerAccount: 'user003',
    updatedAt: '2026-09-28 10:05',
    coaches: [
      { id: 'coach-003', name: '周教练', category: '专职教练员', level: '中国足协 C 级', phone: '13700000003' },
    ],
    players: [
      { id: 'tp-009', name: '周子豪', idCard: '5101**********0099', birthDate: '2003-04-21', position: '中场', jerseyNo: 10, photoUploaded: true },
      { id: 'tp-010', name: '吴俊杰', idCard: '5101**********0100', birthDate: '2003-07-09', position: '门将', jerseyNo: 1, photoUploaded: true },
    ],
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

function load(): Team[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      save(SEED)
      return SEED.map((t) => ({ ...t }))
    }
    const parsed = JSON.parse(raw) as Team[]
    return migrate(Array.isArray(parsed) ? parsed : SEED)
  } catch {
    return SEED.map((t) => ({ ...t }))
  }
}

/** 旧数据没有人员字段时补齐：优先沿用内置种子，避免历史球队完善度突然归零 */
function migrate(list: Team[]): Team[] {
  return list.map((team) => {
    const seed = SEED.find((item) => item.id === team.id)
    return {
      ...team,
      district: team.district ?? seed?.district ?? '',
      coaches: team.coaches ?? seed?.coaches ?? [],
      players: team.players ?? seed?.players ?? [],
    }
  })
}

function save(list: Team[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // 隐私模式写入失败时保持内存数据可用
  }
}

function clone(t: Team): Team {
  return {
    ...t,
    coaches: (t.coaches ?? []).map((coach) => ({ ...coach })),
    players: (t.players ?? []).map((player) => ({ ...player })),
  }
}

/** 汇总数据等只读场景使用：读取全部球队 */
export function readTeams(): Team[] {
  return load()
}

export const mockTeamApi: TeamApi = {
  async getMine() {
    await delay()
    const session = requireSession()
    const found = load().find((t) => t.ownerAccount === session.account)
    return found ? clone(found) : null
  },

  async save(input: TeamInput) {
    await delay(360)
    const session = requireSession()
    const ownerAccount = session.account
    const name = input.name.trim()
    if (!name) throw new ApiError(6101, '请填写球队名称')
    if (name.length > 30) throw new ApiError(6108, '球队名称不能超过 30 个字符')
    if (input.captain.trim().length > 20) throw new ApiError(6109, '队长姓名不能超过 20 个字符')
    if (input.intro.trim().length > 500) throw new ApiError(6110, '球队简介不能超过 500 个字符')
    if (!input.city.trim()) throw new ApiError(6102, '请选择所属市州')
    if (!input.school.trim() || !input.schoolCode.trim()) {
      throw new ApiError(6103, '请通过学校选择器绑定所属学校')
    }
    if (!input.group.trim()) throw new ApiError(6104, '请选择参赛组别')
    if (!input.foundTime.trim()) throw new ApiError(6105, '请选择球队成立时间')
    if (!input.captain.trim()) throw new ApiError(6106, '请填写队长姓名')
    if (input.intro.trim().length < 20) throw new ApiError(6107, '球队简介不少于 20 字')

    const list = load()
    const index = list.findIndex((t) => t.ownerAccount === ownerAccount)
    const current = list[index]

    if (index >= 0 && current) {
      const updated: Team = {
        ...current,
        ...input,
        ownerAccount,
        name,
        intro: input.intro.trim(),
        updatedAt: nowText(),
      }
      list[index] = updated
      save(list)
      return clone(updated)
    }

    const created: Team = {
      id: `team-${Date.now()}`,
      ...input,
      ownerAccount,
      name,
      intro: input.intro.trim(),
      updatedAt: nowText(),
      coaches: [],
      players: [],
    }
    list.push(created)
    save(list)
    return clone(created)
  },
}

// ===== 球队人员（教练组 / 球员名单） =====

const PLAYER_POSITIONS: TeamPlayerPosition[] = ['门将', '后卫', '中场', '前锋']
const COACH_CATEGORIES: CoachCategory[] = ['专职教练员', '体育教师兼任', '社会足球从业者']
const MAX_PLAYERS = 60
const MAX_COACHES = 5

/** 解析可维护人员的目标球队：用户只能操作自己的球队，校级管理员只能操作本校球队 */
function resolveRosterTeam(teamId: string | null | undefined): { list: Team[]; team: Team } {
  const session = requireSession()
  const list = load()
  if (session.role === 'school') {
    const schoolCode = session.schoolCode ?? ''
    if (!schoolCode) throw new ApiError(20004, '当前账号未绑定学校，不能管理球队人员')
    const team = teamId ? list.find((item) => item.id === teamId) : list.find((item) => item.schoolCode === schoolCode)
    if (!team || team.schoolCode !== schoolCode) throw new ApiError(20004, '只能管理本校球队人员')
    return { list, team }
  }
  if (session.role === 'user') {
    const team = list.find((item) => item.ownerAccount === session.account)
    if (!team) throw new ApiError(40400, '请先创建球队信息')
    if (teamId && teamId !== team.id) throw new ApiError(40300, '只能管理自己球队的人员')
    return { list, team }
  }
  throw new ApiError(40300, '当前账号无权管理球队人员')
}

function normalizePlayer(input: TeamPlayerInput, existing: TeamPlayer[]): TeamPlayer {
  const name = (input.name ?? '').trim()
  if (!name) throw new ApiError(10001, '请填写球员姓名')
  if (name.length > 20) throw new ApiError(10001, '球员姓名不能超过 20 个字符')
  const idCard = (input.idCard ?? '').trim()
  if (!/^[\d*Xx]{10,18}$/.test(idCard)) throw new ApiError(10001, '身份证号格式不正确')
  const birthDate = (input.birthDate ?? '').trim()
  if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    throw new ApiError(10001, '出生日期格式应为 YYYY-MM-DD')
  }
  if (!PLAYER_POSITIONS.includes(input.position)) throw new ApiError(10001, '场上位置不合法')
  const jerseyNo = Number(input.jerseyNo)
  if (!Number.isInteger(jerseyNo) || jerseyNo < 1 || jerseyNo > 99) {
    throw new ApiError(10001, '球衣号码需为 1 - 99 的整数')
  }
  if (existing.some((player) => player.name === name)) throw new ApiError(5110, `球员「${name}」已在名单中`)
  if (existing.some((player) => player.idCard === idCard)) throw new ApiError(5110, `身份证号 ${idCard} 已存在`)
  if (existing.some((player) => player.jerseyNo === jerseyNo)) {
    throw new ApiError(5110, `球衣号码 ${jerseyNo} 已被占用`)
  }
  return {
    id: `tp-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    name,
    idCard,
    birthDate,
    position: input.position,
    jerseyNo,
    photoUploaded: Boolean(input.photoUploaded),
  }
}

function normalizeCoaches(list: TeamCoachInput[]): TeamCoach[] {
  if (list.length > MAX_COACHES) throw new ApiError(10001, `教练组最多 ${MAX_COACHES} 人`)
  const names = new Set<string>()
  return list.map((item) => {
    const name = (item.name ?? '').trim()
    if (!name) throw new ApiError(10001, '请填写教练姓名')
    if (name.length > 20) throw new ApiError(10001, '教练姓名不能超过 20 个字符')
    if (!COACH_CATEGORIES.includes(item.category)) throw new ApiError(10001, '教练类别不合法')
    const level = (item.level ?? '').trim()
    if (level.length > 20) throw new ApiError(10001, '教练等级不能超过 20 个字符')
    const phone = (item.phone ?? '').trim()
    if (phone && !/^1\d{10}$/.test(phone)) throw new ApiError(10001, '教练手机号格式不正确')
    if (names.has(name)) throw new ApiError(10001, '教练姓名重复')
    names.add(name)
    return {
      id: `coach-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      name,
      category: item.category,
      level,
      phone,
    }
  })
}

export const mockTeamRosterApi: TeamRosterApi = {
  async members(teamId?: string | null) {
    await delay()
    const { team } = resolveRosterTeam(teamId)
    return (team.players ?? []).map((player) => ({ ...player }))
  },

  async saveMembers(teamId: string | null, list: TeamPlayerInput[]) {
    await delay(320)
    const { list: teams, team } = resolveRosterTeam(teamId)
    if (list.length > MAX_PLAYERS) throw new ApiError(10001, `球员名单不能超过 ${MAX_PLAYERS} 人`)
    const saved: TeamPlayer[] = []
    for (const item of list) {
      saved.push(normalizePlayer(item, saved))
    }
    team.players = saved
    team.updatedAt = nowText()
    save(teams)
    return saved.map((player) => ({ ...player }))
  },

  async coaches(teamId?: string | null) {
    await delay()
    const { team } = resolveRosterTeam(teamId)
    return (team.coaches ?? []).map((coach) => ({ ...coach }))
  },

  async saveCoaches(teamId: string | null, list: TeamCoachInput[]) {
    await delay(300)
    const { list: teams, team } = resolveRosterTeam(teamId)
    team.coaches = normalizeCoaches(list)
    team.updatedAt = nowText()
    save(teams)
    return team.coaches.map((coach) => ({ ...coach }))
  },

  async importMembers(teamId: string | null, rows: TeamPlayerInput[]): Promise<TeamImportResult> {
    await delay(420)
    const { list: teams, team } = resolveRosterTeam(teamId)
    const existing = team.players ?? []
    const added: TeamPlayer[] = []
    const errors: string[] = []
    let skipped = 0

    rows.forEach((row, index) => {
      if (existing.length + added.length >= MAX_PLAYERS) {
        skipped += 1
        if (errors.length < 5) errors.push(`第 ${index + 1} 行：球员名单已达 ${MAX_PLAYERS} 人上限`)
        return
      }
      try {
        added.push(normalizePlayer(row, [...existing, ...added]))
      } catch (error) {
        skipped += 1
        if (errors.length < 5) {
          errors.push(`第 ${index + 1} 行：${error instanceof ApiError ? error.message : '数据格式不正确'}`)
        }
      }
    })

    if (added.length) {
      team.players = [...existing, ...added]
      team.updatedAt = nowText()
      save(teams)
    }
    return { added: added.length, skipped, errors }
  },
}
