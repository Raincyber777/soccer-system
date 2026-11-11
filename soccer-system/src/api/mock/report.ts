import type { AiReport, MatchEventType, ReportApi } from '../types'
import { readPlayers, readPlayerRecords, readPlayerTotals } from './player'
import { readMatchEvents } from './matchEvent'
import { readRegistrations } from './registration'
import { readTeams } from './team'
import { teamCompleteness } from '../teamCompleteness'

// 门户 AI 分析报告 mock：直接聚合比赛事件、球员明细与报名数据生成结论
// 当前为规则化生成（不发起真实模型请求），后续接入模型时替换实现即可，页面契约不变

function delay(ms = 420) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function round(n: number, digits = 1) {
  const base = 10 ** digits
  return Math.round(n * base) / base
}

function nowText() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface Scorer {
  name: string
  team: string
  matches: number
  goals: number
  assists: number
  avgRating: number
}

interface TeamPerf {
  team: string
  matches: number
  wins: number
  goals: number
  assists: number
  avgRating: number
  winRate: number
}

export const mockReportApi: ReportApi = {
  async rankingReport(): Promise<AiReport> {
    await delay()

    const players = readPlayers()
    const events = readMatchEvents()
    const registrations = readRegistrations()
    const teams = readTeams()

    // 与门户射手榜共用同一聚合口径：比赛明细 + 补录事件
    const scorers: Scorer[] = readPlayerTotals()
      .filter((t) => t.matches > 0 || t.goals > 0)
      .map((t) => ({
        name: t.player.name,
        team: t.player.team,
        matches: t.matches,
        goals: t.goals,
        assists: t.assists,
        avgRating: t.avgRating,
      }))
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.avgRating - a.avgRating)

    const teamMap = new Map<string, TeamPerf>()
    for (const player of players) {
      const records = readPlayerRecords(player.id)
      if (!records.length) continue
      const perf = teamMap.get(player.team) ?? {
        team: player.team,
        matches: 0,
        wins: 0,
        goals: 0,
        assists: 0,
        avgRating: 0,
        winRate: 0,
      }
      perf.matches += records.length
      perf.wins += records.filter((r) => r.result === '胜').length
      perf.goals += records.reduce((sum, r) => sum + r.goals, 0)
      perf.assists += records.reduce((sum, r) => sum + r.assists, 0)
      perf.avgRating += records.reduce((sum, r) => sum + r.rating, 0)
      teamMap.set(player.team, perf)
    }
    const teamPerf: TeamPerf[] = [...teamMap.values()].map((t) => ({
      ...t,
      avgRating: t.matches ? round(t.avgRating / t.matches) : 0,
      winRate: t.matches ? round((t.wins / t.matches) * 100) : 0,
    }))
    teamPerf.sort((a, b) => b.winRate - a.winRate || b.goals - a.goals)

    const eventCountByType = (type: MatchEventType) => events.filter((e) => e.type === type).length
    const approved = registrations.filter((r) => r.status === '已通过').length
    const pending = registrations.filter((r) => r.status === '待初审' || r.status === '已提交省级').length
    const cities = new Set(registrations.map((r) => r.city)).size
    const incompleteTeams = teams.filter((t) => !teamCompleteness(t).complete)

    const topScorer = scorers[0]
    const topTeam = teamPerf[0]

    const summaryParts = [
      `本期共纳入 ${scorers.length} 名有出场记录的球员、${teamPerf.length} 支球队，`,
      `累计补录比赛事件 ${events.length} 条；`,
      `报名 ${registrations.length} 份，其中已通过 ${approved} 份、审核中 ${pending} 份。`,
    ]

    const highlights = [
      topScorer
        ? `${topScorer.name}（${topScorer.team}）以 ${topScorer.goals} 球 ${topScorer.assists} 助攻暂列进攻榜首位。`
        : '暂无球员出场记录，建议先在「赛事信息录入」补录比赛事件。',
      topTeam
        ? `${topTeam.team} 胜率 ${topTeam.winRate}%，场均评分 ${topTeam.avgRating}，为当前表现最稳定的球队。`
        : '暂无球队比赛数据，无法评估球队表现。',
      incompleteTeams.length
        ? `还有 ${incompleteTeams.length} 支球队资料未完善（如 ${incompleteTeams[0]?.name ?? ''}），可能影响报名资格校验。`
        : '全部球队资料均已完善，报名资格校验无异常。',
    ]

    const sections = [
      {
        title: '进攻端观察',
        content: topScorer
          ? `${topScorer.name} 出场 ${topScorer.matches} 次，贡献 ${topScorer.goals} 球 ${topScorer.assists} 助攻，场均评分 ${topScorer.avgRating}；` +
            `其后为 ${scorers
              .slice(1, 3)
              .map((s) => `${s.name}（${s.goals} 球）`)
              .join('、') || '暂无其他球员数据'}。建议重点跟踪头部球员的连续出场与体能分配。`
          : '暂无比赛明细数据，建议在赛事信息录入中补充进球与助攻事件后再查看分析。',
      },
      {
        title: '球队表现',
        content: topTeam
          ? `${topTeam.team} 共 ${topTeam.matches} 场个人比赛记录，胜率 ${topTeam.winRate}%，总进球 ${topTeam.goals}、助攻 ${topTeam.assists}，` +
            `场均评分 ${topTeam.avgRating}。${teamPerf[1] ? `紧随其后的是 ${teamPerf[1].team}（胜率 ${teamPerf[1].winRate}%）。` : ''}`
          : '暂无球队比赛记录。',
      },
      {
        title: '事件补录进度',
        content:
          `已补录进球 ${eventCountByType('进球')} 条、助攻 ${eventCountByType('助攻')} 条、` +
          `黄牌 ${eventCountByType('黄牌')} 条、红牌 ${eventCountByType('红牌')} 条、换人 ${eventCountByType('换人')} 条。` +
          `补录越完整，球员全量统计与门户榜单越准确。`,
      },
      {
        title: '报名与覆盖',
        content:
          `报名覆盖 ${cities} 个市州，已通过 ${approved} 份、审核中 ${pending} 份、已驳回 ${registrations.length - approved - pending} 份。` +
          `审核积压较多时，建议市州管理员优先处理待初审记录，避免影响省级终审排期。`,
      },
    ]

    return {
      title: '赛事榜单 AI 分析报告',
      generatedAt: nowText(),
      scope: '全省校园足球赛事 · 公开数据',
      summary: summaryParts.join(''),
      sections,
      highlights,
    }
  },
}
