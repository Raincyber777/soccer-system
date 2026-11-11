import type { Team } from '../types'
import { api } from './client'
import { toTeam, type ApiMyTeam } from './team'

// 校级端本校球队列表：/api/school/teams
// 后端返回字段与「我的球队」一致，直接复用 Team 映射

export const liveSchoolTeamApi = {
  async list(): Promise<Team[]> {
    const rows = await api.get<ApiMyTeam[]>('/api/school/teams')
    return rows.map(toTeam)
  },
}
