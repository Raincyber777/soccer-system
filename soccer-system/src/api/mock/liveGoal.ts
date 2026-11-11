import { ApiError } from '../error'
import type {
  CameraApi,
  CameraDevice,
  CameraInput,
  CameraQuery,
  CameraStatus,
  GoalDetection,
  GoalDetectionApi,
  GoalDetectionQuery,
  GoalReviewResult,
  GoalSide,
  GoalStatus,
  FaceVerifyRecord,
  LineupInput,
  LineupPlayer,
  LiveEventInput,
  LiveEventType,
  LiveLink,
  LiveLinkInput,
  LiveMatchEvent,
  MatchFile,
  MatchFileCategory,
  MatchLineup,
  MatchPhase,
  MatchReferee,
  MatchReport,
  MatchSide,
  MatchStateInput,
  MatchStateRecord,
  PageResult,
  PlayerPosition,
  PortalArticle,
  PublicGoalRecord,
  PublicLiveApi,
  RefereeInput,
  RefereeRole,
  RoiPolygon,
  SchoolGroupType,
  SchoolLiveApi,
  SchoolMatch,
  SchoolMatchApi,
  SchoolMatchInput,
  SchoolMatchStatus,
  SchoolProfile,
  SchoolProfileApi,
  SchoolProfileInput,
  SchoolTeamApi,
  ScoreboardApi,
  ScoreboardPort,
  ScoreboardPushInput,
  ScoreboardPushResult,
} from '../types'
import { readCurrentSession, requireSession } from './session'
import { readTeams } from './team'

// 视觉进球判定 mock 服务：对应门户管理端「AI 进球待审核」「摄像设备」与公开端进球记录
// 判定、设备与实时比分均落在 localStorage；确认审核会写入进球事件并联动比分
// 审核不可逆：已确认 / 已驳回的记录再次审核返回 40009

const DETECTION_KEY = 'soccer-goal-detections'
const CAMERA_KEY = 'soccer-cameras'
const SCORE_KEY = 'soccer-live-scores'
const MATCH_KEY = 'soccer-live-matches'

/** 门户赛程与直播共用的比赛基础数据：保证比赛 ID、对阵与门户赛程一致 */
export interface LiveMatch {
  id: number
  group: string
  round: string
  home: string
  away: string
  score: string
  time: string
  venue: string
  status: string
  home_team_id: string | null
  away_team_id: string | null
  home_school_code: string | null
  away_school_code: string | null
  home_score: number
  away_score: number
  version: number
  created_by: string
  /** 比赛阶段（上半场 / 中场休息 / 下半场），旧数据缺省时按 status 推导 */
  phase?: string
}

const MATCH_SEED: LiveMatch[] = [
  { id: 1, group: '小学组', round: '第 1 轮', home: '实小少年队', away: '城关小学', score: '5 : 2', time: '2026-10-12 10:00', venue: '市体育中心副场', status: '已结束', home_team_id: null, away_team_id: null, home_school_code: null, away_school_code: null, home_score: 5, away_score: 2, version: 1, created_by: 'admin001' },
  { id: 2, group: '高校组', round: '第 1 轮', home: '成都体育学院', away: '西南交通大学', score: '1 : 0', time: '2026-10-17 15:00', venue: '成都体育学院足球场', status: '已结束', home_team_id: null, away_team_id: null, home_school_code: null, away_school_code: null, home_score: 1, away_score: 0, version: 1, created_by: 'admin001' },
  { id: 3, group: '高校组', round: '第 1 轮', home: '四川大学', away: '川师大队', score: '2 : 0', time: '2026-10-18 15:00', venue: '四川大学足球场', status: '已结束', home_team_id: null, away_team_id: null, home_school_code: null, away_school_code: null, home_score: 2, away_score: 0, version: 1, created_by: 'admin001' },
  { id: 4, group: '中学组', round: '第 1 轮', home: '实验中学', away: '一中', score: '2 : 0', time: '2026-10-13 15:00', venue: '省青少年足球基地 2 号场', status: '已结束', home_team_id: 'team-001', away_team_id: null, home_school_code: '5101080009', away_school_code: null, home_score: 2, away_score: 0, version: 1, created_by: 'admin001' },
  { id: 5, group: '中学组', round: '第 3 轮', home: '实验中学', away: '市二中', score: '3 : 1', time: '2026-10-22 15:00', venue: '省青少年足球基地 1 号场', status: '已结束', home_team_id: 'team-001', away_team_id: null, home_school_code: '5101080009', away_school_code: null, home_score: 3, away_score: 1, version: 1, created_by: 'admin001' },
  { id: 6, group: '小学组', round: '第 2 轮', home: '实小少年队', away: '朝阳小学', score: '—', time: '2026-10-23 14:00', venue: '市体育中心副场', status: '进行中', home_team_id: null, away_team_id: null, home_school_code: null, away_school_code: null, home_score: 0, away_score: 0, version: 1, created_by: 'admin001' },
  { id: 7, group: '中学组', round: '第 4 轮', home: '师大附中', away: '实验中学', score: '—', time: '2026-10-25 15:00', venue: '省青少年足球基地 1 号场', status: '未开始', home_team_id: null, away_team_id: 'team-001', home_school_code: null, away_school_code: '5101080009', home_score: 0, away_score: 0, version: 1, created_by: 'admin001' },
  { id: 8, group: '高校组', round: '第 2 轮', home: '川师大队', away: '西南交通大学', score: '—', time: '2026-10-26 15:00', venue: '四川师范大学足球场', status: '未开始', home_team_id: null, away_team_id: null, home_school_code: null, away_school_code: null, home_score: 0, away_score: 0, version: 1, created_by: 'admin001' },
  { id: 9, group: '小学组', round: '第 3 轮', home: '城关小学', away: '朝阳小学', score: '—', time: '2026-10-27 10:00', venue: '市体育中心副场', status: '未开始', home_team_id: null, away_team_id: null, home_school_code: null, away_school_code: null, home_score: 0, away_score: 0, version: 1, created_by: 'admin001' },
  { id: 10, group: '中学组', round: '校级比赛', home: '实验中学', away: '师大附中', score: '—', time: '2026-11-12 15:00', venue: '成都市实验中学足球场', status: '未开始', home_team_id: 'team-001', away_team_id: null, home_school_code: '5101080009', away_school_code: null, home_score: 0, away_score: 0, version: 1, created_by: 'school001' },
]

export function matchName(match: LiveMatch): string {
  return `${match.home} vs ${match.away}`
}

const DETECTION_SEED: GoalDetection[] = [
  {
    id: 7,
    match_id: 6,
    match_name: '实小少年队 vs 朝阳小学',
    camera_id: 2,
    camera_name: '西侧球门机位',
    goal_side: 'home',
    goal_side_display: '主队球门',
    scoring_side: 'away',
    scoring_side_display: '客队得分',
    occurred_at: '2026-10-23T14:11:20',
    minute: 11,
    confidence: '0.7800',
    ball_track_id: 12,
    status: 'pending',
    status_display: '待审核',
    evidence_count: 7,
    model_version: 'yolov8n-8.2',
    reviewed_by_name: null,
    reviewed_at: null,
    match_event_id: null,
    created_at: '2026-10-23T14:11:23',
  },
  {
    id: 8,
    match_id: 6,
    match_name: '实小少年队 vs 朝阳小学',
    camera_id: 2,
    camera_name: '西侧球门机位',
    goal_side: 'away',
    goal_side_display: '客队球门',
    scoring_side: 'home',
    scoring_side_display: '主队得分',
    occurred_at: '2026-10-23T14:23:41',
    minute: 23,
    confidence: '0.9120',
    ball_track_id: 19,
    status: 'pending',
    status_display: '待审核',
    evidence_count: 7,
    model_version: 'yolov8n-8.2',
    reviewed_by_name: null,
    reviewed_at: null,
    match_event_id: null,
    created_at: '2026-10-23T14:23:44',
  },
  {
    id: 9,
    match_id: 4,
    match_name: '实验中学 vs 一中',
    camera_id: 1,
    camera_name: '东侧球门机位',
    goal_side: 'away',
    goal_side_display: '客队球门',
    scoring_side: 'home',
    scoring_side_display: '主队得分',
    occurred_at: '2026-10-13T16:07:05',
    minute: 67,
    confidence: '0.6540',
    ball_track_id: 31,
    status: 'pending',
    status_display: '待审核',
    evidence_count: 7,
    model_version: 'yolov8n-8.2',
    reviewed_by_name: null,
    reviewed_at: null,
    match_event_id: null,
    created_at: '2026-10-13T16:07:09',
  },
  {
    id: 10,
    match_id: 5,
    match_name: '实验中学 vs 市二中',
    camera_id: 1,
    camera_name: '东侧球门机位',
    goal_side: 'away',
    goal_side_display: '客队球门',
    scoring_side: 'home',
    scoring_side_display: '主队得分',
    occurred_at: '2026-10-22T15:55:12',
    minute: 55,
    confidence: '0.8830',
    ball_track_id: 44,
    status: 'confirmed',
    status_display: '已确认',
    evidence_count: 7,
    model_version: 'yolov8n-8.2',
    reviewed_by_name: '张管理',
    reviewed_at: '2026-10-22T15:56:30',
    match_event_id: 88,
    created_at: '2026-10-22T15:55:15',
  },
  {
    id: 11,
    match_id: 5,
    match_name: '实验中学 vs 市二中',
    camera_id: 1,
    camera_name: '东侧球门机位',
    goal_side: 'home',
    goal_side_display: '主队球门',
    scoring_side: 'away',
    scoring_side_display: '客队得分',
    occurred_at: '2026-10-22T16:22:03',
    minute: 82,
    confidence: '0.4100',
    ball_track_id: 52,
    status: 'rejected',
    status_display: '已驳回',
    evidence_count: 7,
    model_version: 'yolov8n-8.2',
    reviewed_by_name: '张管理',
    reviewed_at: '2026-10-22T16:24:11',
    match_event_id: null,
    created_at: '2026-10-22T16:22:06',
  },
  {
    id: 12,
    match_id: 6,
    match_name: '实小少年队 vs 朝阳小学',
    camera_id: 2,
    camera_name: '西侧球门机位',
    goal_side: 'home',
    goal_side_display: '主队球门',
    scoring_side: 'away',
    scoring_side_display: '客队得分',
    occurred_at: '2026-10-23T14:06:18',
    minute: 6,
    confidence: '0.9310',
    ball_track_id: 9,
    status: 'confirmed',
    status_display: '已确认',
    evidence_count: 7,
    model_version: 'yolov8n-8.2',
    reviewed_by_name: '张管理',
    reviewed_at: '2026-10-23T14:07:02',
    match_event_id: 87,
    created_at: '2026-10-23T14:06:21',
  },
]

