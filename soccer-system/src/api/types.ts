import type { UserPersona, UserRole } from '../stores/auth'

// 统一接口契约：页面只依赖这里的类型和 authApi 方法，
// 当前默认走 src/api/mock，后续接后端时把 VITE_USE_MOCK 设为 false 即可切到真实接口。

/**
 * 登录入口：普通用户与管理员完全拆分。
 * 管理员入口由普通管理员和超级管理员共用，登录后再按角色进入各自工作台。
 */
export type LoginEntry = 'user' | 'admin'

/** 各登录入口展示的演示账号 */
export interface DemoAccount {
  role: UserRole
  persona?: UserPersona
  icon: string
  label: string
  account: string
  password: string
  /** 校级管理员绑定的学校标识码与学校名称 */
  schoolCode?: string
  schoolName?: string
  /** 角色默认权限点（校级管理员为 live:* 权限点） */
  permissions?: string[]
  /** 数据范围：市州 / 区县（账号绑定的行政区域） */
  city?: string
  district?: string
}

/** 登录入参：entry 决定账号可以从哪个入口登录，避免跨端串号 */
export interface LoginInput {
  account: string
  password: string
  entry: LoginEntry
}

/** 登录 / 注册成功的统一返回 */
export interface LoginResult {
  role: UserRole
  persona?: UserPersona
  account: string
  label: string
  /** 校级管理员绑定的学校；未绑定学校时为空 */
  schoolCode?: string
  schoolName?: string
  /** 生效权限点：角色默认 + 管理员追加，去重叠加 */
  permissions?: string[]
  /** 数据范围：市州 / 区县（账号绑定的行政区域） */
  city?: string
  district?: string
}

/** 赛事类别：校级 / 市级 / 省级，三类独立 */
export type TournamentLevel = 'school' | 'city' | 'province'

/** 赛事状态：发布后进入报名中，关闭报名后为已截止 */
export type TournamentStatus = '未发布' | '报名中' | '已截止' | '已下架'

export interface Tournament {
  id: string
  name: string
  level: TournamentLevel
  group: string
  organizer: string
  signStart: string
  signEnd: string
  status: TournamentStatus
  registrationEnabled: boolean
  createdBy: string
  createdAt: string
  /** 校级赛事归属学校；用于校级管理员的数据隔离 */
  schoolCode?: string
}

export interface TournamentInput {
  name: string
  level: TournamentLevel
  group: string
  organizer: string
  signStart: string
  signEnd: string
}

/** 校级管理员发布校级赛事：只能建本校的校级比赛，主办单位由会话学校决定 */
export interface SchoolTournamentApi {
  list(): Promise<Tournament[]>
  create(input: TournamentInput): Promise<Tournament>
  publish(id: string): Promise<Tournament>
  offline(id: string): Promise<Tournament>
  setRegistration(id: string, enabled: boolean): Promise<Tournament>
}

export interface TournamentQuery {
  level?: TournamentLevel
  status?: TournamentStatus
  keyword?: string
  /** 只返回已发布赛事（用户端赛事列表使用） */
  publishedOnly?: boolean
}

export interface TournamentApi {
  list(query?: TournamentQuery): Promise<Tournament[]>
  create(input: TournamentInput): Promise<Tournament>
  /** 发布赛事：状态进入报名中，同时开放报名 */
  publish(id: string): Promise<Tournament>
  /** 下架赛事：不再显示在用户端 */
  offline(id: string): Promise<Tournament>
  /** 单独控制报名开关 */
  setRegistration(id: string, enabled: boolean): Promise<Tournament>
  /** 读取校级赛事手动上传的资料状态 */
  getMaterial(id: string): Promise<TournamentMaterial | null>
  /** 保存校级赛事手动上传的赛程 / 成绩 / 名单资料 */
  saveMaterial(id: string, input: TournamentMaterialInput): Promise<TournamentMaterial>
}

