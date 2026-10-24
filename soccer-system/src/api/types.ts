// 后端（Django + DRF）通用响应与门户数据类型
// 字段定义以《赛事系统接口文档（Django 版）》为准；前端页面专用形状见各 data/*.ts

/** 统一响应五字段：{ code, message, data, trace_id, timestamp }，code=0 为成功 */
export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
  trace_id?: string
  timestamp?: number
}

/** 分页 data：page/page_size 分页，默认每页 10、最大 100 */
export interface ApiPage<T> {
  total: number
  page: number
  page_size: number
  pages: number
  results: T[]
}

/** 赛事新闻 GET /api/portal/news/ */
export interface ApiNews {
  id: number
  title: string
  summary: string
  cover: string | null
  /** 正文 HTML */
  content: string
  category: 'news' | 'announcement' | 'report'
  category_display: string
  is_top: boolean
  is_published: boolean
  published_at: string
  view_count: number
  /** 发布来源（单位名），后端自研后新增 */
  source: string
  created_by_name: string
  created_at: string
  updated_at: string
}

/** 赛事政策 GET /api/portal/policy/ */
export interface ApiPolicy {
  id: number
  title: string
  summary: string
  cover: string | null
  content: string
  issuing_org: string
  is_published: boolean
  published_at: string
  created_by_name: string
  created_at: string
  updated_at: string
}

/** 嵌套在赛果里的已发布比分 */
export interface ApiMatchResult {
  id: number
  home_score: number
  away_score: number
  winner_team_id: number | null
  winner_team_name: string | null
}

/** 赛事对阵 GET /api/portal/matches/ */
export interface ApiMatch {
  id: number
  tournament_name: string
  group_type: string
  group_type_display: string
  round_name: string
  home_team: number
  home_team_name: string
  away_team: number
  away_team_name: string
  match_time: string
  venue: string
  status: 'scheduled' | 'ongoing' | 'finished' | 'postponed'
  status_display: string
  remark: string
  result: ApiMatchResult | null
  created_by_name: string
  created_at: string
  updated_at: string
}

/** 射手榜条目 GET /api/portal/stats/ranking/ */
export interface ApiScorer {
  rank: number
  player_id: number
  player_name: string
  jersey_number: number | null
  position: string
  team_id: number
  team_name: string
  group_type: string
  group_type_display: string
  total_goals: number
  match_count: number
}