const CAMERA_SEED: CameraDevice[] = [
  {
    id: 1,
    device_id: 'a1b2c3d4e5f6',
    name: '东侧球门机位',
    match_id: 5,
    match_name: '实验中学 vs 市二中',
    stream_url: 'http://192.168.1.50:81/stream',
    status: 'online',
    status_display: '在线',
    last_seen_at: '2026-10-22T16:40:12',
    home_roi: {
      polygon: [
        [0.12, 0.55],
        [0.31, 0.55],
        [0.31, 0.78],
        [0.12, 0.78],
      ],
    },
    away_roi: null,
    pending_count: 0,
  },
  {
    id: 2,
    device_id: 'b2c3d4e5f6a1',
    name: '西侧球门机位',
    match_id: 6,
    match_name: '实小少年队 vs 朝阳小学',
    stream_url: 'http://192.168.1.51:81/stream',
    status: 'online',
    status_display: '在线',
    last_seen_at: '2026-10-23T14:24:50',
    home_roi: null,
    away_roi: {
      polygon: [
        [0.66, 0.52],
        [0.86, 0.52],
        [0.86, 0.76],
        [0.66, 0.76],
      ],
    },
    pending_count: 0,
  },
  {
    id: 3,
    device_id: 'c3d4e5f6a1b2',
    name: '备用机位',
    match_id: null,
    match_name: null,
    stream_url: 'http://192.168.1.52:81/stream',
    status: 'offline',
    status_display: '离线',
    last_seen_at: '2026-10-20T09:12:33',
    home_roi: null,
    away_roi: null,
    pending_count: 0,
  },
]

type LiveScore = { home: number; away: number }
type ScoreBook = Record<string, LiveScore>

const SCORE_SEED: ScoreBook = {
  '4': { home: 0, away: 0 },
  '5': { home: 2, away: 1 },
  '6': { home: 0, away: 1 },
}

const CAMERA_STATUS_TEXT: Record<CameraStatus, string> = {
  online: '在线',
  offline: '离线',
  disabled: '已停用',
}

const REVIEWER_NAMES: Record<string, string> = {
  admin001: '张管理',
  super001: '省管理员',
  school001: '实验中学管理员',
}

function delay(ms = 260) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function nowIso() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function readList<T>(key: string, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      writeList(key, seed)
      return clone(seed)
    }
    const parsed = JSON.parse(raw) as T[]
    return Array.isArray(parsed) ? parsed : clone(seed)
  } catch {
    return clone(seed)
  }
}

function writeList<T>(key: string, list: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // 隐私模式写入失败时保持内存数据可用
  }
}

function loadDetections(): GoalDetection[] {
  return readList(DETECTION_KEY, DETECTION_SEED)
}

function saveDetections(list: GoalDetection[]) {
  writeList(DETECTION_KEY, list)
}

function loadCameras(): CameraDevice[] {
  return readList(CAMERA_KEY, CAMERA_SEED)
}

function saveCameras(list: CameraDevice[]) {
  writeList(CAMERA_KEY, list)
}

function loadMatches(): LiveMatch[] {
  return readList(MATCH_KEY, MATCH_SEED)
}

function saveMatches(list: LiveMatch[]) {
  writeList(MATCH_KEY, list)
}

/** 比赛数据对外只读入口：门户赛程与直播共用，新建比赛后立即反映到门户 */
export function readMatches(): LiveMatch[] {
  return loadMatches()
}

const GROUP_TEXT: Record<SchoolGroupType, string> = {
  university: '高校组',
  middle_school: '中学组',
  primary_school: '小学组',
}
const GROUP_BY_TEXT: Record<string, SchoolGroupType> = {
  高校组: 'university',
  中学组: 'middle_school',
  小学组: 'primary_school',
}
const MATCH_STATUS_TEXT: Record<SchoolMatchStatus, string> = {
  not_started: '未开始',
  live: '进行中',
  finished: '已结束',
}
const MATCH_STATUS_BY_TEXT: Record<string, SchoolMatchStatus> = {
  未开始: 'not_started',
  进行中: 'live',
  已结束: 'finished',
}

const PHASE_TEXT: Record<MatchPhase, string> = {
  not_started: '未开始',
  first_half: '上半场',
  half_time: '中场休息',
  second_half: '下半场',
  finished: '已结束',
}
const PHASE_BY_TEXT: Record<string, MatchPhase> = {
  未开始: 'not_started',
  上半场: 'first_half',
  中场休息: 'half_time',
  下半场: 'second_half',
  已结束: 'finished',
}

/** 阶段只允许向前推进：上半场 → 中场休息 → 下半场 → 已结束 */
const PHASE_NEXT: Record<MatchPhase, MatchPhase[]> = {
  not_started: ['first_half'],
  first_half: ['half_time', 'second_half', 'finished'],
  half_time: ['second_half', 'finished'],
  second_half: ['finished'],
  finished: [],
}

const PHASE_STATUS: Record<MatchPhase, string> = {
  not_started: '未开始',
  first_half: '进行中',
  half_time: '进行中',
  second_half: '进行中',
  finished: '已结束',
}

const SOURCE_TEXT: Record<MatchStateRecord['source'], string> = {
  manual: '手动录入',
  scoreboard: '计分板推送',
  event: '事件联动',
  system: '系统',
}

/** 读取比赛阶段：旧数据没有 phase 时按比赛状态兜底 */
function phaseOf(match: LiveMatch): MatchPhase {
  return PHASE_BY_TEXT[match.phase ?? ''] ?? (match.status === '已结束'
    ? 'finished'
    : match.status === '未开始'
      ? 'not_started'
      : 'first_half')
}


function belongsToSchool(match: LiveMatch, schoolCode: string): boolean {
  return match.home_school_code === schoolCode || match.away_school_code === schoolCode
}

/** 校级账号的学校标识码；未绑定学校时返回空串 */
function schoolCodeOf(session: { role: string; schoolCode?: string }): string {
  return session.role === 'school' ? session.schoolCode ?? '' : ''
}

function requireSchool(action = '举办比赛') {
  const session = requireSession()
  if (session.role !== 'school') throw new ApiError(40300, `仅校级管理员可${action}`)
  const schoolCode = session.schoolCode ?? ''
  if (!schoolCode) throw new ApiError(20004, `当前账号未绑定学校，不能${action}`)
  return { session, schoolCode }
}

function loadScores(): ScoreBook {
  try {
    const raw = localStorage.getItem(SCORE_KEY)
    if (!raw) {
      saveScores(SCORE_SEED)
      return clone(SCORE_SEED)
    }
    const parsed = JSON.parse(raw) as ScoreBook
    return parsed && typeof parsed === 'object' ? parsed : clone(SCORE_SEED)
  } catch {
    return clone(SCORE_SEED)
  }
}

function saveScores(scores: ScoreBook) {
  try {
    localStorage.setItem(SCORE_KEY, JSON.stringify(scores))
  } catch {
    // 隐私模式写入失败时保持内存数据可用
  }
}

function scoreOf(scores: ScoreBook, matchId: number): LiveScore {
  return scores[String(matchId)] ?? { home: 0, away: 0 }
}

/** 仅 admin / super 可访问视觉判定管理接口，用户端一律 40300 */
function requireStaff() {
  const session = requireSession()
  if (session.role !== 'admin' && session.role !== 'super') {
    throw new ApiError(40300, '仅管理员可访问视觉进球判定接口')
  }
  return session
}

/** 进球判定允许 admin / super，以及具备 live:event:manage 的校级管理员 */
function requireReviewer() {
  const session = requireSession()
  if (session.role === 'admin' || session.role === 'super') return session
  if (session.role === 'school') {
    if (!(session.permissions ?? []).includes('live:event:manage')) {
      throw new ApiError(40300, '缺少 live:event:manage 权限')
    }
    if (!session.schoolCode) throw new ApiError(20004, '当前账号未绑定学校')
    return session
  }
  throw new ApiError(40300, '仅管理员可访问进球判定接口')
}

function reviewerName(account: string) {
  return REVIEWER_NAMES[account] ?? '管理员'
}

function sideText(side: GoalSide, suffix = '') {
  return side === 'home' ? `主队${suffix}` : `客队${suffix}`
}

