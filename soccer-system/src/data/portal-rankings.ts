// 门户公开页 · 赛事榜单演示数据（原内联于 PortalRankings.vue，抽出供 API 失败时兜底）
// 与管理员端【榜单统计】同口径：完赛并发布后自动计入统计

// 用 type 而非 interface：type 别名带隐式索引签名，可直接传给 DataTable 的 rows（Record<string, unknown>[]）
export type StandingRow = {
  rank: number
  team: string
  group: string
  played: number
  win: number
  draw: number
  loss: number
  gf: number
  ga: number
  diff: string
  points: number
}

export type ScorerRow = {
  rank: number
  name: string
  team: string
  goals: number
  /** 后端暂无助攻字段，API 数据显示为 — */
  assists: number | string
}

export const mockStandings: StandingRow[] = [
  { rank: 1, team: '实验中学足球队', group: '中学组', played: 3, win: 3, draw: 0, loss: 0, gf: 9, ga: 3, diff: '+6', points: 9 },
  { rank: 2, team: '师大附中队', group: '中学组', played: 3, win: 2, draw: 1, loss: 0, gf: 7, ga: 4, diff: '+3', points: 7 },
  { rank: 3, team: '市二中足球队', group: '中学组', played: 3, win: 1, draw: 1, loss: 1, gf: 5, ga: 6, diff: '-1', points: 4 },
  { rank: 4, team: '一中队', group: '中学组', played: 3, win: 0, draw: 2, loss: 1, gf: 4, ga: 6, diff: '-2', points: 2 },
  { rank: 1, team: '四川大学队', group: '高校组', played: 1, win: 1, draw: 0, loss: 0, gf: 2, ga: 0, diff: '+2', points: 3 },
  { rank: 2, team: '成都体育学院队', group: '高校组', played: 1, win: 1, draw: 0, loss: 0, gf: 1, ga: 0, diff: '+1', points: 3 },
  { rank: 3, team: '西南交通大学队', group: '高校组', played: 1, win: 0, draw: 0, loss: 1, gf: 0, ga: 1, diff: '-1', points: 0 },
  { rank: 4, team: '川师大队', group: '高校组', played: 1, win: 0, draw: 0, loss: 1, gf: 0, ga: 2, diff: '-2', points: 0 },
  { rank: 1, team: '实小少年队', group: '小学组', played: 1, win: 1, draw: 0, loss: 0, gf: 5, ga: 2, diff: '+3', points: 3 },
  { rank: 2, team: '朝阳小学队', group: '小学组', played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0, diff: '0', points: 0 },
  { rank: 3, team: '城关小学队', group: '小学组', played: 1, win: 0, draw: 0, loss: 1, gf: 2, ga: 5, diff: '-3', points: 0 },
]

export const mockScorers: ScorerRow[] = [
  { rank: 1, name: '王小磊', team: '实验中学足球队', goals: 9, assists: 4 },
  { rank: 2, name: '周子豪', team: '市二中足球队', goals: 8, assists: 2 },
  { rank: 3, name: '李泽宇', team: '实验中学足球队', goals: 6, assists: 7 },
  { rank: 4, name: '郑凯', team: '师大附中队', goals: 5, assists: 3 },
]
