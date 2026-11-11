import type { Team, TeamApi, TeamCoach, TeamInput, TeamPlayer } from '../types'
import { api } from './client'

// 用户端「我的球队」：/api/teams/mine

interface ApiPlayer {
  id: string
  name: string
  idCard: string
  birthDate: string
  position: TeamPlayer['position']
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

export interface ApiMyTeam {
  id: number
  name: string
  city: string
  school: string
  school_code: string
  group: string
  found_time: string
  captain: string
  intro: string
  flag_uploaded: boolean
  logo_uploaded: boolean
  photo_uploaded: boolean
  honor_uploaded: boolean
  owner_account: string
  updated_at: string
  coaches: ApiCoach[]
  players: ApiPlayer[]
}

export function toTeam(row: ApiMyTeam): Team {
  return {
    id: String(row.id),
    name: row.name,
    city: row.city,
    school: row.school,
    schoolCode: row.school_code,
    group: row.group,
    foundTime: row.found_time,
    captain: row.captain,
    intro: row.intro,
    flagUploaded: row.flag_uploaded,
    logoUploaded: row.logo_uploaded,
    photoUploaded: row.photo_uploaded,
    honorUploaded: row.honor_uploaded,
    ownerAccount: row.owner_account,
    updatedAt: row.updated_at,
    coaches: row.coaches || [],
    players: row.players || [],
  }
}

function payloadOf(input: TeamInput) {
  return {
    name: input.name,
    school: input.school,
    schoolCode: input.schoolCode,
    group: input.group,
    found_time: input.foundTime,
    captain: input.captain,
    intro: input.intro,
    flag_uploaded: input.flagUploaded,
    logo_uploaded: input.logoUploaded,
    photo_uploaded: input.photoUploaded,
    honor_uploaded: input.honorUploaded,
  }
}

export const liveTeamApi: TeamApi = {
  async getMine(): Promise<Team | null> {
    const row = await api.get<ApiMyTeam | null>('/api/teams/mine')
    return row ? toTeam(row) : null
  },

  async save(input: TeamInput): Promise<Team> {
    const row = await api.put<ApiMyTeam>('/api/teams/mine', payloadOf(input))
    return toTeam(row)
  },
}