/** 报名状态：市州初审通过后进入省级，省级可反向驳回 */
export type RegistrationStatus = '待初审' | '已提交省级' | '已通过' | '已驳回'

export interface Registration {
  id: string
  tournamentId: string
  tournamentName: string
  team: string
  school: string
  city: string
  group: string
  players: number
  submitTime: string
  status: RegistrationStatus
  ownerAccount: string
  leader?: string
  phone?: string
  coach?: string
  remark?: string
  rejectReason?: string
  rejectBy?: string
  rejectTime?: string
  canResubmit: boolean
  resubmitCount: number
}

export interface RegistrationInput {
  tournamentId: string
  tournamentName: string
  /** 后端球队 ID；真实接口模式下必填 */
  teamId?: string
  team: string
  school: string
  city: string
  group: string
  players: number
  leader?: string
  phone?: string
  coach?: string
  remark?: string
}

export interface RegistrationQuery {
  keyword?: string
  group?: string
  status?: RegistrationStatus | ''
  city?: string
}

export interface RegistrationApi {
  list(query?: RegistrationQuery): Promise<Registration[]>
  /** 当前登录账号的报名记录，身份由会话决定 */
  listMine(): Promise<Registration[]>
  /** 真实接口模式下会先创建报名单、上传盖章扫描件，再提交审核 */
  create(input: RegistrationInput, stampedForm?: File): Promise<Registration>
  /** 市州初审通过后提交省级；省级终审通过后状态为已通过 */
  approve(id: string, stage: 'city' | 'province'): Promise<Registration>
  /** 上级反向审核驳回，必须填写原因 */
  reject(id: string, reason: string, reviewer: string): Promise<Registration>
  /** 球队修改后重新提交，回到待初审 */
  resubmit(id: string): Promise<Registration>
}

/** 球队信息：所属学校按学校标识码绑定，报名前需完善 */
export interface Team {
  id: string
  name: string
  city: string
  school: string
  schoolCode: string
  /** 所属区县，用于区县维度统计 */
  district?: string
  group: string
  foundTime: string
  captain: string
  intro: string
  flagUploaded: boolean
  logoUploaded: boolean
  photoUploaded: boolean
  honorUploaded: boolean
  ownerAccount: string
  updatedAt: string
  /** 教练组：创建球队后同步维护，报名资格校验项 */
  coaches?: TeamCoach[]
  /** 球员名单：创建球队后同步维护，报名资格校验项 */
  players?: TeamPlayer[]
}

export interface TeamInput {
  name: string
  city: string
  school: string
  schoolCode: string
  group: string
  foundTime: string
  captain: string
  intro: string
  flagUploaded: boolean
  logoUploaded: boolean
  photoUploaded: boolean
  honorUploaded: boolean
}

export type TeamPlayerPosition = '门将' | '后卫' | '中场' | '前锋'

export interface TeamPlayer {
  id: string
  name: string
  idCard: string
  birthDate: string
  position: TeamPlayerPosition
  jerseyNo: number
  photoUploaded: boolean
}

export interface TeamPlayerInput {
  name: string
  idCard: string
  birthDate?: string
  position: TeamPlayerPosition
  jerseyNo: number
  photoUploaded?: boolean
}

export type CoachCategory = '专职教练员' | '体育教师兼任' | '社会足球从业者'

export interface TeamCoach {
  id: string
  name: string
  category: CoachCategory
  level: string
  phone: string
}

export interface TeamCoachInput {
  name: string
  category: CoachCategory
  level?: string
  phone?: string
}

/** 批量导入人员结果：逐行校验，合法行入库，非法行跳过 */
export interface TeamImportResult {
  added: number
  skipped: number
  errors: string[]
}

/** 球队人员：用户端维护自己的球队，校级端维护本校球队 */
export interface TeamRosterApi {
  members(teamId?: string | null): Promise<TeamPlayer[]>
  saveMembers(teamId: string | null, list: TeamPlayerInput[]): Promise<TeamPlayer[]>
  coaches(teamId?: string | null): Promise<TeamCoach[]>
  saveCoaches(teamId: string | null, list: TeamCoachInput[]): Promise<TeamCoach[]>
  /** 批量导入球员名单，重复或非法行跳过 */
  importMembers(teamId: string | null, rows: TeamPlayerInput[]): Promise<TeamImportResult>
}