function withPendingCount(camera: CameraDevice, detections: GoalDetection[]): CameraDevice {
  return {
    ...clone(camera),
    pending_count: detections.filter((d) => d.camera_id === camera.id && d.status === 'pending').length,
  }
}

function normalizeRoi(input: RoiPolygon | null): RoiPolygon | null {
  if (!input) return null
  const points = Array.isArray(input.polygon) ? input.polygon : []
  if (points.length < 3) throw new ApiError(40000, '球门 ROI 至少需要 3 个顶点')
  if (points.length > 32) throw new ApiError(40000, '球门 ROI 顶点过多')
  const polygon = points.map((point) => {
    const x = point[0]
    const y = point[1]
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
      throw new ApiError(40000, '球门 ROI 坐标需在 0 ~ 1 之间')
    }
    return [Number(x.toFixed(4)), Number(y.toFixed(4))] as [number, number]
  })
  return { polygon }
}

function nextEventId(detections: GoalDetection[]): number {
  const max = detections.reduce((acc, d) => (d.match_event_id && d.match_event_id > acc ? d.match_event_id : acc), 87)
  return max + 1
}

/** mock 证据图：生成带球门与足球轨迹的 SVG 帧，真实接口返回 image/jpeg */
function evidenceBlob(detection: GoalDetection, index: number): Blob {
  const total = Math.max(1, detection.evidence_count)
  const progress = total === 1 ? 0 : index / (total - 1)
  const ballX = 150 + progress * 190
  const ballY = 268 - progress * 96
  const offset = ((index - 3) * 0.4).toFixed(1)
  const label = index === 0 ? '触发前 2 秒' : index === total - 1 ? '触发后 1 秒' : `${offset} 秒`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#173d28"/>
  <rect x="0" y="0" width="640" height="360" fill="url(#g)"/>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a6b45"/>
      <stop offset="1" stop-color="#123021"/>
    </linearGradient>
  </defs>
  <g stroke="rgba(255,255,255,0.45)" stroke-width="3" fill="none">
    <path d="M60 70 H580 V330 H60 Z"/>
    <path d="M60 200 H580"/>
    <circle cx="320" cy="200" r="58"/>
  </g>
  <g stroke="#f5f5f5" stroke-width="7" fill="none">
    <path d="M470 120 V300"/>
    <path d="M470 120 H590"/>
    <path d="M470 300 H590"/>
    <path d="M590 120 V300"/>
  </g>
  <g stroke="rgba(255,214,102,0.9)" stroke-width="2" stroke-dasharray="7 6" fill="none">
    <path d="M470 128 H582 V292 H470"/>
  </g>
  <path d="M470 140 H560" stroke="rgba(255,255,255,0.25)" stroke-width="2"/>
  <circle cx="${ballX.toFixed(1)}" cy="${ballY.toFixed(1)}" r="7" fill="#fff"/>
  <circle cx="${ballX.toFixed(1)}" cy="${ballY.toFixed(1)}" r="13" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="2"/>
  <rect x="18" y="18" width="250" height="34" rx="6" fill="rgba(0,0,0,0.55)"/>
  <text x="32" y="41" fill="#fff" font-size="16" font-family="sans-serif">证据帧 ${index + 1}/${total} · ${label}</text>
  <rect x="18" y="306" width="330" height="34" rx="6" fill="rgba(0,0,0,0.55)"/>
  <text x="32" y="329" fill="#d9f2e2" font-size="14" font-family="sans-serif">判定 #${detection.id} · ${detection.camera_name} · ${detection.minute}'</text>
</svg>`
  return new Blob([svg], { type: 'image/svg+xml' })
}

export const mockGoalDetectionApi: GoalDetectionApi = {
  async list(query: GoalDetectionQuery = {}) {
    await delay()
    const session = requireReviewer()
    const page = Math.max(1, Math.trunc(query.page ?? 1))
    const pageSize = Math.min(100, Math.max(1, Math.trunc(query.page_size ?? 20)))
    let filtered = loadDetections().filter((d) => {
      if (query.status && d.status !== query.status) return false
      if (query.match_id && d.match_id !== query.match_id) return false
      return true
    })
    // 校级账号只能看到本校比赛产生的判定，学校范围由会话决定，不信任前端传参
    const schoolCode = schoolCodeOf(session)
    if (schoolCode) {
      const ownIds = new Set(readMatches().filter((m) => belongsToSchool(m, schoolCode)).map((m) => m.id))
      filtered = filtered.filter((d) => ownIds.has(d.match_id))
    }
    filtered.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    const total = filtered.length
    const pages = Math.max(1, Math.ceil(total / pageSize))
    const start = (page - 1) * pageSize
    const result: PageResult<GoalDetection> = {
      total,
      page,
      page_size: pageSize,
      pages,
      results: clone(filtered.slice(start, start + pageSize)),
    }
    return result
  },

  async review(id: number, action: 'confirm' | 'reject'): Promise<GoalReviewResult> {
    await delay(320)
    const session = requireReviewer()
    if (action !== 'confirm' && action !== 'reject') throw new ApiError(40000, '审核动作不合法')

    const list = loadDetections()
    const index = list.findIndex((d) => d.id === id)
    if (index < 0) throw new ApiError(40400, '判定记录不存在')
    const detection = list[index]
    if (!detection) throw new ApiError(40400, '判定记录不存在')
    if (detection.status !== 'pending') throw new ApiError(40009, '该记录已审核过，请刷新列表')

    const matches = readMatches()
    const match = matches.find((m) => m.id === detection.match_id)
    if (!match) throw new ApiError(40400, '关联比赛不存在')
    const schoolCode = schoolCodeOf(session)
    if (schoolCode && !belongsToSchool(match, schoolCode)) {
      throw new ApiError(20004, '只能审核本校比赛产生的进球判定')
    }

    const reviewedAt = nowIso()
    const reviewer = reviewerName(session.account)
    const scores = loadScores()
    const live = scoreOf(scores, detection.match_id)

    if (action === 'reject') {
      detection.status = 'rejected'
      detection.status_display = '已驳回'
      detection.reviewed_by_name = reviewer
      detection.reviewed_at = reviewedAt
      saveDetections(list)
      return {
        id: detection.id,
        status: 'rejected',
        match_event_id: detection.match_event_id,
        minute: detection.minute,
        scoring_side: detection.scoring_side,
        live_home_score: live.home,
        live_away_score: live.away,
        reviewed_by_name: reviewer,
        reviewed_at: reviewedAt,
      }
    }

    if (match.status === '已结束') throw new ApiError(40002, '比赛已结束，不能补记进球')

    detection.status = 'confirmed'
    detection.status_display = '已确认'
    detection.reviewed_by_name = reviewer
    detection.reviewed_at = reviewedAt
    detection.match_event_id = nextEventId(list)
    const next: LiveScore =
      detection.scoring_side === 'home'
        ? { home: live.home + 1, away: live.away }
        : { home: live.home, away: live.away + 1 }
    scores[String(detection.match_id)] = next
    saveDetections(list)
    saveScores(scores)
    // 比分同步回比赛记录，门户赛程与详情立即可见
    match.home_score = next.home
    match.away_score = next.away
    match.score = `${next.home} : ${next.away}`
    match.version += 1
    saveMatches(matches)

    return {
      id: detection.id,
      status: 'confirmed',
      match_event_id: detection.match_event_id,
      minute: detection.minute,
      scoring_side: detection.scoring_side,
      live_home_score: next.home,
      live_away_score: next.away,
      reviewed_by_name: reviewer,
      reviewed_at: reviewedAt,
    }
  },

  async evidence(id: number, index: number) {
    await delay(180)
    const session = requireReviewer()
    const detection = loadDetections().find((d) => d.id === id)
    if (!detection) throw new ApiError(40400, '判定记录不存在')
    const schoolCode = schoolCodeOf(session)
    if (schoolCode) {
      const match = readMatches().find((m) => m.id === detection.match_id)
      if (!match || !belongsToSchool(match, schoolCode)) {
        throw new ApiError(20004, '只能查看本校比赛产生的证据图')
      }
    }
    if (!Number.isInteger(index) || index < 0 || index >= detection.evidence_count) {
      throw new ApiError(40400, '证据图不存在')
    }
    return evidenceBlob(detection, index)
  },
}

export const mockCameraApi: CameraApi = {
  async list(query: CameraQuery = {}) {
    await delay()
    // 摄像设备与 ESP32 联调仅对赛事管理员开放，校级端不提供该能力
    requireStaff()
    const detections = loadDetections()
    return loadCameras()
      .filter((camera) => {
        if (query.match_id && camera.match_id !== query.match_id) return false
        if (query.status && camera.status !== query.status) return false
        return true
      })
      .map((camera) => withPendingCount(camera, detections))
  },

  async update(id: number, input: CameraInput): Promise<CameraDevice> {
    await delay(320)
    requireStaff()
    const list = loadCameras()
    const index = list.findIndex((c) => c.id === id)
    if (index < 0) throw new ApiError(40400, '摄像设备不存在')
    const camera = list[index]
    if (!camera) throw new ApiError(40400, '摄像设备不存在')

    const name = input.name.trim()
    if (!name) throw new ApiError(40000, '请填写设备名称')
    if (name.length > 30) throw new ApiError(40000, '设备名称不能超过 30 个字符')

    const streamUrl = input.stream_url.trim()
    if (!/^https?:\/\/\S+$/.test(streamUrl)) throw new ApiError(40000, '流地址需以 http:// 或 https:// 开头')
    if (streamUrl.length > 200) throw new ApiError(40000, '流地址不能超过 200 个字符')

    const status: CameraStatus = input.status
    if (!['online', 'offline', 'disabled'].includes(status)) throw new ApiError(40000, '设备状态不合法')

    const match = input.match_id === null ? null : readMatches().find((m) => m.id === input.match_id)
    if (input.match_id !== null && !match) throw new ApiError(40400, '绑定的比赛不存在')

    camera.name = name
    camera.match_id = match ? match.id : null
    camera.match_name = match ? matchName(match) : null
    camera.stream_url = streamUrl
    camera.home_roi = normalizeRoi(input.home_roi)
    camera.away_roi = normalizeRoi(input.away_roi)
    camera.status = status
    camera.status_display = CAMERA_STATUS_TEXT[status]
    saveCameras(list)
    return withPendingCount(camera, loadDetections())
  },
}

export const mockPublicLiveApi: PublicLiveApi = {
  async goalDetections(matchId: number): Promise<PublicGoalRecord[]> {
    await delay(200)
    if (!readMatches().some((m) => m.id === matchId)) throw new ApiError(40400, '比赛不存在')
    return loadDetections()
      .filter((d) => d.match_id === matchId && d.status === 'confirmed')
      .sort((a, b) => a.minute - b.minute)
      .map((d) => ({
        id: d.id,
        minute: d.minute,
        scoring_side: d.scoring_side,
        scoring_side_display: sideText(d.scoring_side),
        occurred_at: d.occurred_at,
      }))
  },

  async matchReport(matchId: number) {
    await delay()
    const match = readMatches().find((m) => m.id === matchId)
    if (!match) return null
    const saved = readMap<MatchReport>(REPORT_KEY, {})[String(matchId)]
    if (saved) return clone(saved)
    if (match.status !== '已结束') return null
    // 历史已结束比赛首次访问时按现有事件补生成，保证门户详情都有 AI 报告
    return clone(generateMatchReportInternal(match))
  },
}

/** 管理端筛选比赛用：比赛 ID + 对阵名称；校级账号只返回本校比赛 */
export function liveMatchOptions(): { id: number; name: string }[] {
  const session = readCurrentSession()
  const schoolCode = session ? schoolCodeOf(session) : ''
  const matches = schoolCode
    ? readMatches().filter((m) => belongsToSchool(m, schoolCode))
    : readMatches()
  return matches.map((m) => ({ id: m.id, name: matchName(m) }))
}

// ===== 校级管理员 · 举办比赛 =====

function toSchoolMatch(match: LiveMatch): SchoolMatch {
  const groupType = GROUP_BY_TEXT[match.group] ?? 'middle_school'
  const status = MATCH_STATUS_BY_TEXT[match.status] ?? 'not_started'
  const phase = phaseOf(match)
  return {
    id: match.id,
    group_type: groupType,
    group_type_display: GROUP_TEXT[groupType],
    home_team_id: match.home_team_id,
    away_team_id: match.away_team_id,
    home_team_name: match.home,
    away_team_name: match.away,
    match_time: match.time,
    venue: match.venue,
    status,
    status_display: MATCH_STATUS_TEXT[status],
    phase,
    phase_display: PHASE_TEXT[phase],
    home_score: match.home_score,
    away_score: match.away_score,
    version: match.version,
    created_by: match.created_by,
  }
}

interface ValidatedMatch {
  homeName: string
  awayName: string
  homeTeamId: string | null
  awayTeamId: string | null
  homeSchoolCode: string | null
  awaySchoolCode: string | null
  groupType: SchoolGroupType
  timeText: string
  venue: string
}

/** 校验比赛入参：缺少球队 / 时间 10001，跨校 20004 */
function validateMatchInput(input: SchoolMatchInput, schoolCode: string): ValidatedMatch {
  const homeName = (input.home_team_name ?? '').trim()
  const awayName = (input.away_team_name ?? '').trim()
  if (!homeName || !awayName) throw new ApiError(10001, '请填写主客队名称')
  if (homeName.length > 40 || awayName.length > 40) throw new ApiError(10001, '球队名称不能超过 40 个字符')
  if (!input.match_time || !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(input.match_time)) {
    throw new ApiError(10001, '请选择比赛时间')
  }
  const venue = (input.venue ?? '').trim()
  if (venue.length > 60) throw new ApiError(10001, '比赛场地不能超过 60 个字符')

  const teams = readTeams()
  const homeTeam = input.home_team_id ? teams.find((t) => t.id === input.home_team_id) : null
  const awayTeam = input.away_team_id ? teams.find((t) => t.id === input.away_team_id) : null
  if (input.home_team_id && !homeTeam) throw new ApiError(10001, '主队球队不存在')
  if (input.away_team_id && !awayTeam) throw new ApiError(10001, '客队球队不存在')
  if (!homeTeam && !awayTeam) throw new ApiError(10001, '比赛至少需要一支本校球队')

  const ownsHome = homeTeam?.schoolCode === schoolCode
  const ownsAway = awayTeam?.schoolCode === schoolCode
  if (!ownsHome && !ownsAway) throw new ApiError(20004, '至少一支参赛球队需属于本校')

  return {
    homeName,
    awayName,
    homeTeamId: homeTeam?.id ?? null,
    awayTeamId: awayTeam?.id ?? null,
    homeSchoolCode: homeTeam?.schoolCode ?? null,
    awaySchoolCode: awayTeam?.schoolCode ?? null,
    groupType: input.group_type,
    timeText: input.match_time.replace('T', ' ').slice(0, 16),
    venue,
  }
}

/** 举办比赛时的球队下拉：附带所属学校，便于区分本校与对手 */
export function schoolTeamOptions(): { id: string; name: string; school: string; schoolCode: string }[] {
  return readTeams().map((t) => ({ id: t.id, name: t.name, school: t.school, schoolCode: t.schoolCode }))
}

export const mockSchoolMatchApi: SchoolMatchApi = {
  async list() {
    await delay()
    const { schoolCode } = requireSchool()
    return readMatches()
      .filter((m) => belongsToSchool(m, schoolCode))
      .sort((a, b) => a.time.localeCompare(b.time))
      .map((m) => toSchoolMatch(m))
  },

  async create(input: SchoolMatchInput): Promise<SchoolMatch> {
    await delay(320)
    const { session, schoolCode } = requireSchool()
    const data = validateMatchInput(input, schoolCode)
    const matches = readMatches()
    const id = matches.reduce((max, m) => Math.max(max, m.id), 0) + 1
    const created: LiveMatch = {
      id,
      group: GROUP_TEXT[data.groupType],
      round: '校级比赛',
      home: data.homeName,
      away: data.awayName,
      score: '—',
      time: data.timeText,
      venue: data.venue,
      status: '未开始',
      home_team_id: data.homeTeamId,
      away_team_id: data.awayTeamId,
      home_school_code: data.homeSchoolCode,
      away_school_code: data.awaySchoolCode,
      home_score: 0,
      away_score: 0,
      version: 1,
      created_by: session.account,
      phase: '未开始',
    }
    matches.push(created)
    saveMatches(matches)
    return toSchoolMatch(created)
  },

  async update(id: number, input: SchoolMatchInput, version: number): Promise<SchoolMatch> {
    await delay(320)
    const { schoolCode } = requireSchool()
    const matches = readMatches()
    const index = matches.findIndex((m) => m.id === id)
    if (index < 0) throw new ApiError(40400, '比赛不存在')
    const match = matches[index]
    if (!match) throw new ApiError(40400, '比赛不存在')
    if (!belongsToSchool(match, schoolCode)) throw new ApiError(20004, '只能编辑本校比赛')
    if (match.status === '已结束') throw new ApiError(40002, '比赛已结束，不能修改')
    if (match.version !== version) throw new ApiError(40009, '比赛信息已更新，请刷新后重试')

    const data = validateMatchInput(input, schoolCode)
    match.group = GROUP_TEXT[data.groupType]
    match.home = data.homeName
    match.away = data.awayName
    match.home_team_id = data.homeTeamId
    match.away_team_id = data.awayTeamId
    match.home_school_code = data.homeSchoolCode
    match.away_school_code = data.awaySchoolCode
    match.time = data.timeText
    match.venue = data.venue
    match.version += 1
    saveMatches(matches)
    return toSchoolMatch(match)
  },

  async remove(id: number): Promise<void> {
    await delay(280)
    const { schoolCode } = requireSchool()
    const matches = readMatches()
    const match = matches.find((m) => m.id === id)
    if (!match) throw new ApiError(40400, '比赛不存在')
    if (!belongsToSchool(match, schoolCode)) throw new ApiError(20004, '只能删除本校比赛')
    if (match.status !== '未开始') throw new ApiError(40002, '比赛已开始，不能删除')
    saveMatches(matches.filter((m) => m.id !== id))
  },

  async setStatus(id: number, action: 'start' | 'finish'): Promise<SchoolMatch> {
    await delay(300)
    const { session, schoolCode } = requireSchool()
    const match = readMatches().find((m) => m.id === id)
    if (!match) throw new ApiError(40400, '比赛不存在')
    if (!belongsToSchool(match, schoolCode)) throw new ApiError(20004, '只能操作本校比赛')

    if (action === 'start') {
      if (match.status !== '未开始') throw new ApiError(40002, '只有未开始的比赛可以开赛')
    } else if (action === 'finish') {
      if (match.status !== '进行中') throw new ApiError(40002, '只有进行中的比赛可以结束')
    } else {
      throw new ApiError(40000, '比赛状态操作不合法')
    }

    const updated = applyMatchState(
      id,
      {
        home_score: match.home_score,
        away_score: match.away_score,
        phase: action === 'start' ? 'first_half' : 'finished',
      },
      { source: 'manual', operator: session.account },
    )
    return toSchoolMatch(updated)
  },
}

// ===== 校级管理员 · 比赛运营（事件 / 阵容 / 裁判 / 文件 / 直播 / 人脸核验） =====

const EVENT_KEY = 'soccer-live-events'
const LINEUP_KEY = 'soccer-live-lineups'
const REFEREE_KEY = 'soccer-live-referees'
const FILE_KEY = 'soccer-live-files'
const LINK_KEY = 'soccer-live-links'
const FACE_KEY = 'soccer-live-face-records'
const PROFILE_KEY = 'soccer-school-profiles'
const STATE_KEY = 'soccer-match-states'
const SCOREBOARD_KEY = 'soccer-scoreboard-ports'
const REPORT_KEY = 'soccer-match-reports'
const AUTO_NEWS_KEY = 'soccer-portal-auto-news'

const EVENT_TYPES: LiveEventType[] = ['进球', '黄牌', '红牌', '换人', '文字']
const PLAYER_POSITIONS: PlayerPosition[] = ['门将', '后卫', '中场', '前锋']
const REFEREE_ROLES: RefereeRole[] = ['主裁判', '助理裁判', '第四官员']
const FILE_CATEGORIES: MatchFileCategory[] = ['签到表', '记录确认单', '裁判报告单']
export const LIVE_PLATFORMS = ['抖音', '视频号', 'B站', '其他']
const FILE_MAX = 10 * 1024 * 1024
const FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

// 文件内容持久化：localStorage 单域约 5MB，放不下 10MB 级文件，所以内容单独存 IndexedDB，
// localStorage 只保留元数据；IndexedDB 不可用时（隐私模式等）退化到内存，仅当前会话可下载
const FILE_DB = 'soccer-live-file-db'
const FILE_STORE = 'blobs'
const fileBlobs = new Map<string, Blob>()

function openFileDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前环境不支持 IndexedDB'))
      return
    }
    const request = indexedDB.open(FILE_DB, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(FILE_STORE)) db.createObjectStore(FILE_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 打开失败'))
  })
}

function runFileStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openFileDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(FILE_STORE, mode)
        const request = run(tx.objectStore(FILE_STORE))
        tx.oncomplete = () => {
          db.close()
          resolve(request.result)
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error ?? request.error ?? new Error('IndexedDB 读写失败'))
        }
        tx.onabort = () => {
          db.close()
          reject(tx.error ?? new Error('IndexedDB 事务已中断'))
        }
      }),
  )
}

/** 内容先落库再写元数据，避免刷新后出现「有记录无内容」 */
async function saveFileContent(id: string, blob: Blob) {
  try {
    await runFileStore('readwrite', (store) => store.put(blob, id))
  } catch {
    fileBlobs.set(id, blob)
  }
}

async function readFileContent(id: string): Promise<Blob | null> {
  try {
    const blob = await runFileStore<Blob | undefined>('readonly', (store) => store.get(id))
    if (blob) return blob
  } catch {
    // IndexedDB 不可用时走内存兜底
  }
  return fileBlobs.get(id) ?? null
}

async function removeFileContent(id: string) {
  fileBlobs.delete(id)
  try {
    await runFileStore('readwrite', (store) => store.delete(id))
  } catch {
    // 内容删除失败不阻断元数据清理
  }
}

function nowText() {
  return nowIso().replace('T', ' ').slice(0, 16)
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 隐私模式写入失败时保持内存数据可用
  }
}

function readMap<T>(key: string, seed: Record<string, T>): Record<string, T> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      writeJson(key, seed)
      return clone(seed)
    }
    const parsed = JSON.parse(raw) as Record<string, T>
    return parsed && typeof parsed === 'object' ? parsed : clone(seed)
  } catch {
    return clone(seed)
  }
}

const LINEUP_SEED: Record<string, MatchLineup> = {
  '5': {
    match_id: 5,
    home: [
      { id: 'lp-1', name: '赵一鸣', jersey_no: 1, position: '门将' },
      { id: 'lp-2', name: '陈昊', jersey_no: 5, position: '后卫' },
      { id: 'lp-3', name: '李泽宇', jersey_no: 8, position: '中场' },
      { id: 'lp-4', name: '孙浩然', jersey_no: 7, position: '中场' },
      { id: 'lp-5', name: '王小磊', jersey_no: 9, position: '前锋' },
    ],
    away: [],
    version: 1,
    updated_at: '2026-10-22 14:30',
  },
}

const REFEREE_SEED: Record<string, MatchReferee[]> = {
  '5': [
    { id: 'ref-1', name: '刘建国', role: '主裁判', phone: '13900000001' },
    { id: 'ref-2', name: '王强', role: '助理裁判', phone: '13900000002' },
  ],
}

const LINK_SEED: Record<string, LiveLink> = {
  '6': {
    match_id: 6,
    platform: '视频号',
    url: 'https://live.example.com/green-1002',
    updated_by: 'admin001',
    updated_at: '2026-10-23 13:50',
  },
}

const PROFILE_SEED: Record<string, SchoolProfile> = {
  '5101080009': {
    school_code: '5101080009',
    name: '成都市实验中学',
    city: '成都市',
    address: '成都市成华区一环路东三段 1 号',
    contact: '张老师',
    phone: '13800000000',
    updated_at: '2026-10-20 15:10',
  },
}

/** 权限点 + 学校绑定双校验：校级账号缺少权限点返回 40300 */
function requirePermission(permission: string) {
  const { session, schoolCode } = requireSchool('运营比赛')
  if (!(session.permissions ?? []).includes(permission)) {
    throw new ApiError(40300, `缺少 ${permission} 权限，无法执行该操作`)
  }
  return { session, schoolCode }
}

/** 比赛归属校验：他校比赛 20004；writable 时已结束比赛 40002 */
function requireOwnMatch(matchId: number, schoolCode: string, writable = false) {
  const match = readMatches().find((m) => m.id === matchId)
  if (!match) throw new ApiError(40400, '比赛不存在')
  if (!belongsToSchool(match, schoolCode)) throw new ApiError(20004, '只能运营本校比赛')
  if (writable && match.status === '已结束') throw new ApiError(40002, '比赛已结束，写操作已锁定')
  return match
}

/** 进球事件与 AI 审核共用同一份比分，保证门户与详情一致 */
function adjustScore(matchId: number, side: MatchSide, delta: number, operator = 'system') {
  const matches = readMatches()
  const match = matches.find((m) => m.id === matchId)
  if (!match) return
  const scores = loadScores()
  const live = scoreOf(scores, matchId)
  const next = { home: live.home, away: live.away }
  if (side === 'home') next.home = Math.max(0, next.home + delta)
  else next.away = Math.max(0, next.away + delta)
  scores[String(matchId)] = next
  saveScores(scores)
  match.home_score = next.home
  match.away_score = next.away
  match.score = `${next.home} : ${next.away}`
  match.version += 1
  saveMatches(matches)
  writeStateRecord(match, 'event', operator)
}

function readStateRecords(): Record<string, MatchStateRecord> {
  return readMap<MatchStateRecord>(STATE_KEY, {})
}

function writeStateRecord(match: LiveMatch, source: MatchStateRecord['source'], operator: string) {
  const map = readStateRecords()
  const phase = phaseOf(match)
  map[String(match.id)] = {
    match_id: match.id,
    home_score: match.home_score,
    away_score: match.away_score,
    phase,
    phase_display: PHASE_TEXT[phase],
    source,
    source_display: SOURCE_TEXT[source],
    updated_by: operator,
    updated_at: nowText(),
  }
  writeJson(STATE_KEY, map)
}

/** 读取当前状态；旧比赛没有状态记录时按比赛数据兜底 */
function readStateRecord(match: LiveMatch): MatchStateRecord {
  const saved = readStateRecords()[String(match.id)]
  if (saved) return { ...saved }
  const phase = phaseOf(match)
  return {
    match_id: match.id,
    home_score: match.home_score,
    away_score: match.away_score,
    phase,
    phase_display: PHASE_TEXT[phase],
    source: 'system',
    source_display: SOURCE_TEXT.system,
    updated_by: match.created_by,
    updated_at: match.time,
  }
}

function validateStateInput(input: MatchStateInput) {
  const home = Number(input.home_score)
  const away = Number(input.away_score)
  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
    throw new ApiError(10001, '比分需为不小于 0 的整数')
  }
  if (home > 99 || away > 99) throw new ApiError(10001, '单个比分不能超过 99')
  if (!PHASE_TEXT[input.phase]) throw new ApiError(10001, '比赛阶段不合法')
  if (input.phase === 'not_started' && (home > 0 || away > 0)) {
    throw new ApiError(10001, '比赛未开始，不能录入比分')
  }
  return { home, away }
}

/** 比分与阶段的唯一写入口：手动录入、事件联动、计分板推送都走这里 */
function applyMatchState(
  matchId: number,
  input: MatchStateInput,
  meta: { source: MatchStateRecord['source']; operator: string },
): LiveMatch {
  const matches = readMatches()
  const match = matches.find((m) => m.id === matchId)
  if (!match) throw new ApiError(40400, '比赛不存在')
  if (match.status === '已结束') throw new ApiError(40002, '比赛已结束，比分与阶段已锁定')

  const { home, away } = validateStateInput(input)
  const current = phaseOf(match)
  if (input.phase !== current && !PHASE_NEXT[current].includes(input.phase)) {
    const allowed = PHASE_NEXT[current].map((phase) => PHASE_TEXT[phase]).join('、')
    throw new ApiError(40002, `当前为「${PHASE_TEXT[current]}」，只能推进到 ${allowed || '无'}`)
  }

  match.home_score = home
  match.away_score = away
  match.score = input.phase === 'not_started' ? '—' : `${home} : ${away}`
  match.phase = PHASE_TEXT[input.phase]
  match.status = PHASE_STATUS[input.phase]
  match.version += 1
  saveMatches(matches)

  const scores = loadScores()
  scores[String(matchId)] = { home, away }
  saveScores(scores)
  writeStateRecord(match, meta.source, meta.operator)

  // 比赛结束即自动生成 AI 报告并同步门户新闻，无需人工录入
  if (input.phase === 'finished' && current !== 'finished') {
    const report = generateMatchReportInternal(match)
    publishReportArticle(match, report)
  }
  return match
}

// ===== 单场 AI 比赛报告 =====

function buildMatchReport(match: LiveMatch): MatchReport {
  const events = readList<LiveMatchEvent>(EVENT_KEY, []).filter((event) => event.match_id === match.id)
  const goals = events.filter((event) => event.type === '进球').sort((a, b) => a.minute - b.minute)
  const yellowCards = events.filter((event) => event.type === '黄牌')
  const redCards = events.filter((event) => event.type === '红牌')
  const substitutions = events.filter((event) => event.type === '换人')
  const notes = events.filter((event) => event.type === '文字')
  const homeGoals = goals.filter((goal) => goal.side === 'home')
  const awayGoals = goals.filter((goal) => goal.side === 'away')
  const result = match.home_score > match.away_score
    ? `${match.home}获胜`
    : match.home_score < match.away_score
      ? `${match.away}获胜`
      : '双方战平'

  const scorerMap = new Map<string, { team: string; goals: number }>()
  for (const goal of goals) {
    const key = goal.player_name
    const team = goal.side === 'home' ? match.home : match.away
    const current = scorerMap.get(key) ?? { team, goals: 0 }
    scorerMap.set(key, { ...current, goals: current.goals + 1 })
  }
  const topScorers = [...scorerMap.entries()].sort((a, b) => b[1].goals - a[1].goals).slice(0, 3)

  const goalTimeline = goals.length
    ? goals
        .map((goal) => `${goal.minute}' ${goal.side === 'home' ? match.home : match.away} ${goal.player_name}`)
        .join('；')
    : '双方均未取得进球'

  const scoreText = `${match.home_score} : ${match.away_score}`
  const summary =
    `${match.home} ${scoreText} ${match.away}，${result}。` +
    `全场共产生 ${goals.length} 粒进球（主队 ${homeGoals.length} 球、客队 ${awayGoals.length} 球）、` +
    `${yellowCards.length} 张黄牌${redCards.length ? `、${redCards.length} 张红牌` : ''}、${substitutions.length} 次换人。`

  const sections = [
    {
      title: '比赛进程',
      content: `本场比分为 ${scoreText}，${result}。进球时间线：${goalTimeline}。` +
        `${notes.length ? `另有 ${notes.length} 条现场文字记录，可在比赛详情中查看。` : ''}`,
    },
    {
      title: '关键球员',
      content: topScorers.length
        ? topScorers
            .map(([name, item], index) => `第 ${index + 1} 位：${name}（${item.team}，${item.goals} 球）`)
            .join('；')
        : '本场未记录进球球员，建议在比赛事件中补充进球与助攻信息，便于后续球员统计。',
    },
    {
      title: '纪律与换人',
      content: yellowCards.length || redCards.length || substitutions.length
        ? `黄牌 ${yellowCards.length} 张${
            yellowCards.length
              ? `（${yellowCards.map((card) => `${card.player_name} ${card.minute}'`).join('、')}）`
              : ''
          }；红牌 ${redCards.length} 张${
            redCards.length
              ? `（${redCards.map((card) => `${card.player_name} ${card.minute}'`).join('、')}）`
              : ''
          }；换人 ${substitutions.length} 次。`
        : '本场未记录红黄牌与换人，比赛过程较为平稳。',
    },
    {
      title: 'AI 观察',
      content: homeGoals.length === awayGoals.length
        ? '双方进球分布均衡，攻防转换节奏接近，后续交锋可重点关注中场控制与定位球机会。'
        : `${homeGoals.length > awayGoals.length ? match.home : match.away}在进攻效率上占优，` +
          `建议对手在下一轮加强禁区内防守与二点球保护。`,
    },
  ]

  const highlights = [
    `最终比分 ${match.home} ${scoreText} ${match.away}`,
    topScorers[0]
      ? `最佳射手：${topScorers[0][0]}（${topScorers[0][1].team}，${topScorers[0][1].goals} 球）`
      : '本场暂无进球球员记录',
    `纪律数据：黄牌 ${yellowCards.length} 张、红牌 ${redCards.length} 张`,
  ]

  return {
    match_id: match.id,
    title: `${match.home} ${scoreText} ${match.away}｜AI 比赛报告`,
    generated_at: nowText(),
    home: match.home,
    away: match.away,
    score: scoreText,
    phase_display: PHASE_TEXT[phaseOf(match)],
    summary,
    sections,
    highlights,
    published: false,
  }
}

