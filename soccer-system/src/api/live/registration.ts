import { ApiError } from '../error'
import { mockRegistrationApi } from '../mock/registration'
import type {
  Registration,
  RegistrationApi,
  RegistrationInput,
  RegistrationQuery,
  RegistrationStatus,
} from '../types'
import { api } from './client'

// 报名单：市州/省级审核链路
// 后端状态：draft/submitted/city_approved/reported/approved/rejected

interface ApiRegistration {
  id: number
  competition: number
  competition_name: string
  team: number
  team_name: string
  group_type: string
  group_type_display: string
  school_name: string
  city_name: string
  status: string
  status_display: string
  reject_level: string | null
  reject_level_display: string | null
  reject_reason: string | null
  player_count: number
  submitted_at: string | null
  reported_at: string | null
  created_at: string
}

interface PageData<T> {
  list: T[]
  next_page: number | null
  total: number
  page: number
  page_size: number
}

const STATUS_MAP: Record<string, RegistrationStatus> = {
  draft: '待初审',
  submitted: '待初审',
  city_approved: '待初审',
  reported: '已提交省级',
  approved: '已通过',
  rejected: '已驳回',
}

const STATUS_FILTER: Record<string, string> = {
  待初审: 'submitted',
  已提交省级: 'reported',
  已通过: 'approved',
  已驳回: 'rejected',
}

const GROUP_FILTER: Record<string, string> = {
  高校组: 'university',
  中学组: 'middle_school',
  小学组: 'primary_school',
}

// 当前列表里每条报名单所处的审核阶段，供 reject 选择市州/省级接口
const stageCache = new Map<string, 'city' | 'province'>()

function toRegistration(row: ApiRegistration): Registration {
  const status = STATUS_MAP[row.status] || '待初审'
  stageCache.set(String(row.id), row.status === 'reported' ? 'province' : 'city')
  return {
    id: String(row.id),
    tournamentId: String(row.competition),
    tournamentName: row.competition_name,
    team: row.team_name,
    school: row.school_name,
    city: row.city_name,
    group: row.group_type_display,
    players: row.player_count,
    submitTime: row.submitted_at || row.reported_at || row.created_at,
    status,
    ownerAccount: '',
    remark: row.reject_level_display || undefined,
    rejectReason: row.reject_reason || undefined,
    rejectBy: row.reject_level_display || undefined,
    canResubmit: status === '已驳回',
    resubmitCount: 0,
  }
}

async function fetchPage(path: string, query?: RegistrationQuery): Promise<ApiRegistration[]> {
  const params: Record<string, unknown> = {
    page_size: 100,
    keyword: query?.keyword,
    status: query?.status ? STATUS_FILTER[query.status] : undefined,
    group_type: query?.group ? GROUP_FILTER[query.group] : undefined,
  }
  const data = await api.get<PageData<ApiRegistration>>(path, params)
  return data.list || []
}

async function cityList(query?: RegistrationQuery): Promise<Registration[]> {
  return (await fetchPage('/api/city/registrations', query)).map(toRegistration)
}

async function provinceList(query?: RegistrationQuery): Promise<Registration[]> {
  return (await fetchPage('/api/province/registrations', query)).map(toRegistration)
}

export const liveRegistrationApi: RegistrationApi = {
  async list(query?: RegistrationQuery): Promise<Registration[]> {
    try {
      return await cityList(query)
    } catch (error) {
      if (error instanceof ApiError && (error.code === 20001 || error.code === 20004)) {
        try {
          return await provinceList(query)
        } catch (provinceError) {
          if (provinceError instanceof ApiError && provinceError.code === 20004) {
            return mockRegistrationApi.list(query)
          }
          throw provinceError
        }
      }
      throw error
    }
  },

  async listMine(): Promise<Registration[]> {
    try {
      return await fetchPage('/api/registrations').then((rows) => rows.map(toRegistration))
    } catch (error) {
      if (error instanceof ApiError && error.code === 20004) {
        return mockRegistrationApi.listMine()
      }
      throw error
    }
  },

  async create(input: RegistrationInput, stampedForm?: File): Promise<Registration> {
    const competitionId = Number(input.tournamentId)
    const teamId = Number(input.teamId)
    if (!Number.isInteger(competitionId) || competitionId <= 0) {
      throw new ApiError(1002, '赛事信息未同步到后端，请刷新赛事列表后重试')
    }
    if (!Number.isInteger(teamId) || teamId <= 0) {
      throw new ApiError(1002, '未找到后端球队信息，请先在球队资料页保存球队')
    }

    const draft = await api.post<ApiRegistration>('/api/registrations', {
      competition_id: competitionId,
      team_id: teamId,
    })

    if (stampedForm) {
      const form = new FormData()
      form.append('file', stampedForm)
      await api.upload<ApiRegistration>(`/api/registrations/${draft.id}/stamped-form`, form)
    }

    try {
      const submitted = await api.post<ApiRegistration>(`/api/registrations/${draft.id}/submit`)
      return toRegistration(submitted)
    } catch (error) {
      const detail = error instanceof ApiError ? error.message : '提交审核失败'
      throw new ApiError(
        error instanceof ApiError ? error.code : 1002,
        `报名单已创建（编号 ${draft.id}），但提交审核未通过：${detail}`,
      )
    }
  },

  async approve(id: string, stage: 'city' | 'province'): Promise<Registration> {
    if (stage === 'city') {
      const reviewed = await api.post<ApiRegistration>(`/api/city/registrations/${id}/approve`)
      // 前端把「市州通过」视为已提交省级，后端还需一步报送
      if (reviewed.status === 'city_approved') {
        try {
          const reported = await api.post<ApiRegistration>(`/api/city/registrations/${id}/report`)
          return toRegistration(reported)
        } catch {
          return toRegistration(reviewed)
        }
      }
      return toRegistration(reviewed)
    }
    const reviewed = await api.post<ApiRegistration>(`/api/province/registrations/${id}/approve`)
    return toRegistration(reviewed)
  },

  async reject(id: string, reason: string): Promise<Registration> {
    const stage = stageCache.get(id) || (sessionStorage.getItem('soccer-role') === 'super' ? 'province' : 'city')
    const path =
      stage === 'province'
        ? `/api/province/registrations/${id}/reject`
        : `/api/city/registrations/${id}/reject`
    const reviewed = await api.post<ApiRegistration>(path, { reason })
    return toRegistration(reviewed)
  },

  async resubmit(id: string): Promise<Registration> {
    const submitted = await api.post<ApiRegistration>(`/api/registrations/${id}/submit`)
    return toRegistration(submitted)
  },
}