/** 球队信息完善度：报名前的资格校验依据 */
export interface TeamCompleteness {
  /** 0-100 加权得分 */
  score: number
  complete: boolean
  /** 未完成项说明 */
  missing: string[]
}

export interface TeamApi {
  /** 当前登录账号的球队，身份由会话决定 */
  getMine(): Promise<Team | null>
  save(input: TeamInput): Promise<Team>
}

/** 球员位置，用于球员统计与全量档案展示 */
export type PlayerPosition = '门将' | '后卫' | '中场' | '前锋'
export type PlayerPublicStatus = '已公示' | '待审核' | '未公示'

export interface Player {
  id: string
  name: string
  idCard: string
  teamId: string
  team: string
  school: string
  city: string
  group: string
  jerseyNo: number
  position: PlayerPosition
  birthDate: string
  height: number
  weight: number
  status: PlayerPublicStatus
  /** 绑定的用户账号：实名为队员建立一对一映射 */
  account?: string
}

/** 单场比赛的个人数据，是球员全量统计的原始明细 */
export interface PlayerMatchRecord {
  id: string
  date: string
  tournamentName: string
  opponent: string
  score: string
  result: '胜' | '平' | '负'
  starts: boolean
  minutes: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  rating: number
}

/** 赛季汇总：由比赛明细聚合得出 */
export interface PlayerSeasonStats {
  matches: number
  starts: number
  minutes: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  avgRating: number
  goalsPerMatch: number
  winRate: number
}

/** 按赛事维度的统计 */
export interface PlayerTournamentStats {
  tournamentName: string
  matches: number
  goals: number
  assists: number
  minutes: number
  avgRating: number
}

export interface PlayerDetail {
  player: Player
  team: Team | null
  season: PlayerSeasonStats
  tournaments: PlayerTournamentStats[]
  matches: PlayerMatchRecord[]
}

export interface PlayerQuery {
  keyword?: string
  team?: string
  city?: string
  group?: string
  status?: PlayerPublicStatus | ''
}

export interface PlayerApi {
  list(query?: PlayerQuery): Promise<Player[]>
  getDetail(id: string): Promise<PlayerDetail>
  /** 公示 / 取消公示 */
  setPublic(id: string, publicized: boolean): Promise<Player>
  /** 当前登录账号绑定的球员比赛明细：实名绑定优先，其次球队队长 */
  myRecords(): Promise<PlayerMatchRecord[]>
}

/** 门户射手榜行：由球员比赛明细与管理员补录的进球/助攻事件统一聚合 */
export interface ScorerRank {
  rank: number
  name: string
  team: string
  group: string
  goals: number
  assists: number
}

export interface RankingApi {
  /** 门户射手榜：按进球、助攻降序 */
  scorers(): Promise<ScorerRank[]>
}

/** 门户积分榜行，排名与名次评定由接口侧给出 */
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

/** 门户赛程赛果行 */
export type PortalMatch = {
  /** 比赛 ID，用于跳转比赛详情与查询进球记录 */
  id: number
  match: string
  group: string
  home: string
  score: string
  away: string
  time: string
  venue: string
  status: string
  /** 比赛阶段文案，如「上半场」「中场休息」「下半场」 */
  phase?: string
}

/** 门户新闻 / 政策条目 */
export interface PortalArticle {
  tag: string
  title: string
  source: string
  date: string
  summary: string
  body: string[]
  /** AI 战报关联的比赛 ID，用于从新闻跳转比赛详情 */
  matchId?: number
  /** 由比赛结束后自动生成并发布 */
  autoGenerated?: boolean
}