function generateMatchReportInternal(match: LiveMatch): MatchReport {
  const report = buildMatchReport(match)
  const map = readMap<MatchReport>(REPORT_KEY, {})
  map[String(match.id)] = report
  writeJson(REPORT_KEY, map)
  return report
}

/** 报告同步到门户新闻：同一场比赛重复生成时覆盖旧文章，不产生重复新闻 */
function publishReportArticle(match: LiveMatch, report: MatchReport): MatchReport {
  const article: PortalArticle = {
    tag: 'AI 战报',
    title: report.title,
    source: 'AI 赛事报告 · 自动生成',
    date: report.generated_at.slice(0, 10),
    summary: report.summary,
    body: [
      report.summary,
      ...report.sections.map((section) => `${section.title}：${section.content}`),
      `比赛亮点：${report.highlights.join('；')}`,
    ],
    matchId: match.id,
    autoGenerated: true,
  }
  const list = readList<PortalArticle>(AUTO_NEWS_KEY, [])
  writeList(AUTO_NEWS_KEY, [article, ...list.filter((item) => item.matchId !== match.id)])

  const published: MatchReport = { ...report, published: true }
  const map = readMap<MatchReport>(REPORT_KEY, {})
  map[String(match.id)] = published
  writeJson(REPORT_KEY, map)
  return published
}

