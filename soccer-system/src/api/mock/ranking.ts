import type { RankingApi, ScorerRank } from '../types'
import { readPlayerTotals } from './player'

// 门户射手榜 mock：与 AI 报告共用 readPlayerTotals，进球/助攻同时计入管理员补录的比赛事件
// 暂未提供真实接口，后端就绪后按同契约替换

function delay(ms = 260) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const mockRankingApi: RankingApi = {
  async scorers(): Promise<ScorerRank[]> {
    await delay()
    return readPlayerTotals()
      .filter((item) => item.matches > 0 || item.goals > 0 || item.assists > 0)
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.avgRating - a.avgRating)
      .map((item, index) => ({
        rank: index + 1,
        name: item.player.name,
        team: item.player.team,
        group: item.player.group,
        goals: item.goals,
        assists: item.assists,
      }))
  },
}