export interface PortalApi {
  standings(): Promise<StandingRow[]>
  schedule(): Promise<PortalMatch[]>
  news(): Promise<PortalArticle[]>
  policies(): Promise<PortalArticle[]>
  /** 自动关联单场比赛的新闻报道：AI 战报按 matchId，人工新闻按球队名称匹配 */
  matchNews(matchId: number): Promise<PortalArticle[]>
}

/** 汇总数据：按市州 / 组别聚合球队、球员与报名情况 */
export interface SummaryRow {
  key: string
  teams: number
  players: number
  registrations: number
  approved: number
  pending: number
  rejected: number
  approvalRate: number
}

export interface TournamentLevelSummary {
  level: TournamentLevel
  label: string
  total: number
  open: number
}

export interface DataSummary {
  teamTotal: number
  playerTotal: number
  registrationTotal: number
  approvedTotal: number
  pendingTotal: number
  rejectedTotal: number
  approvalRate: number
  byCity: SummaryRow[]
  byGroup: SummaryRow[]
  tournamentLevels: TournamentLevelSummary[]
  generatedAt: string
}

export interface SummaryApi {
  summary(): Promise<DataSummary>
}

/** 赛事资料手动上传状态（校级赛事由学校线下组织后补录资料） */
export interface TournamentMaterial {
  tournamentId: string
  schedule: boolean
  results: boolean
  roster: boolean
  uploadedAt: string
}

export interface TournamentMaterialInput {
  schedule: boolean
  results: boolean
  roster: boolean
}

/** 比赛事件类型：补录的进球、助攻、红黄牌与换人 */
export type MatchEventType = '进球' | '助攻' | '黄牌' | '红牌' | '换人'

export interface MatchEvent {
  id: string
  tournamentId: string
  tournamentName: string
  matchLabel: string
  home: string
  away: string
  playerId: string
  playerName: string
  team: string
  type: MatchEventType
  minute: number
  note?: string
  createdBy: string
  createdAt: string
}

export interface MatchEventInput {
  tournamentId: string
  tournamentName: string
  matchLabel: string
  home: string
  away: string
  playerId: string
  playerName: string
  team: string
  type: MatchEventType
  minute: number
  note?: string
  createdBy: string
}

export interface MatchEventQuery {
  tournamentId?: string
  playerId?: string
  team?: string
  type?: MatchEventType | ''
  keyword?: string
}

export interface MatchEventApi {
  list(query?: MatchEventQuery): Promise<MatchEvent[]>
  create(input: MatchEventInput): Promise<MatchEvent>
  remove(id: string): Promise<void>
}

/** 门户 AI 分析报告：由比赛事件、球员统计与报名数据汇总生成 */
export interface AiReportSection {
  title: string
  content: string
}

export interface AiReport {
  title: string
  generatedAt: string
  scope: string
  summary: string
  sections: AiReportSection[]
  highlights: string[]
}

export interface ReportApi {
  /** 生成赛事榜单 AI 分析报告 */
  rankingReport(): Promise<AiReport>
}

/** 用户端注册入参 */
export interface RegisterInput {
  username: string
  password: string
  email: string
  school: string
  schoolCode: string
  persona: UserPersona
}

export interface AuthApi {
  /** 当前入口可用的演示账号（真实接口模式下为空） */
  listDemoAccounts(entry: LoginEntry): DemoAccount[]
  login(input: LoginInput): Promise<LoginResult>
  register(input: RegisterInput): Promise<LoginResult>
  /** 恢复登录态：校验本地令牌 / 服务端令牌，失败返回 null */
  restore(): Promise<LoginResult | null>
  /** 清除登录态凭证（mock 模式清会话令牌，真实模式清 token） */
  clearSession(): void
}

// ===== 视觉进球判定（门户 · 赛事直播） =====

/** 判定状态：待审核 / 已确认 / 已驳回，审核不可逆 */
export type GoalStatus = 'pending' | 'confirmed' | 'rejected'

/** 球门方位：home 主队球门，away 客队球门 */
export type GoalSide = 'home' | 'away'