/** 门户新闻读取入口：自动生成的 AI 战报排在管理员发布内容之前 */
export function readAutoNews(): PortalArticle[] {
  return readList<PortalArticle>(AUTO_NEWS_KEY, [])
}

// ===== 计分板专用端口 =====

function readPorts(): Record<string, ScoreboardPort> {
  return readMap<ScoreboardPort>(SCOREBOARD_KEY, {})
}

function writePorts(ports: Record<string, ScoreboardPort>) {
  writeJson(SCOREBOARD_KEY, ports)
}

function createToken(matchId: number) {
  return `SB-${matchId}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

function validateDeviceName(name: string) {
  const value = (name ?? '').trim()
  if (!value) throw new ApiError(10001, '请填写计分板设备名称')
  if (value.length > 30) throw new ApiError(10001, '设备名称不能超过 30 个字符')
  return value
}

export const mockScoreboardApi: ScoreboardApi = {
  async get(matchId: number) {
    await delay()
    const { schoolCode } = requirePermission('live:match:update')
    requireOwnMatch(matchId, schoolCode)
    return readPorts()[String(matchId)] ?? null
  },

  async bind(matchId: number, deviceName: string) {
    await delay(300)
    const { schoolCode } = requirePermission('live:match:update')
    requireOwnMatch(matchId, schoolCode, true)
    const name = validateDeviceName(deviceName)
    const ports = readPorts()
    const existing = ports[String(matchId)]
    const port: ScoreboardPort = {
      match_id: matchId,
      device_name: name,
      token: existing?.token ?? createToken(matchId),
      enabled: true,
      last_sync_at: existing?.last_sync_at ?? null,
      last_sync_by: existing?.last_sync_by ?? '',
    }
    ports[String(matchId)] = port
    writePorts(ports)
    return { ...port }
  },

  async reset(matchId: number) {
    await delay(280)
    const { schoolCode } = requirePermission('live:match:update')
    requireOwnMatch(matchId, schoolCode, true)
    const ports = readPorts()
    const existing = ports[String(matchId)]
    const port: ScoreboardPort = {
      match_id: matchId,
      device_name: existing?.device_name ?? '计分板设备',
      token: createToken(matchId),
      enabled: true,
      last_sync_at: null,
      last_sync_by: '',
    }
    ports[String(matchId)] = port
    writePorts(ports)
    return { ...port }
  },

  async unbind(matchId: number) {
    await delay(240)
    const { schoolCode } = requirePermission('live:match:update')
    requireOwnMatch(matchId, schoolCode, true)
    const ports = readPorts()
    delete ports[String(matchId)]
    writePorts(ports)
  },

  async push(input: ScoreboardPushInput): Promise<ScoreboardPushResult> {
    await delay(200)
    const token = (input.token ?? '').trim()
    if (!token) throw new ApiError(10001, '缺少计分板端口密钥')
    const ports = readPorts()
    const entry = Object.values(ports).find((port) => port.token === token)
    if (!entry) throw new ApiError(40300, '计分板端口密钥无效')
    if (!entry.enabled) throw new ApiError(40002, '计分板端口已停用')
    const match = readMatches().find((item) => item.id === entry.match_id)
    if (!match) throw new ApiError(40400, '比赛不存在')

    const updated = applyMatchState(
      match.id,
      { home_score: input.home_score, away_score: input.away_score, phase: input.phase },
      { source: 'scoreboard', operator: entry.device_name },
    )
    const syncedAt = nowText()
    entry.last_sync_at = syncedAt
    entry.last_sync_by = entry.device_name
    ports[String(match.id)] = entry
    writePorts(ports)

    return {
      match_id: match.id,
      match_name: matchName(updated),
      home_score: updated.home_score,
      away_score: updated.away_score,
      phase: phaseOf(updated),
      phase_display: PHASE_TEXT[phaseOf(updated)],
      synced_at: syncedAt,
    }
  },
}

function validateEvent(input: LiveEventInput) {
  if (!EVENT_TYPES.includes(input.type)) throw new ApiError(10001, '请选择事件类型')
  if (!Number.isFinite(input.minute) || input.minute < 0 || input.minute > 130) {
    throw new ApiError(10001, '比赛时间需在 0 - 130 分钟之间')
  }
  if (input.side !== 'home' && input.side !== 'away') throw new ApiError(10001, '请选择事件所属球队')
  const name = (input.player_name ?? '').trim()
  if (input.type !== '文字' && !name) throw new ApiError(10001, '请填写球员姓名')
  if (name.length > 20) throw new ApiError(10001, '球员姓名不能超过 20 个字符')
  const note = (input.note ?? '').trim()
  if (note.length > 100) throw new ApiError(10001, '事件说明不能超过 100 个字符')
  return { name: name || '—', note: note || null }
}

function validateLineupSide(players: LineupPlayer[], label: string): LineupPlayer[] {
  if (players.length > 11) throw new ApiError(10001, `${label}首发不能超过 11 人`)
  const names = new Set<string>()
  const numbers = new Set<number>()
  return players.map((player) => {
    const name = (player.name ?? '').trim()
    if (!name) throw new ApiError(10001, `${label}球员姓名不能为空`)
    if (name.length > 20) throw new ApiError(10001, '球员姓名不能超过 20 个字符')
    if (!Number.isInteger(player.jersey_no) || player.jersey_no < 1 || player.jersey_no > 99) {
      throw new ApiError(10001, '球衣号码需为 1 - 99 的整数')
    }
    if (!PLAYER_POSITIONS.includes(player.position)) throw new ApiError(10001, '球员位置不合法')
    if (names.has(name)) throw new ApiError(10001, `${label}存在重复球员`)
    if (numbers.has(player.jersey_no)) throw new ApiError(10001, `${label}球衣号码重复`)
    names.add(name)
    numbers.add(player.jersey_no)
    return { ...player, name }
  })
}

function validateReferees(list: RefereeInput[]): RefereeInput[] {
  if (list.length > 4) throw new ApiError(10001, '裁判组最多 4 人')
  const counts: Record<RefereeRole, number> = { 主裁判: 0, 助理裁判: 0, 第四官员: 0 }
  const names = new Set<string>()
  const result = list.map((item) => {
    const name = (item.name ?? '').trim()
    if (!name) throw new ApiError(10001, '请填写裁判姓名')
    if (name.length > 20) throw new ApiError(10001, '裁判姓名不能超过 20 个字符')
    if (!REFEREE_ROLES.includes(item.role)) throw new ApiError(10001, '裁判角色不合法')
    const phone = (item.phone ?? '').trim()
    if (phone && !/^1\d{10}$/.test(phone)) throw new ApiError(10001, '裁判手机号格式不正确')
    if (names.has(name)) throw new ApiError(10001, '裁判姓名重复')
    names.add(name)
    counts[item.role] += 1
    return { name, role: item.role, phone }
  })
  if (counts.主裁判 > 1) throw new ApiError(10001, '主裁判最多 1 人')
  if (counts.助理裁判 > 2) throw new ApiError(10001, '助理裁判最多 2 人')
  if (counts.第四官员 > 1) throw new ApiError(10001, '第四官员最多 1 人')
  return result
}

export const mockSchoolLiveApi: SchoolLiveApi = {
  async events(matchId: number) {
    await delay()
    const { schoolCode } = requirePermission('live:event:manage')
    requireOwnMatch(matchId, schoolCode)
    return readList<LiveMatchEvent>(EVENT_KEY, [])
      .filter((e) => e.match_id === matchId)
      .sort((a, b) => b.minute - a.minute || b.id - a.id)
  },

  async createEvent(matchId: number, input: LiveEventInput) {
    await delay(280)
    const { session, schoolCode } = requirePermission('live:event:manage')
    const match = requireOwnMatch(matchId, schoolCode, true)
    if (match.status !== '进行中') throw new ApiError(40002, '只有进行中的比赛可以录入事件')
    const data = validateEvent(input)
    const list = readList<LiveMatchEvent>(EVENT_KEY, [])
    const id = list.reduce((max, e) => Math.max(max, e.id), 0) + 1
    const event: LiveMatchEvent = {
      id,
      match_id: matchId,
      type: input.type,
      minute: input.minute,
      side: input.side,
      side_display: sideText(input.side),
      player_name: data.name,
      note: data.note,
      created_by: session.account,
      created_at: nowText(),
    }
    list.push(event)
    writeList(EVENT_KEY, list)
    if (event.type === '进球') adjustScore(matchId, event.side, 1, session.account)
    return { ...event }
  },

  async updateEvent(eventId: number, input: LiveEventInput) {
    await delay(280)
    const { session, schoolCode } = requirePermission('live:event:manage')
    const list = readList<LiveMatchEvent>(EVENT_KEY, [])
    const index = list.findIndex((e) => e.id === eventId)
    if (index < 0) throw new ApiError(40400, '事件不存在或已被删除')
    const event = list[index]
    if (!event) throw new ApiError(40400, '事件不存在或已被删除')
    const match = requireOwnMatch(event.match_id, schoolCode, true)
    if (match.status !== '进行中') throw new ApiError(40002, '只有进行中的比赛可以修改事件')
    const data = validateEvent(input)

    const wasGoal = event.type === '进球'
    const oldSide = event.side
    event.type = input.type
    event.minute = input.minute
    event.side = input.side
    event.side_display = sideText(input.side)
    event.player_name = data.name
    event.note = data.note
    writeList(EVENT_KEY, list)

    if (wasGoal) adjustScore(event.match_id, oldSide, -1, session.account)
    if (event.type === '进球') adjustScore(event.match_id, event.side, 1, session.account)
    return { ...event }
  },

  async removeEvent(eventId: number) {
    await delay(240)
    const { session, schoolCode } = requirePermission('live:event:manage')
    const list = readList<LiveMatchEvent>(EVENT_KEY, [])
    const index = list.findIndex((e) => e.id === eventId)
    if (index < 0) throw new ApiError(40400, '事件不存在或已被删除')
    const event = list[index]
    if (!event) throw new ApiError(40400, '事件不存在或已被删除')
    const match = requireOwnMatch(event.match_id, schoolCode, true)
    if (match.status !== '进行中') throw new ApiError(40002, '只有进行中的比赛可以删除事件')
    list.splice(index, 1)
    writeList(EVENT_KEY, list)
    if (event.type === '进球') adjustScore(event.match_id, event.side, -1, session.account)
  },

  async lineup(matchId: number) {
    await delay()
    const { schoolCode } = requirePermission('live:match:update')
    requireOwnMatch(matchId, schoolCode)
    const map = readMap<MatchLineup>(LINEUP_KEY, LINEUP_SEED)
    return (
      map[String(matchId)] ?? {
        match_id: matchId,
        home: [],
        away: [],
        version: 1,
        updated_at: null,
      }
    )
  },

  async saveLineup(matchId: number, input: LineupInput, version: number) {
    await delay(300)
    const { schoolCode } = requirePermission('live:match:update')
    requireOwnMatch(matchId, schoolCode, true)
    const home = validateLineupSide(input.home, '主队')
    const away = validateLineupSide(input.away, '客队')
    const map = readMap<MatchLineup>(LINEUP_KEY, LINEUP_SEED)
    const current = map[String(matchId)] ?? {
      match_id: matchId,
      home: [],
      away: [],
      version: 1,
      updated_at: null,
    }
    if (current.version !== version) throw new ApiError(40009, '阵容已被更新，请刷新后重试')
    const next: MatchLineup = {
      match_id: matchId,
      home,
      away,
      version: current.version + 1,
      updated_at: nowText(),
    }
    map[String(matchId)] = next
    writeJson(LINEUP_KEY, map)
    return clone(next)
  },

  async referees(matchId: number) {
    await delay()
    const { schoolCode } = requirePermission('live:referee:manage')
    requireOwnMatch(matchId, schoolCode)
    const map = readMap<MatchReferee[]>(REFEREE_KEY, REFEREE_SEED)
    return clone(map[String(matchId)] ?? [])
  },

  async saveReferees(matchId: number, list: RefereeInput[]) {
    await delay(300)
    const { schoolCode } = requirePermission('live:referee:manage')
    requireOwnMatch(matchId, schoolCode, true)
    const data = validateReferees(list)
    const map = readMap<MatchReferee[]>(REFEREE_KEY, REFEREE_SEED)
    const saved: MatchReferee[] = data.map((item, index) => ({
      id: `ref-${Date.now()}-${index}`,
      name: item.name,
      role: item.role,
      phone: item.phone,
    }))
    map[String(matchId)] = saved
    writeJson(REFEREE_KEY, map)
    return clone(saved)
  },

  async files(matchId: number) {
    await delay()
    const { schoolCode } = requirePermission('live:file:manage')
    requireOwnMatch(matchId, schoolCode)
    return readList<MatchFile>(FILE_KEY, [])
      .filter((f) => f.match_id === matchId)
      .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))
  },

  async uploadFile(matchId: number, category: MatchFileCategory, file: File) {
    await delay(420)
    const { session, schoolCode } = requirePermission('live:file:manage')
    requireOwnMatch(matchId, schoolCode, true)
    if (!FILE_CATEGORIES.includes(category)) throw new ApiError(10001, '文件类别不合法')
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    const allowedExt = ['.pdf', '.jpg', '.jpeg', '.png']
    if (!allowedExt.includes(ext) || (file.type && !FILE_TYPES.includes(file.type))) {
      throw new ApiError(10006, '文件格式不支持，仅支持 pdf / jpg / jpeg / png')
    }
    if (file.size > FILE_MAX) throw new ApiError(10007, '单个文件不能超过 10MB')
    const meta: MatchFile = {
      id: `file-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      match_id: matchId,
      category,
      name: file.name.slice(0, 80),
      size: file.size,
      uploaded_by: session.account,
      uploaded_at: nowText(),
    }
    await saveFileContent(meta.id, file)
    const list = readList<MatchFile>(FILE_KEY, [])
    list.push(meta)
    writeList(FILE_KEY, list)
    return { ...meta }
  },

  async removeFile(fileId: string) {
    await delay(240)
    const { schoolCode } = requirePermission('live:file:manage')
    const list = readList<MatchFile>(FILE_KEY, [])
    const index = list.findIndex((f) => f.id === fileId)
    if (index < 0) throw new ApiError(40400, '文件不存在或已被删除')
    const meta = list[index]
    if (!meta) throw new ApiError(40400, '文件不存在或已被删除')
    requireOwnMatch(meta.match_id, schoolCode, true)
    list.splice(index, 1)
    writeList(FILE_KEY, list)
    await removeFileContent(fileId)
  },

  async downloadFile(fileId: string) {
    await delay(220)
    const { schoolCode } = requirePermission('live:file:manage')
    const meta = readList<MatchFile>(FILE_KEY, []).find((f) => f.id === fileId)
    if (!meta) throw new ApiError(40400, '文件不存在或已被删除')
    requireOwnMatch(meta.match_id, schoolCode)
    const content = await readFileContent(fileId)
    if (content) return content
    return new Blob([`演示环境未找到该文件内容：${meta.name}`], { type: 'text/plain' })
  },

  async liveLink(matchId: number) {
    await delay()
    const { schoolCode } = requirePermission('live:link:manage')
    requireOwnMatch(matchId, schoolCode)
    const map = readMap<LiveLink>(LINK_KEY, LINK_SEED)
    const link = map[String(matchId)]
    return link ? { ...link } : null
  },

  async saveLiveLink(matchId: number, input: LiveLinkInput) {
    await delay(300)
    const { session, schoolCode } = requirePermission('live:link:manage')
    requireOwnMatch(matchId, schoolCode, true)
    const platform = (input.platform ?? '').trim()
    if (!LIVE_PLATFORMS.includes(platform)) throw new ApiError(10001, '请选择直播平台')
    const url = (input.url ?? '').trim()
    if (!/^https?:\/\/\S+$/i.test(url)) throw new ApiError(10001, '请填写以 http:// 或 https:// 开头的直播链接')
    if (url.length > 200) throw new ApiError(10001, '直播链接不能超过 200 个字符')
    const map = readMap<LiveLink>(LINK_KEY, LINK_SEED)
    const link: LiveLink = {
      match_id: matchId,
      platform,
      url,
      updated_by: session.account,
      updated_at: nowText(),
    }
    map[String(matchId)] = link
    writeJson(LINK_KEY, map)
    return { ...link }
  },

  async clearLiveLink(matchId: number) {
    await delay(220)
    const { schoolCode } = requirePermission('live:link:manage')
    requireOwnMatch(matchId, schoolCode, true)
    const map = readMap<LiveLink>(LINK_KEY, LINK_SEED)
    delete map[String(matchId)]
    writeJson(LINK_KEY, map)
  },

  async faceRecords(matchId: number) {
    await delay()
    const { schoolCode } = requirePermission('live:face:manage')
    requireOwnMatch(matchId, schoolCode)
    return readList<FaceVerifyRecord>(FACE_KEY, [])
      .filter((r) => r.match_id === matchId)
      .sort((a, b) => b.verified_at.localeCompare(a.verified_at))
  },

  async verifyFace(matchId: number, subject: string, photo: File) {
    await delay(500)
    const { session, schoolCode } = requirePermission('live:face:manage')
    requireOwnMatch(matchId, schoolCode, true)
    const name = (subject ?? '').trim()
    if (!name) throw new ApiError(10001, '请填写核验对象姓名')
    if (name.length > 20) throw new ApiError(10001, '核验对象姓名不能超过 20 个字符')
    const ext = photo.name.toLowerCase().slice(photo.name.lastIndexOf('.'))
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      throw new ApiError(10006, '照片格式不支持，仅支持 jpg / jpeg / png')
    }
    if (photo.size > FILE_MAX) throw new ApiError(10007, '照片不能超过 10MB')

    // 演示用稳定评分：同一姓名与文件名总是得到同一相似度，便于复现
    const seed = `${name}|${photo.name}|${photo.size}`
    let hash = 0
    for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 1000
    const score = 60 + (hash % 40)
    const record: FaceVerifyRecord = {
      id: `face-${Date.now()}`,
      match_id: matchId,
      subject: name,
      status: score >= 75 ? '通过' : '未通过',
      score,
      operator: session.account,
      verified_at: nowText(),
    }
    const list = readList<FaceVerifyRecord>(FACE_KEY, [])
    list.push(record)
    writeList(FACE_KEY, list)
    return { ...record }
  },

  async state(matchId: number) {
    await delay()
    const { schoolCode } = requirePermission('live:match:update')
    const match = requireOwnMatch(matchId, schoolCode)
    return readStateRecord(match)
  },

  async saveState(matchId: number, input: MatchStateInput) {
    await delay(300)
    const { session, schoolCode } = requirePermission('live:match:update')
    requireOwnMatch(matchId, schoolCode, true)
    const updated = applyMatchState(matchId, input, { source: 'manual', operator: session.account })
    return toSchoolMatch(updated)
  },

  async report(matchId: number) {
    await delay()
    const { schoolCode } = requirePermission('live:match:update')
    requireOwnMatch(matchId, schoolCode)
    const saved = readMap<MatchReport>(REPORT_KEY, {})[String(matchId)]
    return saved ? clone(saved) : null
  },

  async generateReport(matchId: number) {
    await delay(420)
    const { schoolCode } = requirePermission('live:match:update')
    const match = requireOwnMatch(matchId, schoolCode)
    if (match.status !== '已结束') throw new ApiError(40002, '比赛结束后才能生成 AI 报告')
    const report = generateMatchReportInternal(match)
    return publishReportArticle(match, report)
  },
}

