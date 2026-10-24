// 门户公开页 · 赛程赛果演示数据（原内联于 PortalSchedule.vue，抽出供 API 失败时兜底）
// 与管理员端【对阵信息管理】【赛果发布管理】同口径：赛果经审核「已发布」才对外

// 用 type 而非 interface：type 别名带隐式索引签名，可直接传给 DataTable 的 rows（Record<string, unknown>[]）
export type MatchRow = {
  match: string
  group: string
  home: string
  score: string
  away: string
  time: string
  venue: string
  status: string
}

export const mockMatches: MatchRow[] = [
  { match: '小学组 第 1 轮', group: '小学组', home: '实小少年队', score: '5 : 2', away: '城关小学', time: '2026-10-12 10:00', venue: '市体育中心副场', status: '已结束' },
  { match: '高校组 第 1 轮', group: '高校组', home: '成都体育学院', score: '1 : 0', away: '西南交通大学', time: '2026-10-17 15:00', venue: '成都体育学院足球场', status: '已结束' },
  { match: '高校组 第 1 轮', group: '高校组', home: '四川大学', score: '2 : 0', away: '川师大队', time: '2026-10-18 15:00', venue: '四川大学足球场', status: '已结束' },
  { match: '中学组 第 1 轮', group: '中学组', home: '实验中学', score: '2 : 0', away: '一中', time: '2026-10-13 15:00', venue: '省青少年足球基地 2 号场', status: '已结束' },
  { match: '中学组 第 3 轮', group: '中学组', home: '实验中学', score: '3 : 1', away: '市二中', time: '2026-10-22 15:00', venue: '省青少年足球基地 1 号场', status: '已结束' },
  { match: '小学组 第 2 轮', group: '小学组', home: '实小少年队', score: '—', away: '朝阳小学', time: '2026-10-23 14:00', venue: '市体育中心副场', status: '进行中' },
  { match: '中学组 第 4 轮', group: '中学组', home: '师大附中', score: '—', away: '实验中学', time: '2026-10-25 15:00', venue: '省青少年足球基地 1 号场', status: '未开始' },
  { match: '高校组 第 2 轮', group: '高校组', home: '川师大队', score: '—', away: '西南交通大学', time: '2026-10-26 15:00', venue: '四川师范大学足球场', status: '未开始' },
  { match: '小学组 第 3 轮', group: '小学组', home: '城关小学', score: '—', away: '朝阳小学', time: '2026-10-27 10:00', venue: '市体育中心副场', status: '未开始' },
]