/** 球门 ROI：归一化坐标 0~1，原点左上 */
export interface RoiPolygon {
  polygon: [number, number][]
}

/** AI 进球判定记录（管理端） */
export interface GoalDetection {
  id: number
  match_id: number
  match_name: string
  camera_id: number
  camera_name: string
  /** 被攻破的一侧 */
  goal_side: GoalSide
  goal_side_display: string
  /** 得分方，与 goal_side 相反 */
  scoring_side: GoalSide
  scoring_side_display: string
  occurred_at: string
  minute: number
  /** DRF DecimalField 序列化结果，如 "0.7800" */
  confidence: string
  ball_track_id: number | null
  status: GoalStatus
  status_display: string
  evidence_count: number
  model_version: string
  reviewed_by_name: string | null
  reviewed_at: string | null
  match_event_id: number | null
  created_at: string
}

export interface GoalDetectionQuery {
  status?: GoalStatus | ''
  match_id?: number
  page?: number
  page_size?: number
}

export interface PageResult<T> {
  total: number
  page: number
  page_size: number
  pages: number
  results: T[]
}

/** 审核（确认 / 驳回）返回：确认后回写比分 */
export interface GoalReviewResult {
  id: number
  status: GoalStatus
  match_event_id: number | null
  minute: number
  scoring_side: GoalSide
  live_home_score: number
  live_away_score: number
  reviewed_by_name: string
  reviewed_at: string
}

export interface GoalDetectionApi {
  list(query?: GoalDetectionQuery): Promise<PageResult<GoalDetection>>
  review(id: number, action: 'confirm' | 'reject'): Promise<GoalReviewResult>
  /** 证据图：mock 返回图片 Blob，真实接口返回 image/jpeg */
  evidence(id: number, index: number): Promise<Blob>
}

/** 摄像设备状态：停用后设备上报会被拒绝 */
export type CameraStatus = 'online' | 'offline' | 'disabled'

export interface CameraDevice {
  id: number
  /** 12 位设备标识 */
  device_id: string
  name: string
  match_id: number | null
  match_name: string | null
  stream_url: string
  status: CameraStatus
  status_display: string
  last_seen_at: string | null
  /** 主队球门 ROI，null 表示未标定 */
  home_roi: RoiPolygon | null
  /** 客队球门 ROI，null 表示未标定 */
  away_roi: RoiPolygon | null
  /** 该机位下待审核判定数 */
  pending_count: number
}

export interface CameraQuery {
  match_id?: number
  status?: CameraStatus | ''
}

/** 设备配置入参：match_id 传 null 表示解绑比赛 */
export interface CameraInput {
  name: string
  match_id: number | null
  stream_url: string
  home_roi: RoiPolygon | null
  away_roi: RoiPolygon | null
  status: CameraStatus
}

export interface CameraApi {
  list(query?: CameraQuery): Promise<CameraDevice[]>
  update(id: number, input: CameraInput): Promise<CameraDevice>
}

/** 公开端已确认进球：不返回证据、设备与置信度 */
export interface PublicGoalRecord {
  id: number
  minute: number
  scoring_side: GoalSide
  scoring_side_display: string
  occurred_at: string
}

export interface PublicLiveApi {
  goalDetections(matchId: number): Promise<PublicGoalRecord[]>
  /** 公开端读取单场 AI 报告；比赛未结束时返回 null */
  matchReport(matchId: number): Promise<MatchReport | null>
}

// ===== 校级管理员 · 举办比赛 =====

export type SchoolGroupType = 'university' | 'middle_school' | 'primary_school'

export type SchoolMatchStatus = 'not_started' | 'live' | 'finished'

/** 比赛阶段：未开始 → 上半场 → 中场休息 → 下半场 → 已结束 */
export type MatchPhase = 'not_started' | 'first_half' | 'half_time' | 'second_half' | 'finished'

