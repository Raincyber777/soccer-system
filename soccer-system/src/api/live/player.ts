import type {
  Player,
  PlayerApi,
  PlayerDetail,
  PlayerMatchRecord,
  PlayerPosition,
  PlayerQuery,
  PlayerSeasonStats,
  PlayerTournamentStats,
} from '../types'
import { api } from './client'
import { toTeam, type ApiMyTeam } from './team'

// 球员库：/api/players*

interface ApiPlayer {
  id: number
  name: string
  idCard: string
  teamId: number
  team: string
  school: string
  city: string
  group: string
  jerseyNo: number
  position: string
  birthDate: string
  height: number
  weight: number
  status: Player['status']
  account: string
}

interface ApiMatchRecord {
  id: string
  date: string
  tournamentName: string
  opponent: string
  score: string
  result: PlayerMatchRecord['result']
  starts: boolean
  minutes: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  rating: number
}

interface ApiPlayerDetail {
  player: ApiPlayer
  team: ApiMyTeam | null
  season: PlayerSeasonStats
  tournaments: PlayerTournamentStats[]
  matches: ApiMatchRecord[]
}

const POSITIONS: PlayerPosition[] = ['门将', '后卫', '中场', '前锋']

function toPlayer(row: ApiPlayer): Player {
  return {
    id: String(row.id),
    name: row.name,
    idCard: row.idCard,
    teamId: String(row.teamId),
    team: row.team,
    school: row.school,
    city: row.city,
    group: row.group,
    jerseyNo: row.jerseyNo,
    position: POSITIONS.includes(row.position as PlayerPosition) ? (row.position as PlayerPosition) : '中场',
    birthDate: row.birthDate,
    height: row.height,
    weight: row.weight,
    status: row.status,
    account: row.account,
  }
}

function toRecord(row: ApiMatchRecord): PlayerMatchRecord {
  return { ...row, id: String(row.id) }
}

function toDetail(row: ApiPlayerDetail): PlayerDetail {
  return {
    player: toPlayer(row.player),
    team: row.team ? toTeam(row.team) : null,
    season: row.season,
    tournaments: row.tournaments || [],
    matches: (row.matches || []).map(toRecord),
  }
}

export const livePlayerApi: PlayerApi = {
  async list(query?: PlayerQuery): Promise<Player[]> {
    const rows = await api.get<ApiPlayer[]>('/api/players', {
      keyword: query?.keyword,
      city: query?.city,
      group: query?.group,
      status: query?.status || undefined,
    })
    return rows.map(toPlayer)
  },

  async getDetail(id: string): Promise<PlayerDetail> {
    const row = await api.get<ApiPlayerDetail>(`/api/players/${id}`)
    return toDetail(row)
  },

  async setPublic(id: string, publicized: boolean): Promise<Player> {
    const row = await api.post<ApiPlayer>(`/api/players/${id}/publicize`, { publicized })
    return toPlayer(row)
  },

  async myRecords(): Promise<PlayerMatchRecord[]> {
    const rows = await api.get<ApiMatchRecord[]>('/api/players/mine/records')
    return rows.map(toRecord)
  },
}
