import { ApiError } from '../error'
import type { IdentityApi, RealNameInput, RealNameQuery, RealNameRecord } from '../types'
import { requireSession } from './session'
import { readTeams } from './team'
import { bindPlayerAccount, readPlayers } from './player'

// 实名认证 mock：队员与账号一对一绑定
// 身份证只在提交时校验，落库仅保存脱敏值（前 4 位 + 后 4 位），不保存明文
// 审核通过后按姓名匹配球员档案并绑定账号，个人参赛记录据此展示

const STORAGE_KEY = 'soccer-real-names'

const SEED: RealNameRecord[] = [
  {
    id: 'rn-001',
    account: 'student001',
    name: '王小磊',
    idCardMasked: '5101**********0011',
    phone: '13800000011',
    status: '已认证',
    submittedAt: '2026-10-10 09:00',
    reviewedAt: '2026-10-11 10:00',
    reviewedBy: 'super001',
    rejectReason: null,
    playerId: 'p-001',
    playerName: '王小磊',
    schoolCode: '5101080009',
    schoolName: '成都市实验中学',
    city: '成都市',
    district: '成华区',
  },
]

function delay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function nowText() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function load(): RealNameRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      save(SEED)
      return SEED.map((record) => ({ ...record }))
    }
    const parsed = JSON.parse(raw) as RealNameRecord[]
    return Array.isArray(parsed) ? parsed : SEED.map((record) => ({ ...record }))
  } catch {
    return SEED.map((record) => ({ ...record }))
  }
}

function save(list: RealNameRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // 隐私模式写入失败时保持内存数据可用
  }
}

/** 身份证号脱敏：保留前 4 位与后 4 位，中间统一用 * 代替 */
export function maskIdCard(idCard: string) {
  return `${idCard.slice(0, 4)}${'*'.repeat(idCard.length - 8)}${idCard.slice(-4)}`
}

function validateIdCard(idCard: string) {
  if (!/^\d{17}[\dXx]$/.test(idCard)) throw new ApiError(10001, '请输入 18 位有效身份证号')
  const birth = idCard.slice(6, 14)
  const year = Number(birth.slice(0, 4))
  const month = Number(birth.slice(4, 6))
  const day = Number(birth.slice(6, 8))
  if (year < 1950 || year > new Date().getFullYear() || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new ApiError(10001, '身份证号中的出生日期不正确')
  }
}

/** 提交时推导所属学校：优先账号球队，其次实名绑定的球员所属球队 */
function contextOf(account: string) {
  const team = readTeams().find((item) => item.ownerAccount === account)
  if (team) {
    return {
      schoolCode: team.schoolCode,
      schoolName: team.school,
      city: team.city,
      district: team.district ?? '',
    }
  }
  const player = readPlayers().find((item) => item.account === account)
  const playerTeam = player ? readTeams().find((item) => item.id === player.teamId) : null
  if (playerTeam) {
    return {
      schoolCode: playerTeam.schoolCode,
      schoolName: playerTeam.school,
      city: playerTeam.city,
      district: playerTeam.district ?? '',
    }
  }
  return { schoolCode: '', schoolName: '', city: '', district: '' }
}

function canReview(role: string) {
  return role === 'school' || role === 'admin' || role === 'super'
}

export const mockIdentityApi: IdentityApi = {
  async mine() {
    await delay()
    const session = requireSession()
    const found = load().find((record) => record.account === session.account)
    return found ? { ...found } : null
  },

  async submit(input: RealNameInput) {
    await delay(360)
    const session = requireSession()
    if (session.role !== 'user') throw new ApiError(40300, '仅用户端队员可提交实名认证')

    const name = (input.name ?? '').trim()
    if (!/^[\u4e00-\u9fa5A-Za-z·]{2,20}$/.test(name)) {
      throw new ApiError(10001, '请填写 2-20 位真实姓名')
    }
    const idCard = (input.idCard ?? '').trim()
    validateIdCard(idCard)
    const phone = (input.phone ?? '').trim()
    if (phone && !/^1\d{10}$/.test(phone)) throw new ApiError(10001, '手机号格式不正确')

    const list = load()
    const index = list.findIndex((record) => record.account === session.account)
    const current = list[index]
    if (current && current.status === '待审核') throw new ApiError(40002, '实名信息正在审核中，请勿重复提交')
    if (current && current.status === '已认证') throw new ApiError(40002, '当前账号已完成实名认证')

    const context = contextOf(session.account)
    const record: RealNameRecord = {
      id: current?.id ?? `rn-${Date.now()}`,
      account: session.account,
      name,
      idCardMasked: maskIdCard(idCard),
      phone,
      status: '待审核',
      submittedAt: nowText(),
      reviewedAt: null,
      reviewedBy: '',
      rejectReason: null,
      playerId: null,
      playerName: null,
      ...context,
    }
    if (index >= 0) list[index] = record
    else list.push(record)
    save(list)
    return { ...record }
  },

  async list(query: RealNameQuery = {}) {
    await delay()
    const session = requireSession()
    if (!canReview(session.role)) throw new ApiError(40300, '当前账号无权查看实名认证列表')

    return load()
      .filter((record) => {
        if (session.role === 'school' && record.schoolCode !== (session.schoolCode ?? '')) return false
        if (session.role === 'admin' && session.city && record.city !== session.city) return false
        if (query.status && record.status !== query.status) return false
        if (query.keyword) {
          const key = query.keyword.trim().toLowerCase()
          if (
            !record.name.toLowerCase().includes(key) &&
            !record.account.toLowerCase().includes(key) &&
            !record.schoolName.toLowerCase().includes(key)
          ) {
            return false
          }
        }
        return true
      })
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .map((record) => ({ ...record }))
  },

  async review(id: string, action: 'approve' | 'reject', reason?: string) {
    await delay(320)
    const session = requireSession()
    if (!canReview(session.role)) throw new ApiError(40300, '当前账号无权审核实名认证')

    const list = load()
    const index = list.findIndex((record) => record.id === id)
    const current = list[index]
    if (index < 0 || !current) throw new ApiError(40400, '实名认证记录不存在')
    if (session.role === 'school' && current.schoolCode !== (session.schoolCode ?? '')) {
      throw new ApiError(20004, '只能审核本校队员的实名信息')
    }
    if (current.status !== '待审核') throw new ApiError(40002, '该记录已审核，不能重复操作')

    if (action === 'reject') {
      const text = (reason ?? '').trim()
      if (!text) throw new ApiError(10001, '请填写驳回原因')
      if (text.length > 100) throw new ApiError(10001, '驳回原因不能超过 100 个字符')
      const rejected: RealNameRecord = {
        ...current,
        status: '已驳回',
        rejectReason: text,
        reviewedAt: nowText(),
        reviewedBy: session.account,
      }
      list[index] = rejected
      save(list)
      return { ...rejected }
    }

    // 通过后按姓名匹配球员并建立一对一绑定；没匹配到也允许通过，便于后续补录
    const player = readPlayers().find((item) => {
      if (item.name !== current.name) return false
      if (!current.schoolCode) return true
      const team = readTeams().find((teamItem) => teamItem.id === item.teamId)
      return team?.schoolCode === current.schoolCode
    })
    if (player) bindPlayerAccount(player.id, current.account)

    const approved: RealNameRecord = {
      ...current,
      status: '已认证',
      rejectReason: null,
      reviewedAt: nowText(),
      reviewedBy: session.account,
      playerId: player?.id ?? null,
      playerName: player?.name ?? null,
    }
    list[index] = approved
    save(list)
    return { ...approved }
  },
}