/** 校级可运营的比赛：至少一支参赛球队属于本校 */
export interface SchoolMatch {
  id: number
  group_type: SchoolGroupType
  group_type_display: string
  home_team_id: string | null
  away_team_id: string | null
  home_team_name: string
  away_team_name: string
  match_time: string
  venue: string
  status: SchoolMatchStatus
  status_display: string
  phase: MatchPhase
  phase_display: string
  home_score: number
  away_score: number
  version: number
  created_by: string
}

export interface SchoolMatchInput {
  group_type: SchoolGroupType
  home_team_id: string | null
  away_team_id: string | null
  home_team_name: string
  away_team_name: string
  match_time: string
  venue?: string
}

export interface SchoolMatchApi {
  list(): Promise<SchoolMatch[]>
  create(input: SchoolMatchInput): Promise<SchoolMatch>
  update(id: number, input: SchoolMatchInput, version: number): Promise<SchoolMatch>
  remove(id: number): Promise<void>
  setStatus(id: number, action: 'start' | 'finish'): Promise<SchoolMatch>
}

// ===== 校级管理员 · 比赛运营（事件 / 阵容 / 裁判 / 文件 / 直播 / 人脸核验） =====

export type MatchSide = 'home' | 'away'

/** 比赛事件：进球自动联动比分，红黄牌 / 换人 / 文字仅记录 */
export type LiveEventType = '进球' | '黄牌' | '红牌' | '换人' | '文字'

export interface LiveMatchEvent {
  id: number
  match_id: number
  type: LiveEventType
  minute: number
  side: MatchSide
  side_display: string
  player_name: string
  note: string | null
  created_by: string
  created_at: string
}

export interface LiveEventInput {
  type: LiveEventType
  minute: number
  side: MatchSide
  player_name: string
  note?: string
}

export interface LineupPlayer {
  id: string
  name: string
  jersey_no: number
  position: PlayerPosition
}

export interface MatchLineup {
  match_id: number
  home: LineupPlayer[]
  away: LineupPlayer[]
  version: number
  updated_at: string | null
}

export interface LineupInput {
  home: LineupPlayer[]
  away: LineupPlayer[]
}

export type RefereeRole = '主裁判' | '助理裁判' | '第四官员'

export interface MatchReferee {
  id: string
  name: string
  role: RefereeRole
  phone: string
}

export interface RefereeInput {
  name: string
  role: RefereeRole
  phone: string
}

/** 赛事文件类别：签到表 / 记录确认单 / 裁判报告单 */
export type MatchFileCategory = '签到表' | '记录确认单' | '裁判报告单'

export interface MatchFile {
  id: string
  match_id: number
  category: MatchFileCategory
  name: string
  size: number
  uploaded_by: string
  uploaded_at: string
}

export interface LiveLink {
  match_id: number
  platform: string
  url: string
  updated_by: string
  updated_at: string
}

export interface LiveLinkInput {
  platform: string
  url: string
}

export type FaceVerifyStatus = '通过' | '未通过'

export interface FaceVerifyRecord {
  id: string
  match_id: number
  subject: string
  status: FaceVerifyStatus
  score: number
  operator: string
  verified_at: string
}

/** 比分与阶段的当前状态：手动录入、事件联动、计分板推送共用同一份记录 */
export interface MatchStateRecord {
  match_id: number
  home_score: number
  away_score: number
  phase: MatchPhase
  phase_display: string
  source: 'manual' | 'scoreboard' | 'event' | 'system'
  source_display: string
  updated_by: string
  updated_at: string
}

export interface MatchStateInput {
  home_score: number
  away_score: number
  phase: MatchPhase
}

/** 计分板专用端口：绑定后由设备凭密钥推送比分与阶段，无需登录账号 */
export interface ScoreboardPort {
  match_id: number
  device_name: string
  token: string
  enabled: boolean
  last_sync_at: string | null
  last_sync_by: string
}

export interface ScoreboardPushInput {
  token: string
  home_score: number
  away_score: number
  phase: MatchPhase
}