// ===== 校级管理员 · 本校信息与球队 =====

function defaultProfile(fallbackName: string, schoolCode: string): SchoolProfile {
  return {
    school_code: schoolCode,
    name: fallbackName || '本校',
    city: '',
    address: '',
    contact: '',
    phone: '',
    updated_at: '',
  }
}

export const mockSchoolProfileApi: SchoolProfileApi = {
  async get() {
    await delay()
    const { session, schoolCode } = requireSchool('查看本校信息')
    const map = readMap<SchoolProfile>(PROFILE_KEY, PROFILE_SEED)
    return map[schoolCode] ?? defaultProfile(session.schoolName ?? '', schoolCode)
  },

  async save(input: SchoolProfileInput) {
    await delay(320)
    const { session, schoolCode } = requireSchool('编辑本校资料')
    const name = (input.name ?? '').trim()
    if (!name) throw new ApiError(10001, '请填写学校名称')
    if (name.length > 40) throw new ApiError(10001, '学校名称不能超过 40 个字符')
    const address = (input.address ?? '').trim()
    if (address.length > 60) throw new ApiError(10001, '学校地址不能超过 60 个字符')
    const contact = (input.contact ?? '').trim()
    if (contact.length > 20) throw new ApiError(10001, '联系人不能超过 20 个字符')
    const phone = (input.phone ?? '').trim()
    if (phone && !/^1\d{10}$/.test(phone)) throw new ApiError(10001, '联系电话格式不正确')

    const map = readMap<SchoolProfile>(PROFILE_KEY, PROFILE_SEED)
    const current = map[schoolCode] ?? defaultProfile(session.schoolName ?? '', schoolCode)
    const next: SchoolProfile = {
      ...current,
      name,
      address,
      contact,
      phone,
      updated_at: nowText(),
    }
    map[schoolCode] = next
    writeJson(PROFILE_KEY, map)
    return { ...next }
  },
}

export const mockSchoolTeamApi: SchoolTeamApi = {
  async list() {
    await delay()
    const { schoolCode } = requireSchool('查看本校球队')
    return readTeams()
      .filter((team) => team.schoolCode === schoolCode)
      .sort((a, b) => a.name.localeCompare(b.name))
  },
}
