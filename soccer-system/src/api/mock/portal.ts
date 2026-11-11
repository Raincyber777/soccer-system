import type { PortalApi, PortalArticle, PortalMatch, StandingRow } from '../types'
import { readAutoNews, readMatches } from './liveGoal'

// 门户公开数据 mock：积分榜、赛程赛果、新闻政策统一由接口提供
// 页面不再内联演示数组；后端就绪后按同契约替换，管理端审核发布的数据即可实时生效
// AI 战报由比赛结束自动生成，排在人工发布新闻之前，保证赛事内容自动关联

const STANDINGS: StandingRow[] = [
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

function readSchedule(): PortalMatch[] {
  return readMatches().map((m) => ({
    id: m.id,
    match: `${m.group} ${m.round}`,
    group: m.group,
    home: m.home,
    score: m.score,
    away: m.away,
    time: m.time,
    venue: m.venue,
    status: m.status,
    phase: m.phase,
  }))
}

const NEWS: PortalArticle[] = [
  {
    tag: '赛事动态',
    title: '小学组第二轮本周开打，实小少年队冲击两连胜',
    source: '赛事组委会',
    date: '2026-10-23',
    summary: '小学组第二轮实小少年队对阵朝阳小学的比赛今日 14:00 在市体育中心副场进行，图文直播同步开启。',
    body: [
      '首轮 5:2 大胜城关小学的实小少年队将于今日 14:00 迎来小组第二个对手朝阳小学。若能取胜，实小少年队将以两连胜提前占据小组出线主动权。',
      '本场比赛在市体育中心副场进行，赛事组委会将在「赛事图文直播」中提供逐分钟文字直播，欢迎各校师生关注。',
    ],
  },
  {
    tag: '通知公告',
    title: '2026 省青少年校园足球联赛（秋季）开赛公告',
    source: '四川省足球协会',
    date: '2026-10-15',
    summary: '省级总决赛定于 10 月 12 日在省青少年足球基地拉开帷幕，各组别报名球队经市州初审、省级终审后正式参赛。',
    body: [
      '2026 年四川省青少年校园足球联赛（秋季）省级总决赛已于 10 月 12 日正式开赛。本届联赛设小学组、中学组、高中组、高校组四个组别，全省 21 个市州共 128 支球队报名参赛。',
      '所有报名球队均经过市州管理员初审与省级终审两级审核，审核通过的球队名单与参赛信息已在平台公示，可登录用户端「信息公示」查看。',
      '比赛将持续至 11 月下旬，赛程对阵与比赛结果将在本平台「赛程赛果」页面实时更新。',
    ],
  },
  {
    tag: '战报',
    title: '第三轮战报：实验中学 3:1 市二中',
    source: '赛事组委会',
    date: '2026-10-12',
    summary: '王小磊梅开二度、李泽宇锦上添花，实验中学足球队 3:1 战胜市二中，豪取三连胜领跑中学组积分榜。',
    body: [
      '中学组第三轮焦点战中，实验中学足球队凭借王小磊的梅开二度与李泽宇的进球，以 3:1 战胜市二中足球队，开赛以来三战全胜，继续领跑中学组积分榜。',
      '市二中由周子豪在下半场扳回一球。第四轮实验中学将客场挑战师大附中，比赛定于 10 月 25 日 15:00 在省青少年足球基地 1 号场进行。',
    ],
  },
  {
    tag: '通知公告',
    title: '关于开展 2026 年四川省中小学足球运动员注册工作的通知',
    source: '四川省教育厅',
    date: '2026-10-08',
    summary: '全省中小学足球运动员实行统一注册管理，学籍信息与学校标识码绑定，注册信息审核通过后方可参赛。',
    body: [
      '为规范校园足球赛事管理，全省中小学足球运动员实行统一注册。运动员注册须绑定学籍信息与教育部学校（机构）标识码，由所在学校统一组织申报。',
      '注册信息经市州管理员审核通过后生效，未生效的注册信息不参与参赛资格校验。各学校请于 11 月 10 日前完成本校运动员注册申报。',
    ],
  },
  {
    tag: '新闻动态',
    title: '成都市校园足球特色校建设成果巡礼',
    source: '成都市教育局',
    date: '2026-10-06',
    summary: '全市已建成校园足球特色学校 187 所，常态化班级联赛覆盖率达 92%，为省级联赛输送球员 400 余人。',
    body: [
      '近年来成都市持续推进校园足球特色学校建设，目前已建成特色学校 187 所，班级联赛常态化开展率达 92%。',
      '依托「教学 + 训练 + 竞赛」一体化体系，成都市为省级联赛输送优秀球员 400 余名，实验中学、成都七中等学校在历届省级赛事中均取得优异成绩。',
    ],
  },
  {
    tag: '新闻动态',
    title: '川师大队首次出征省级联赛高校组',
    source: '四川师范大学',
    date: '2026-09-28',
    summary: '川师大队以校园组冠军身份首次晋级省级联赛高校组，首轮 0:2 惜败四川大学队，积累经验再出发。',
    body: [
      '四川师范大学足球队今年以校内联赛冠军身份首次晋级省级联赛高校组。首轮比赛中 0:2 不敌传统强队四川大学队。',
      '主教练张建国表示，球队将认真总结首轮经验，在 10 月 26 日对阵西南交通大学队的第二轮比赛中全力争胜。',
    ],
  },
]

const POLICIES: PortalArticle[] = [
  {
    tag: '政策文件',
    title: '四川省青少年校园足球联赛竞赛规程（2026 秋季修订版）',
    source: '四川省教育厅 · 四川省足球协会',
    date: '2026-09-30',
    summary: '明确本届联赛组别设置、报名资格、竞赛办法、名次评定与纪律要求。',
    body: [
      '第一章 总则：联赛由四川省教育厅、四川省足球协会联合主办，设小学组、中学组、高中组、高校组，实行赛会制与主客场相结合的竞赛办法。',
      '第二章 报名资格：参赛运动员须为在籍在校学生，注册信息审核通过并与学校标识码绑定；每队报名运动员 18-22 人，教练员须持有效等级证书。',
      '第三章 竞赛办法与名次评定：小组单循环 + 淘汰赛；积分相同时依次按相互间胜负、净胜球、进球数排定名次。',
    ],
  },
  {
    tag: '政策文件',
    title: '四川省中小学足球运动员注册管理办法（试行）',
    source: '四川省教育厅',
    date: '2026-09-18',
    summary: '规范运动员注册流程：学籍绑定、学校标识码校验、市州审核与注册有效期管理。',
    body: [
      '第一条 全省中小学足球运动员实行统一注册管理，注册信息包括学籍信息、身份信息与运动履历。',
      '第二条 注册须绑定教育部学校（机构）标识码，系统校验学校存在且启用、与所属市州一致后方可提交。',
      '第三条 注册信息由市州管理员审核，审核通过后生效并公示；未生效的注册信息不参与参赛资格校验。',
    ],
  },
  {
    tag: '政策文件',
    title: '校园足球特色学校建设与评价指南',
    source: '四川省教育厅',
    date: '2026-09-05',
    summary: '从课程教学、训练竞赛、师资配备、场地设施等维度提出特色学校建设标准与评价指标。',
    body: [
      '特色学校应保证每周不少于 1 次足球课，常态化开展班级联赛，并按标准配齐足球场地与器材设施。',
      '评价体系包含课程教学（30 分）、训练竞赛（30 分）、师资队伍（20 分）、场地设施（10 分）、文化建设（10 分），总分 90 分以上可申报示范校。',
    ],
  },
]

function delay(ms = 220) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function cloneArticles(list: PortalArticle[]): PortalArticle[] {
  return list.map((item) => ({ ...item, body: [...item.body] }))
}

export const mockPortalApi: PortalApi = {
  async standings() {
    await delay()
    return STANDINGS.map((row) => ({ ...row }))
  },
  async schedule() {
    await delay()
    return readSchedule().map((row) => ({ ...row }))
  },
  async news() {
    await delay()
    // 自动生成的 AI 战报优先展示，再次进入时仍从本地持久化读取
    return [...cloneArticles(readAutoNews()), ...cloneArticles(NEWS)]
  },
  async matchNews(matchId: number) {
    await delay()
    const match = readMatches().find((item) => item.id === matchId)
    if (!match) return []
    const teams = [match.home, match.away].filter(Boolean)
    const all = [...cloneArticles(readAutoNews()), ...cloneArticles(NEWS)]
    const seen = new Set<string>()
    return all.filter((article) => {
      const related =
        article.matchId === matchId ||
        teams.some((team) => article.title.includes(team) || article.summary.includes(team))
      if (!related || seen.has(article.title)) return false
      seen.add(article.title)
      return true
    })
  },
  async policies() {
    await delay()
    return cloneArticles(POLICIES)
  },
}