export interface ScoreboardPushResult {
  match_id: number
  match_name: string
  home_score: number
  away_score: number
  phase: MatchPhase
  phase_display: string
  synced_at: string
}

export interface ScoreboardApi {
  get(matchId: number): Promise<ScoreboardPort | null>
  bind(matchId: number, deviceName: string): Promise<ScoreboardPort>
  reset(matchId: number): Promise<ScoreboardPort>
  unbind(matchId: number): Promise<void>
  /** 设备侧调用：凭端口密钥推送比分与阶段 */
  push(input: ScoreboardPushInput): Promise<ScoreboardPushResult>
}

/** 单场 AI 比赛报告：比赛结束后自动生成，并同步到门户新闻 */
export interface MatchReport {
  match_id: number
  title: string
  generated_at: string
  home: string
  away: string
  score: string
  phase_display: string
  summary: string
  sections: AiReportSection[]
  highlights: string[]
  published: boolean
}

/** 校级比赛运营接口：所有方法都会做本校归属校验与已结束锁定 */
export interface SchoolLiveApi {
  events(matchId: number): Promise<LiveMatchEvent[]>
  createEvent(matchId: number, input: LiveEventInput): Promise<LiveMatchEvent>
  updateEvent(eventId: number, input: LiveEventInput): Promise<LiveMatchEvent>
  removeEvent(eventId: number): Promise<void>
  lineup(matchId: number): Promise<MatchLineup>
  saveLineup(matchId: number, input: LineupInput, version: number): Promise<MatchLineup>
  referees(matchId: number): Promise<MatchReferee[]>
  saveReferees(matchId: number, list: RefereeInput[]): Promise<MatchReferee[]>
  files(matchId: number): Promise<MatchFile[]>
  uploadFile(matchId: number, category: MatchFileCategory, file: File): Promise<MatchFile>
  removeFile(fileId: string): Promise<void>
  downloadFile(fileId: string): Promise<Blob>
  liveLink(matchId: number): Promise<LiveLink | null>
  saveLiveLink(matchId: number, input: LiveLinkInput): Promise<LiveLink>
  clearLiveLink(matchId: number): Promise<void>
  faceRecords(matchId: number): Promise<FaceVerifyRecord[]>
  verifyFace(matchId: number, subject: string, photo: File): Promise<FaceVerifyRecord>
  /** 比分与阶段当前状态（含最后更新来源） */
  state(matchId: number): Promise<MatchStateRecord>
  /** 手动保底录入：直接设置比分与阶段，已结束比赛不可再改 */
  saveState(matchId: number, input: MatchStateInput): Promise<SchoolMatch>
  /** 读取已生成的单场 AI 报告 */
  report(matchId: number): Promise<MatchReport | null>
  /** 生成单场 AI 报告并同步到门户新闻 */
  generateReport(matchId: number): Promise<MatchReport>
}

// ===== 校级管理员 · 本校信息与球队 =====

export interface SchoolProfile {
  school_code: string
  name: string
  city: string
  address: string
  contact: string
  phone: string
  updated_at: string
}

export interface SchoolProfileInput {
  name: string
  address: string
  contact: string
  phone: string
}

export interface SchoolProfileApi {
  get(): Promise<SchoolProfile>
  save(input: SchoolProfileInput): Promise<SchoolProfile>
}

export interface SchoolTeamApi {
  /** 仅返回本校球队，按学校标识码裁剪 */
  list(): Promise<Team[]>
}

/** 校级报名：球队、学校、城市由服务端按 teamId 反查，不信任前端入参 */
export interface SchoolRegistrationInput {
  tournamentId: string
  tournamentName: string
  teamId: string
  players: number
  leader?: string
  phone?: string
  coach?: string
  remark?: string
}

export interface SchoolRegistrationApi {
  /** 仅返回本校球队的报名记录 */
  list(): Promise<Registration[]>
  create(input: SchoolRegistrationInput): Promise<Registration>
  /** 仅允许重新提交本校球队被驳回的报名 */
  resubmit(id: string): Promise<Registration>
}

