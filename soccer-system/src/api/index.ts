import { mockAuthApi } from './mock/auth'
import { liveAuthApi } from './live/auth'
import { liveRegistrationApi } from './live/registration'
import { liveTournamentApi } from './live/tournament'
import { liveTeamApi } from './live/team'
import { liveTeamRosterApi } from './live/teamRoster'
import { livePlayerApi } from './live/player'
import { liveSchoolTeamApi } from './live/schoolTeam'
import { liveSchoolMatchApi } from './live/schoolMatch'
import { liveSchoolLiveApi } from './live/schoolLive'
import { livePortalApi } from './live/portal'
import { mockTournamentApi, mockSchoolTournamentApi } from './mock/tournament'
import { mockRegistrationApi, mockSchoolRegistrationApi } from './mock/registration'
import { mockTeamApi, mockTeamRosterApi } from './mock/team'
import { mockPlayerApi } from './mock/player'
import { mockSummaryApi } from './mock/summary'
import { mockMatchEventApi } from './mock/matchEvent'
import { mockReportApi } from './mock/report'
import { mockRankingApi } from './mock/ranking'
import { mockIdentityApi } from './mock/identity'
import { mockStatsApi } from './mock/stats'
import { mockMomentApi } from './mock/moments'
import { mockPortalApi } from './mock/portal'
import { mockCameraApi, mockGoalDetectionApi, mockPublicLiveApi, mockSchoolMatchApi, mockSchoolLiveApi, mockSchoolProfileApi, mockSchoolTeamApi, mockScoreboardApi } from './mock/liveGoal'
import type { AuthApi } from './types'

// 接口总开关：默认关闭真实接口，全部走本地 mock；后续联调时设置 VITE_USE_MOCK=false 即可切换
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export const authApi: AuthApi = USE_MOCK ? mockAuthApi : liveAuthApi

// 已接通后端：认证、报名、赛事列表、球队与成员维护、球员库、校级比赛与运营、门户赛程
// 未接通对象（新闻、榜单、视觉判定等）后端暂无对应接口，保持 mock
export const tournamentApi = USE_MOCK ? mockTournamentApi : liveTournamentApi
export const registrationApi = USE_MOCK ? mockRegistrationApi : liveRegistrationApi
export const teamApi = USE_MOCK ? mockTeamApi : liveTeamApi
export const playerApi = USE_MOCK ? mockPlayerApi : livePlayerApi
export const summaryApi = mockSummaryApi
export const matchEventApi = mockMatchEventApi
export const reportApi = mockReportApi
export const rankingApi = mockRankingApi
export const portalApi = USE_MOCK ? mockPortalApi : livePortalApi
// 实名认证：队员与账号一对一，身份证仅保存脱敏值
export const identityApi = mockIdentityApi
// 数据统计：按省 / 市 / 区 / 校范围与时间、球队、比赛维度筛选
export const statsApi = mockStatsApi
// 精彩瞬间：摄影师手动上传，管理员发布后门户展示
export const momentApi = mockMomentApi
// 视觉进球判定：待审核队列、证据图、摄像设备与公开端进球记录，均按后端契约同名实现
export const goalDetectionApi = mockGoalDetectionApi
export const cameraApi = mockCameraApi
export const publicLiveApi = mockPublicLiveApi
// 校级管理员：仅能操作本校比赛（学校范围由后端按会话解析，不信任前端入参）
export const schoolMatchApi = USE_MOCK ? mockSchoolMatchApi : liveSchoolMatchApi
// 校级比赛运营：事件 / 阵容 / 裁判 / 文件 / 直播链接 / 人脸核验已接后端，AI 报告与手动比分暂缺
export const schoolLiveApi = USE_MOCK ? mockSchoolLiveApi : liveSchoolLiveApi
// 计分板专用端口：设备凭密钥推送比分与阶段
export const scoreboardApi = mockScoreboardApi
// 校级本校信息与本校球队（只读列表）
export const schoolProfileApi = mockSchoolProfileApi
export const schoolTeamApi = USE_MOCK ? mockSchoolTeamApi : liveSchoolTeamApi
// 球队人员：教练组与球员名单，用户端维护自己的球队，校级端维护本校球队
export const teamRosterApi = USE_MOCK ? mockTeamRosterApi : liveTeamRosterApi
// 校级赛事发布：仅能创建、发布、下架本校的校级比赛
export const schoolTournamentApi = mockSchoolTournamentApi
// 校级报名：仅本校球队的报名记录，可代本校球队创建与驳回后重新提交
export const schoolRegistrationApi = mockSchoolRegistrationApi

