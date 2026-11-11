import type { Team, TeamCompleteness } from './types'

// 球队信息完善度规则：报名前必须完成的必填项，按权重累计得分
// 页面用它展示完善进度，报名表单用它做前置资格校验，避免未完善球队直接报名
// 人员项（教练、球员）是创建球队后必须同步维护的内容，未达标不能报名
const CHECK_ITEMS: { label: string; weight: number; ok: (team: Team) => boolean }[] = [
  { label: '球队名称', weight: 5, ok: (t) => t.name.trim().length > 0 },
  { label: '所属市州', weight: 5, ok: (t) => t.city.trim().length > 0 },
  { label: '所属学校', weight: 5, ok: (t) => t.school.trim().length > 0 && t.schoolCode.trim().length > 0 },
  { label: '参赛组别', weight: 5, ok: (t) => t.group.trim().length > 0 },
  { label: '成立时间', weight: 5, ok: (t) => t.foundTime.trim().length > 0 },
  { label: '队长姓名', weight: 5, ok: (t) => t.captain.trim().length > 0 },
  { label: '球队简介（不少于 20 字）', weight: 15, ok: (t) => t.intro.trim().length >= 20 },
  { label: '球队队旗', weight: 5, ok: (t) => t.flagUploaded },
  { label: '球队队徽', weight: 5, ok: (t) => t.logoUploaded },
  { label: '球队合照', weight: 5, ok: (t) => t.photoUploaded },
  { label: '教练信息（至少 1 名）', weight: 20, ok: (t) => (t.coaches?.length ?? 0) > 0 },
  { label: '球员名单（至少 5 人）', weight: 20, ok: (t) => (t.players?.length ?? 0) >= 5 },
]

export function teamCompleteness(team: Team | null): TeamCompleteness {
  if (!team) {
    return {
      score: 0,
      complete: false,
      missing: ['尚未创建球队信息'],
    }
  }
  let score = 0
  const missing: string[] = []
  for (const item of CHECK_ITEMS) {
    if (item.ok(team)) {
      score += item.weight
    } else {
      missing.push(item.label)
    }
  }
  return { score, complete: missing.length === 0, missing }
}