// ===== 实名认证 =====

export type RealNameStatus = '待审核' | '已认证' | '已驳回'

/** 实名认证记录：只保存脱敏身份证，不落库明文 */
export interface RealNameRecord {
  id: string
  account: string
  name: string
  idCardMasked: string
  phone: string
  status: RealNameStatus
  submittedAt: string
  reviewedAt: string | null
  reviewedBy: string
  rejectReason: string | null
  playerId: string | null
  playerName: string | null
  schoolCode: string
  schoolName: string
  city: string
  district: string
}

export interface RealNameInput {
  name: string
  idCard: string
  phone?: string
}

export interface RealNameQuery {
  status?: RealNameStatus | ''
  keyword?: string
}

export interface IdentityApi {
  /** 当前账号的实名认证记录 */
  mine(): Promise<RealNameRecord | null>
  /** 提交实名信息：身份证校验后仅保存脱敏结果 */
  submit(input: RealNameInput): Promise<RealNameRecord>
  /** 管理端列表：省级看全省、市州看本市、校级看本校 */
  list(query?: RealNameQuery): Promise<RealNameRecord[]>
  /** 审核：通过后按姓名绑定球员档案，驳回需填写原因 */
  review(id: string, action: 'approve' | 'reject', reason?: string): Promise<RealNameRecord>
}

// ===== 数据统计与筛选 =====

export type StatRange = 'all' | 'week' | 'month'

export type DataScopeLevel = 'province' | 'city' | 'district' | 'school'

export interface StatQuery {
  range?: StatRange
  scope?: DataScopeLevel
  city?: string
  district?: string
  schoolCode?: string
  /** 球队名称 */
  team?: string
  /** 比赛（按对手名称筛选） */
  match?: string
}

export interface StatTotals {
  matches: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
}

export interface StatPlayerRow {
  playerId: string
  name: string
  team: string
  school: string
  city: string
  matches: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
}

export interface StatMatchRow {
  id: string
  date: string
  opponent: string
  score: string
  result: string
  playerId: string
  playerName: string
  team: string
  goals: number
  assists: number
  yellowCards: number
  redCards: number
}

export interface StatOptions {
  cities: string[]
  districts: string[]
  schools: { code: string; name: string; city: string; district: string }[]
  teams: string[]
  matches: string[]
}

export interface StatResult {
  totals: StatTotals
  players: StatPlayerRow[]
  matches: StatMatchRow[]
  scopeLabel: string
  rangeLabel: string
  generatedAt: string
}

export interface StatsApi {
  query(query?: StatQuery): Promise<StatResult>
  options(): Promise<StatOptions>
}

// ===== 精彩瞬间（摄影师手动上传） =====

export type MomentCategory = '精彩瞬间' | '进球' | '庆祝' | '花絮'

export type MomentStatus = '待发布' | '已发布' | '已下架'

export interface MatchMoment {
  id: string
  match_id: number
  match_name: string
  title: string
  category: MomentCategory
  description: string
  photographer: string
  status: MomentStatus
  created_at: string
  published_at: string | null
}

export interface MomentInput {
  match_id: number
  title: string
  category: MomentCategory
  description?: string
  photographer?: string
}

export interface MomentQuery {
  status?: MomentStatus | ''
  matchId?: number | null
}

export interface MomentApi {
  /** 管理端列表：管理员看全部，校级账号只看本校比赛 */
  list(query?: MomentQuery): Promise<MatchMoment[]>
  /** 摄影师手动上传图片，上传后为待发布状态 */
  upload(input: MomentInput, file: File): Promise<MatchMoment>
  setStatus(id: string, action: 'publish' | 'offline'): Promise<MatchMoment>
  remove(id: string): Promise<void>
  /** 门户公开列表：只返回已发布瞬间 */
  publicList(matchId?: number): Promise<MatchMoment[]>
  /** 读取图片内容，供页面生成预览地址 */
  image(id: string): Promise<Blob>
}