export { teamCompleteness } from './teamCompleteness'
// 管理端筛选下拉使用：比赛 ID 与对阵名称；接入后端后由比赛接口提供
export { liveMatchOptions, schoolTeamOptions } from './mock/liveGoal'
export { LIVE_PLATFORMS } from './mock/liveGoal'

export type {
  AiReport,
  AiReportSection,
  AuthApi,
  CameraApi,
  CameraDevice,
  CameraInput,
  CameraQuery,
  CameraStatus,
  CoachCategory,
  DataSummary,
  DataScopeLevel,
  DemoAccount,
  FaceVerifyRecord,
  FaceVerifyStatus,
  GoalDetection,
  GoalDetectionApi,
  GoalDetectionQuery,
  GoalReviewResult,
  GoalSide,
  GoalStatus,
  IdentityApi,
  LoginEntry,
  LoginInput,
  LoginResult,
  MatchEvent,
  MatchEventApi,
  MatchEventInput,
  MatchEventQuery,
  MatchEventType,
  MatchFile,
  MatchFileCategory,
  MatchLineup,
  MatchMoment,
  MatchPhase,
  MatchReferee,
  MatchReport,
  MatchSide,
  MatchStateInput,
  MatchStateRecord,
  LiveEventInput,
  LiveEventType,
  LiveLink,
  LiveLinkInput,
  LiveMatchEvent,
  LineupInput,
  LineupPlayer,
  MomentApi,
  MomentCategory,
  MomentInput,
  MomentQuery,
  MomentStatus,
  PageResult,
  Player,
  PlayerApi,
  PlayerDetail,
  PlayerMatchRecord,
  PlayerPosition,
  PlayerPublicStatus,
  PlayerQuery,
  PlayerSeasonStats,
  PlayerTournamentStats,
  PortalApi,
  PortalArticle,
  PortalMatch,
  PublicGoalRecord,
  PublicLiveApi,
  RankingApi,
  RealNameInput,
  RealNameQuery,
  RealNameRecord,
  RealNameStatus,
  RegisterInput,
  Registration,
  RegistrationApi,
  RegistrationInput,
  RegistrationQuery,
  RegistrationStatus,
  ReportApi,
  RoiPolygon,
  ScorerRank,
  SchoolGroupType,
  SchoolLiveApi,
  SchoolMatch,
  SchoolMatchApi,
  SchoolMatchInput,
  SchoolMatchStatus,
  SchoolProfile,
  SchoolProfileApi,
  SchoolProfileInput,
  SchoolRegistrationApi,
  SchoolRegistrationInput,
  SchoolTeamApi,
  SchoolTournamentApi,
  ScoreboardApi,
  ScoreboardPort,
  ScoreboardPushInput,
  ScoreboardPushResult,
  RefereeInput,
  RefereeRole,
  StandingRow,
  StatMatchRow,
  StatOptions,
  StatPlayerRow,
  StatQuery,
  StatRange,
  StatResult,
  StatTotals,
  StatsApi,
  SummaryApi,
  SummaryRow,
  Team,
  TeamApi,
  TeamCoach,
  TeamCoachInput,
  TeamCompleteness,
  TeamImportResult,
  TeamInput,
  TeamPlayer,
  TeamPlayerInput,
  TeamPlayerPosition,
  TeamRosterApi,
  Tournament,
  TournamentApi,
  TournamentInput,
  TournamentLevel,
  TournamentLevelSummary,
  TournamentMaterial,
  TournamentMaterialInput,
  TournamentQuery,
  TournamentStatus,
} from './types'
export { ApiError } from './error'
