import { ApiError } from '../error'
import type {
  TeamCoach,
  TeamCoachInput,
  TeamImportResult,
  TeamPlayer,
  TeamPlayerInput,
  TeamPlayerPosition,
  TeamRosterApi,
} from '../types'
import { api } from './client'

// 球队成员维护：/api/teams/{id}/athletes、/api/teams/{id}/coaches

interface ApiAthlete {
  id: string
  name: string
  idCard: string
  birthDate: string
  position: TeamPlayerPosition
  jerseyNo: number
  photoUploaded: boolean
}

interface ApiCoach {
  id: string
  name: string
  category: TeamCoach['category']
  level: string
  phone: string
}

async function resolveTeamId(teamId?: string | null): Promise<string> {
  if (teamId) return teamId
  const team = await api.get<{ id: number } | null>('/api/teams/mine')
  if (!team) throw new ApiError(1002, '尚未创建球队，请先完善球队资料')
  return String(team.id)
}

function toMemberInput(player: TeamPlayer): TeamPlayerInput {
  return {
    name: player.name,
    idCard: player.idCard,
    birthDate: player.birthDate || undefined,
    position: player.position,
    jerseyNo: player.jerseyNo,
    photoUploaded: player.photoUploaded,
  }
}

export const liveTeamRosterApi: TeamRosterApi = {
  async members(teamId?: string | null): Promise<TeamPlayer[]> {
    const id = await resolveTeamId(teamId)
    return api.get<ApiAthlete[]>(`/api/teams/${id}/athletes`)
  },

  async saveMembers(teamId: string | null, list: TeamPlayerInput[]): Promise<TeamPlayer[]> {
    const id = await resolveTeamId(teamId)
    return api.put<ApiAthlete[]>(`/api/teams/${id}/athletes`, {
      members: list.map((item) => ({
        ...item,
        birthDate: item.birthDate || null,
      })),
    })
  },

  async coaches(teamId?: string | null): Promise<TeamCoach[]> {
    const id = await resolveTeamId(teamId)
    return api.get<ApiCoach[]>(`/api/teams/${id}/coaches`)
  },

  async saveCoaches(teamId: string | null, list: TeamCoachInput[]): Promise<TeamCoach[]> {
    const id = await resolveTeamId(teamId)
    return api.put<ApiCoach[]>(`/api/teams/${id}/coaches`, { coaches: list })
  },

  async importMembers(teamId: string | null, rows: TeamPlayerInput[]): Promise<TeamImportResult> {
    const id = await resolveTeamId(teamId)
    const existing = await api.get<ApiAthlete[]>(`/api/teams/${id}/athletes`)
    const existingKeys = new Set(existing.map((item) => `${item.name}|${item.idCard}`))
    const accepted: TeamPlayerInput[] = []
    let skipped = 0
    rows.forEach((row) => {
      const key = `${row.name}|${row.idCard}`
      if (existingKeys.has(key)) {
        skipped += 1
        return
      }
      existingKeys.add(key)
      accepted.push(row)
    })
    if (accepted.length) {
      await api.put(`/api/teams/${id}/athletes`, {
        members: [...existing.map(toMemberInput), ...accepted].map((item) => ({
          ...item,
          birthDate: item.birthDate || null,
        })),
      })
    }
    return { added: accepted.length, skipped, errors: [] }
  },
}
