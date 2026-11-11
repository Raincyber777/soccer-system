<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ApiError,
  LIVE_PLATFORMS,
  schoolLiveApi,
  schoolMatchApi,
  scoreboardApi,
  type FaceVerifyRecord,
  type LineupPlayer,
  type LiveEventType,
  type LiveLink,
  type LiveMatchEvent,
  type MatchFile,
  type MatchFileCategory,
  type MatchLineup,
  type MatchPhase,
  type MatchReferee,
  type MatchReport,
  type MatchSide,
  type MatchStateRecord,
  type PlayerPosition,
  type SchoolMatch,
  type ScoreboardPort,
  type ScoreboardPushResult,
} from '../../api'
import { useAuth } from '../../stores/auth'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import AppSelect from '../../components/common/AppSelect.vue'
import type { TableColumn } from '../../components/common/types'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const matchId = computed(() => Number(route.params.id))
const match = ref<SchoolMatch | null>(null)
const loading = ref(true)
const loadError = ref('')
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
}

// ===== 标签与权限 =====

type TabKey = 'state' | 'events' | 'lineup' | 'referees' | 'files' | 'live' | 'scoreboard' | 'face' | 'report'

const TABS: { key: TabKey; label: string; permission: string }[] = [
  { key: 'state', label: '比分与阶段', permission: 'live:match:update' },
  { key: 'events', label: '比赛事件', permission: 'live:event:manage' },
  { key: 'lineup', label: '首发阵容', permission: 'live:match:update' },
  { key: 'referees', label: '裁判配置', permission: 'live:referee:manage' },
  { key: 'files', label: '赛事文件', permission: 'live:file:manage' },
  { key: 'live', label: '直播链接', permission: 'live:link:manage' },
  { key: 'scoreboard', label: '计分板接入', permission: 'live:match:update' },
  { key: 'face', label: '人脸核验', permission: 'live:face:manage' },
  { key: 'report', label: 'AI 比赛报告', permission: 'live:match:update' },
]

const permissionSet = computed(() => new Set(auth.state.permissions))
const visibleTabs = computed(() => TABS.filter((tab) => permissionSet.value.has(tab.permission)))
const activeTab = ref<TabKey>('state')

const status = computed(() => match.value?.status ?? 'not_started')
const finished = computed(() => status.value === 'finished')
const running = computed(() => status.value === 'live')
const scoreText = computed(() => {
  if (!match.value || status.value === 'not_started') return '—'
  return `${match.value.home_score} : ${match.value.away_score}`
})

// ===== 比分与阶段（手动保底录入） =====

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
const PHASE_NEXT: Record<MatchPhase, MatchPhase[]> = {
  not_started: ['first_half'],
  first_half: ['half_time', 'second_half', 'finished'],
  half_time: ['second_half', 'finished'],
  second_half: ['finished'],
  finished: [],
}

const stateRecord = ref<MatchStateRecord | null>(null)
const stateSaving = ref(false)
const stateError = ref('')
const stateForm = reactive({ home_score: '0', away_score: '0', phaseLabel: '上半场' })

const phaseOptions = computed(() => {
  const current = match.value?.phase ?? 'not_started'
  return [current, ...PHASE_NEXT[current]].map((phase) => PHASE_TEXT[phase])
})

const mobileUrl = computed(() => `${window.location.origin}/admin/school/mobile/${matchId.value}`)

function applyStateRecord(record: MatchStateRecord) {
  stateRecord.value = record
  stateForm.home_score = String(record.home_score)
  stateForm.away_score = String(record.away_score)
  stateForm.phaseLabel = record.phase_display
}

async function loadState() {
  if (!permissionSet.value.has('live:match:update')) return
  try {
    applyStateRecord(await schoolLiveApi.state(matchId.value))
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '比分与阶段加载失败', 'error')
  }
}

async function saveState(overridePhase?: MatchPhase) {
  if (!match.value || stateSaving.value) return
  stateError.value = ''
  const phase = overridePhase ?? PHASE_BY_TEXT[stateForm.phaseLabel]
  if (!phase) {
    stateError.value = '请选择比赛阶段'
    return
  }
  const home = Number(stateForm.home_score)
  const away = Number(stateForm.away_score)
  if (!Number.isInteger(home) || home < 0 || home > 99 || !Number.isInteger(away) || away < 0 || away > 99) {
    stateError.value = '比分需为 0 - 99 的整数'
    return
  }
  if (phase === 'finished' && !window.confirm('确认结束比赛？结束后比分与阶段将锁定，并自动生成 AI 比赛报告。')) return

  stateSaving.value = true
  try {
    const saved = await schoolLiveApi.saveState(matchId.value, { home_score: home, away_score: away, phase })
    match.value = saved
    await Promise.all([loadState(), loadEvents(), loadReport()])
    showMessage(
      phase === 'finished'
        ? '比赛已结束，AI 比赛报告已自动生成并同步到门户新闻。'
        : `比分与阶段已更新为 ${saved.home_score} : ${saved.away_score} · ${saved.phase_display}。`,
    )
  } catch (error) {
    stateError.value = error instanceof ApiError ? error.message : '比分与阶段保存失败'
  } finally {
    stateSaving.value = false
  }
}

async function copyMobileLink() {
  try {
    await navigator.clipboard.writeText(mobileUrl.value)
    showMessage('手机端上传链接已复制。')
  } catch {
    showMessage(`手机端上传地址：${mobileUrl.value}`)
  }
}

// ===== 计分板专用端口 =====

const port = ref<ScoreboardPort | null>(null)
const portLoading = ref(false)
const portSaving = ref(false)
const portError = ref('')
const deviceName = ref('主计分板')
const pushResult = ref<ScoreboardPushResult | null>(null)
const simForm = reactive({ home_score: '0', away_score: '0', phaseLabel: '上半场' })
const SIM_PHASE_OPTIONS = ['上半场', '中场休息', '下半场', '已结束']

function applySimPhase(phase: MatchPhase) {
  simForm.phaseLabel = PHASE_TEXT[phase] === '未开始' ? '上半场' : PHASE_TEXT[phase]
  simForm.home_score = String(match.value?.home_score ?? 0)
  simForm.away_score = String(match.value?.away_score ?? 0)
}

async function loadPort() {
  if (!permissionSet.value.has('live:match:update')) return
  portLoading.value = true
  try {
    port.value = await scoreboardApi.get(matchId.value)
    if (port.value) deviceName.value = port.value.device_name
    applySimPhase(match.value?.phase ?? 'not_started')
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '计分板端口加载失败', 'error')
  } finally {
    portLoading.value = false
  }
}

async function bindPort() {
  if (portSaving.value) return
  portError.value = ''
  portSaving.value = true
  try {
    port.value = await scoreboardApi.bind(matchId.value, deviceName.value)
    showMessage('计分板端口已绑定，可将密钥配置到现场设备。')
  } catch (error) {
    portError.value = error instanceof ApiError ? error.message : '端口绑定失败'
  } finally {
    portSaving.value = false
  }
}

async function resetPort() {
  if (!window.confirm('重置后旧密钥立即失效，现场设备需重新配置。确认重置？')) return
  try {
    port.value = await scoreboardApi.reset(matchId.value)
    pushResult.value = null
    showMessage('计分板端口密钥已重置。')
  } catch (error) {
    portError.value = error instanceof ApiError ? error.message : '密钥重置失败'
  }
}

async function unbindPort() {
  if (!window.confirm('确认解绑计分板设备？解绑后设备将无法推送数据。')) return
  try {
    await scoreboardApi.unbind(matchId.value)
    port.value = null
    pushResult.value = null
    showMessage('计分板设备已解绑。')
  } catch (error) {
    portError.value = error instanceof ApiError ? error.message : '解绑失败'
  }
}

async function simulatePush() {
  if (!port.value || portSaving.value) return
  portError.value = ''
  const phase = PHASE_BY_TEXT[simForm.phaseLabel]
  const home = Number(simForm.home_score)
  const away = Number(simForm.away_score)
  if (!phase) {
    portError.value = '请选择比赛阶段'
    return
  }
  if (!Number.isInteger(home) || home < 0 || home > 99 || !Number.isInteger(away) || away < 0 || away > 99) {
    portError.value = '比分需为 0 - 99 的整数'
    return
  }
  portSaving.value = true
  try {
    pushResult.value = await scoreboardApi.push({
      token: port.value.token,
      home_score: home,
      away_score: away,
      phase,
    })
    port.value = await scoreboardApi.get(matchId.value)
    await Promise.all([loadMatch(), loadState(), loadEvents(), loadReport()])
    showMessage(`设备数据已同步：${pushResult.value.home_score} : ${pushResult.value.away_score} · ${pushResult.value.phase_display}。`)
  } catch (error) {
    portError.value = error instanceof ApiError ? error.message : '设备推送失败'
  } finally {
    portSaving.value = false
  }
}

// ===== 单场 AI 报告 =====

const report = ref<MatchReport | null>(null)
const reportLoading = ref(false)
const reportError = ref('')

async function loadReport() {
  if (!permissionSet.value.has('live:match:update')) return
  try {
    report.value = await schoolLiveApi.report(matchId.value)
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : 'AI 报告加载失败', 'error')
  }
}

async function generateReport() {
  if (reportLoading.value) return
  if (!finished.value) {
    reportError.value = '比赛结束后才能生成 AI 报告'
    return
  }
  reportError.value = ''
  reportLoading.value = true
  try {
    report.value = await schoolLiveApi.generateReport(matchId.value)
    showMessage('AI 报告已生成，并已同步到门户新闻。')
  } catch (error) {
    reportError.value = error instanceof ApiError ? error.message : '报告生成失败'
  } finally {
    reportLoading.value = false
  }
}

// ===== 比赛事件 =====

const EVENT_TYPE_OPTIONS: LiveEventType[] = ['进球', '黄牌', '红牌', '换人', '文字']
const SIDE_LABELS = ['主队', '客队']

const events = ref<LiveMatchEvent[]>([])
const eventsLoading = ref(false)
const eventSaving = ref(false)
const eventError = ref('')
const editingEventId = ref<number | null>(null)
const eventForm = reactive({
  type: '进球' as LiveEventType,
  minute: '1',
  sideLabel: '主队',
  player_name: '',
  note: '',
})

const eventRows = computed(() =>
  events.value.map((item) => ({
    id: item.id,
    minute: `第 ${item.minute} 分钟`,
    type: item.type,
    side: item.side_display,
    player: item.player_name,
    note: item.note ?? '—',
  })),
)

const eventColumns: TableColumn[] = [
  { key: 'minute', label: '时间' },
  { key: 'type', label: '事件' },
  { key: 'side', label: '球队' },
  { key: 'player', label: '球员' },
  { key: 'note', label: '说明' },
]

function eventActions(): string[] {
  return running.value ? ['修改', '删除'] : []
}

function resetEventForm() {
  editingEventId.value = null
  eventForm.type = '进球'
  eventForm.minute = running.value ? String(events.value[0]?.minute ?? 1) : '1'
  eventForm.sideLabel = '主队'
  eventForm.player_name = ''
  eventForm.note = ''
  eventError.value = ''
}

function editEvent(row: Record<string, unknown>) {
  const target = events.value.find((item) => item.id === Number(row.id))
  if (!target) return
  editingEventId.value = target.id
  eventForm.type = target.type
  eventForm.minute = String(target.minute)
  eventForm.sideLabel = target.side === 'home' ? '主队' : '客队'
  eventForm.player_name = target.player_name
  eventForm.note = target.note ?? ''
  eventError.value = ''
}

async function submitEvent() {
  if (eventSaving.value) return
  eventError.value = ''
  const minute = Number(eventForm.minute)
  if (!Number.isInteger(minute) || minute < 0 || minute > 130) {
    eventError.value = '比赛时间需为 0 - 130 的整数'
    return
  }
  if (eventForm.type !== '文字' && !eventForm.player_name.trim()) {
    eventError.value = '请填写球员姓名'
    return
  }
  const side: MatchSide = eventForm.sideLabel === '主队' ? 'home' : 'away'
  const input = {
    type: eventForm.type,
    minute,
    side,
    player_name: eventForm.player_name.trim(),
    note: eventForm.note.trim(),
  }

  eventSaving.value = true
  try {
    if (editingEventId.value) {
      await schoolLiveApi.updateEvent(editingEventId.value, input)
      showMessage('事件已更新。')
    } else {
      await schoolLiveApi.createEvent(matchId.value, input)
      showMessage(input.type === '进球' ? '进球已记录，比分同步更新。' : '事件已记录。')
    }
    resetEventForm()
    await Promise.all([loadEvents(), loadMatch()])
  } catch (error) {
    eventError.value = error instanceof ApiError ? error.message : '事件保存失败'
  } finally {
    eventSaving.value = false
  }
}

async function removeEvent(row: Record<string, unknown>) {
  const target = events.value.find((item) => item.id === Number(row.id))
  if (!target) return
  if (!window.confirm(`确认删除「${target.type} · 第 ${target.minute} 分钟 · ${target.player_name}」？`)) return
  try {
    await schoolLiveApi.removeEvent(target.id)
    showMessage(target.type === '进球' ? '事件已删除，比分已回退。' : '事件已删除。')
    await Promise.all([loadEvents(), loadMatch()])
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '删除失败', 'error')
  }
}

function handleEventAction(action: string, row: Record<string, unknown>) {
  if (action === '修改') editEvent(row)
  if (action === '删除') removeEvent(row)
}

async function loadEvents() {
  if (!permissionSet.value.has('live:event:manage')) return
  eventsLoading.value = true
  try {
    events.value = await schoolLiveApi.events(matchId.value)
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '事件加载失败', 'error')
  } finally {
    eventsLoading.value = false
  }
}

// ===== 首发阵容 =====

const lineup = ref<MatchLineup | null>(null)
const lineupHome = ref<LineupPlayer[]>([])
const lineupAway = ref<LineupPlayer[]>([])
const lineupSaving = ref(false)
const lineupError = ref('')
const POSITION_OPTIONS: PlayerPosition[] = ['门将', '后卫', '中场', '前锋']

const addForms = reactive({
  home: { name: '', jersey: '', position: '前锋' as PlayerPosition },
  away: { name: '', jersey: '', position: '前锋' as PlayerPosition },
})

function addPlayer(side: 'home' | 'away') {
  lineupError.value = ''
  const form = addForms[side]
  const list = side === 'home' ? lineupHome.value : lineupAway.value
  const name = form.name.trim()
  const jersey = Number(form.jersey)
  if (!name) {
    lineupError.value = '请填写球员姓名'
    return
  }
  if (list.length >= 11) {
    lineupError.value = '首发最多 11 人'
    return
  }
  if (!Number.isInteger(jersey) || jersey < 1 || jersey > 99) {
    lineupError.value = '球衣号码需为 1 - 99 的整数'
    return
  }
  if (list.some((player) => player.jersey_no === jersey)) {
    lineupError.value = '球衣号码重复'
    return
  }
  if (list.some((player) => player.name === name)) {
    lineupError.value = '球员姓名重复'
    return
  }
  list.push({
    id: `lp-${Date.now()}-${list.length}`,
    name,
    jersey_no: jersey,
    position: form.position,
  })
  form.name = ''
  form.jersey = ''
}

function removePlayer(side: 'home' | 'away', id: string) {
  const list = side === 'home' ? lineupHome.value : lineupAway.value
  const index = list.findIndex((player) => player.id === id)
  if (index >= 0) list.splice(index, 1)
}

async function saveLineup() {
  if (lineupSaving.value || !lineup.value) return
  lineupError.value = ''
  lineupSaving.value = true
  try {
    const saved = await schoolLiveApi.saveLineup(
      matchId.value,
      { home: lineupHome.value, away: lineupAway.value },
      lineup.value.version,
    )
    lineup.value = saved
    lineupHome.value = saved.home.map((player) => ({ ...player }))
    lineupAway.value = saved.away.map((player) => ({ ...player }))
    showMessage('首发阵容已保存。')
  } catch (error) {
    lineupError.value = error instanceof ApiError ? error.message : '阵容保存失败'
  } finally {
    lineupSaving.value = false
  }
}

async function loadLineup() {
  if (!permissionSet.value.has('live:match:update')) return
  try {
    const result = await schoolLiveApi.lineup(matchId.value)
    lineup.value = result
    lineupHome.value = result.home.map((player) => ({ ...player }))
    lineupAway.value = result.away.map((player) => ({ ...player }))
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '阵容加载失败', 'error')
  }
}

// ===== 裁判配置 =====

const refereeDraft = ref<{ name: string; role: string; phone: string }[]>([])
const refereeSaving = ref(false)
const refereeError = ref('')
const REFEREE_ROLE_OPTIONS = ['主裁判', '助理裁判', '第四官员']

function addReferee() {
  refereeError.value = ''
  if (refereeDraft.value.length >= 4) {
    refereeError.value = '裁判组最多 4 人'
    return
  }
  refereeDraft.value.push({ name: '', role: '助理裁判', phone: '' })
}

function removeReferee(index: number) {
  refereeDraft.value.splice(index, 1)
}

async function saveReferees() {
  if (refereeSaving.value) return
  refereeError.value = ''
  refereeSaving.value = true
  try {
    const saved = await schoolLiveApi.saveReferees(
      matchId.value,
      refereeDraft.value.map((item) => ({
        name: item.name.trim(),
        role: item.role as MatchReferee['role'],
        phone: item.phone.trim(),
      })),
    )
    refereeDraft.value = saved.map((item) => ({ name: item.name, role: item.role, phone: item.phone }))
    showMessage('裁判组已保存。')
  } catch (error) {
    refereeError.value = error instanceof ApiError ? error.message : '裁判保存失败'
  } finally {
    refereeSaving.value = false
  }
}

async function loadReferees() {
  if (!permissionSet.value.has('live:referee:manage')) return
  try {
    const list = await schoolLiveApi.referees(matchId.value)
    refereeDraft.value = list.map((item) => ({ name: item.name, role: item.role, phone: item.phone }))
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '裁判加载失败', 'error')
  }
}

// ===== 赛事文件 =====

const FILE_CATEGORY_OPTIONS: MatchFileCategory[] = ['签到表', '记录确认单', '裁判报告单']
const files = ref<MatchFile[]>([])
const fileCategory = ref<MatchFileCategory>('签到表')
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const fileError = ref('')

const fileRows = computed(() =>
  files.value.map((item) => ({
    id: item.id,
    category: item.category,
    name: item.name,
    size: formatSize(item.size),
    uploader: item.uploaded_by,
    time: item.uploaded_at,
  })),
)

const fileColumns: TableColumn[] = [
  { key: 'category', label: '类别' },
  { key: 'name', label: '文件名' },
  { key: 'size', label: '大小' },
  { key: 'uploader', label: '上传人' },
  { key: 'time', label: '上传时间' },
]

function formatSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function onFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
  fileError.value = ''
}

async function uploadFile() {
  if (uploading.value) return
  if (!selectedFile.value) {
    fileError.value = '请先选择文件'
    return
  }
  uploading.value = true
  fileError.value = ''
  try {
    await schoolLiveApi.uploadFile(matchId.value, fileCategory.value, selectedFile.value)
    showMessage('文件已上传。')
    selectedFile.value = null
    if (fileInput.value) fileInput.value.value = ''
    await loadFiles()
  } catch (error) {
    fileError.value = error instanceof ApiError ? error.message : '文件上传失败'
  } finally {
    uploading.value = false
  }
}

async function downloadFile(row: Record<string, unknown>) {
  try {
    const blob = await schoolLiveApi.downloadFile(String(row.id))
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = String(row.name)
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '文件下载失败', 'error')
  }
}

async function removeFile(row: Record<string, unknown>) {
  if (!window.confirm(`确认删除文件「${row.name}」？`)) return
  try {
    await schoolLiveApi.removeFile(String(row.id))
    showMessage('文件已删除。')
    await loadFiles()
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '文件删除失败', 'error')
  }
}

function handleFileAction(action: string, row: Record<string, unknown>) {
  if (action === '下载') downloadFile(row)
  if (action === '删除') removeFile(row)
}

async function loadFiles() {
  if (!permissionSet.value.has('live:file:manage')) return
  try {
    files.value = await schoolLiveApi.files(matchId.value)
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '文件加载失败', 'error')
  }
}

// ===== 直播链接 =====

const liveLink = ref<LiveLink | null>(null)
const linkSaving = ref(false)
const linkError = ref('')
const linkForm = reactive({ platform: '视频号', url: '' })

function applyLink(link: LiveLink | null) {
  liveLink.value = link
  linkForm.platform = link?.platform ?? '视频号'
  linkForm.url = link?.url ?? ''
}

async function saveLink() {
  if (linkSaving.value) return
  linkSaving.value = true
  linkError.value = ''
  try {
    const saved = await schoolLiveApi.saveLiveLink(matchId.value, {
      platform: linkForm.platform,
      url: linkForm.url.trim(),
    })
    applyLink(saved)
    showMessage('直播链接已保存。')
  } catch (error) {
    linkError.value = error instanceof ApiError ? error.message : '直播链接保存失败'
  } finally {
    linkSaving.value = false
  }
}

async function clearLink() {
  if (!window.confirm('确认清空当前直播链接？')) return
  try {
    await schoolLiveApi.clearLiveLink(matchId.value)
    applyLink(null)
    showMessage('直播链接已清空。')
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '清空失败', 'error')
  }
}

async function loadLink() {
  if (!permissionSet.value.has('live:link:manage')) return
  try {
    applyLink(await schoolLiveApi.liveLink(matchId.value))
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '直播链接加载失败', 'error')
  }
}

// ===== 人脸核验 =====

const faceRecords = ref<FaceVerifyRecord[]>([])
const faceSubject = ref('')
const facePhoto = ref<File | null>(null)
const faceInput = ref<HTMLInputElement | null>(null)
const verifying = ref(false)
const faceError = ref('')

const faceRows = computed(() =>
  faceRecords.value.map((item) => ({
    id: item.id,
    subject: item.subject,
    status: item.status,
    score: `${item.score}%`,
    operator: item.operator,
    time: item.verified_at,
  })),
)

const faceColumns: TableColumn[] = [
  { key: 'subject', label: '核验对象' },
  { key: 'status', label: '核验状态' },
  { key: 'score', label: '相似度' },
  { key: 'operator', label: '操作人' },
  { key: 'time', label: '核验时间' },
]

function onFacePicked(event: Event) {
  const input = event.target as HTMLInputElement
  facePhoto.value = input.files?.[0] ?? null
  faceError.value = ''
}

async function verifyFace() {
  if (verifying.value) return
  if (!faceSubject.value.trim()) {
    faceError.value = '请填写核验对象姓名'
    return
  }
  if (!facePhoto.value) {
    faceError.value = '请上传核验照片'
    return
  }
  verifying.value = true
  faceError.value = ''
  try {
    const record = await schoolLiveApi.verifyFace(matchId.value, faceSubject.value.trim(), facePhoto.value)
    showMessage(`核验完成：${record.subject} ${record.status}（相似度 ${record.score}%）。`)
    faceSubject.value = ''
    facePhoto.value = null
    if (faceInput.value) faceInput.value.value = ''
    await loadFaceRecords()
  } catch (error) {
    faceError.value = error instanceof ApiError ? error.message : '人脸核验失败'
  } finally {
    verifying.value = false
  }
}

async function loadFaceRecords() {
  if (!permissionSet.value.has('live:face:manage')) return
  try {
    faceRecords.value = await schoolLiveApi.faceRecords(matchId.value)
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '核验记录加载失败', 'error')
  }
}

// ===== 初始化 =====

async function loadMatch() {
  const list = await schoolMatchApi.list()
  const found = list.find((item) => item.id === matchId.value)
  if (!found) throw new ApiError(40400, '比赛不存在或不属于本校')
  match.value = found
}

async function loadAll() {
  loading.value = true
  loadError.value = ''
  try {
    await loadMatch()
    activeTab.value = visibleTabs.value[0]?.key ?? 'state'
    await Promise.all([
      loadState(),
      loadEvents(),
      loadLineup(),
      loadReferees(),
      loadFiles(),
      loadLink(),
      loadPort(),
      loadFaceRecords(),
      loadReport(),
    ])
  } catch (error) {
    loadError.value = error instanceof ApiError ? error.message : '比赛加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)
</script>

<template>
  <div class="match-ops">
    <button type="button" class="back-link" @click="router.push('/admin/school/matches')">
      ← 返回本校比赛
    </button>

    <PageHeader
      :title="match ? `${match.home_team_name} vs ${match.away_team_name}` : '比赛运营'"
      desc="校级比赛运营：比分与阶段、比赛事件、首发阵容、裁判、文件、直播、计分板接入与 AI 报告"
    />

    <p v-if="message" class="page-tip" :class="messageType">{{ message }}</p>
    <p v-if="loadError" class="page-tip error">{{ loadError }}</p>

    <template v-if="match">
      <section class="summary-card">
        <div class="summary-side">
          <span class="team-name">{{ match.home_team_name }}</span>
          <span class="side-tag">主队</span>
        </div>
        <div class="summary-score">
          <strong>{{ scoreText }}</strong>
          <span class="score-status" :class="{ live: running, done: finished }">
            {{ running ? match.phase_display : match.status_display }}
          </span>
        </div>
        <div class="summary-side away">
          <span class="team-name">{{ match.away_team_name }}</span>
          <span class="side-tag">客队</span>
        </div>
        <p class="summary-meta">
          {{ match.group_type_display }} · {{ match.match_time }} · {{ match.venue || '场地待定' }}
        </p>
      </section>

      <div class="quick-actions">
        <a class="quick-link" :href="mobileUrl" target="_blank" rel="noreferrer">手机端上传</a>
        <button type="button" class="quick-link" @click="copyMobileLink">复制手机端链接</button>
        <span class="quick-hint">现场用手机打开即可录入比分、阶段与事件</span>
      </div>

      <p v-if="finished" class="page-tip hint">比赛已结束，比分与阶段、事件、阵容、裁判、文件、直播链接与核验均进入只读状态。</p>
      <p v-else-if="!running" class="page-tip hint">比赛未开始：可先维护阵容、裁判、文件与直播链接；在「比分与阶段」开赛后才能录入事件。</p>

      <nav class="tab-bar">
        <button
          v-for="tab in visibleTabs"
          :key="tab.key"
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>

      <!-- 比分与阶段：手动保底录入，事件与计分板推送共用同一份状态 -->
      <section v-if="activeTab === 'state'" class="panel">
        <div class="state-score">
          <div class="state-side">
            <span class="state-team">{{ match.home_team_name }}</span>
            <input
              v-model="stateForm.home_score"
              class="state-input"
              type="number"
              min="0"
              max="99"
              :disabled="finished"
            />
          </div>
          <span class="state-colon">:</span>
          <div class="state-side">
            <span class="state-team">{{ match.away_team_name }}</span>
            <input
              v-model="stateForm.away_score"
              class="state-input"
              type="number"
              min="0"
              max="99"
              :disabled="finished"
            />
          </div>
        </div>

        <div class="state-phase">
          <div class="field narrow">
            <label class="field-label">比赛阶段</label>
            <AppSelect v-model="stateForm.phaseLabel" :options="phaseOptions" :disabled="finished" />
          </div>
          <p class="panel-note state-note">
            当前：{{ stateRecord?.phase_display ?? match.phase_display }}
            · 最近更新：{{ stateRecord?.updated_at ?? '—' }}（{{ stateRecord?.source_display ?? '系统' }}）
          </p>
        </div>

        <p v-if="stateError" class="page-tip error">{{ stateError }}</p>

        <div class="panel-footer">
          <button type="button" class="refresh-btn" :disabled="finished || stateSaving" @click="saveState()">
            {{ stateSaving ? '保存中…' : '保存比分与阶段' }}
          </button>
          <button
            v-if="running"
            type="button"
            class="primary-btn"
            :disabled="stateSaving"
            @click="saveState('finished')"
          >
            结束比赛
          </button>
        </div>

        <p class="panel-note state-tip">
          手动录入为保底方式：现场计分板不可用时直接设置比分与阶段；比赛事件中的进球会在此基础上自动加减。
          比赛结束后将自动生成 AI 报告并同步门户新闻。
        </p>
      </section>

      <!-- 比赛事件 -->
      <section v-else-if="activeTab === 'events'" class="panel">
        <form class="inline-form" @submit.prevent="submitEvent">
          <div class="field">
            <label class="field-label">事件类型</label>
            <AppSelect v-model="eventForm.type" :options="EVENT_TYPE_OPTIONS" :disabled="!running" />
          </div>
          <div class="field narrow">
            <label class="field-label">分钟</label>
            <input v-model="eventForm.minute" class="field-input" type="number" min="0" max="130" :disabled="!running" />
          </div>
          <div class="field narrow">
            <label class="field-label">所属球队</label>
            <AppSelect v-model="eventForm.sideLabel" :options="SIDE_LABELS" :disabled="!running" />
          </div>
          <div class="field">
            <label class="field-label">球员姓名</label>
            <input
              v-model="eventForm.player_name"
              class="field-input"
              type="text"
              maxlength="20"
              :placeholder="eventForm.type === '文字' ? '可留空' : '如：王小磊'"
              :disabled="!running"
            />
          </div>
          <div class="field wide">
            <label class="field-label">说明</label>
            <input v-model="eventForm.note" class="field-input" type="text" maxlength="100" placeholder="可选" :disabled="!running" />
          </div>
          <div class="form-actions">
            <button type="submit" class="primary-btn" :disabled="!running || eventSaving">
              {{ editingEventId ? '保存修改' : '添加事件' }}
            </button>
            <button v-if="editingEventId" type="button" class="refresh-btn" @click="resetEventForm">取消修改</button>
          </div>
        </form>

        <p v-if="eventError" class="page-tip error">{{ eventError }}</p>

        <DataTable
          :columns="eventColumns"
          :rows="eventRows as unknown as Record<string, unknown>[]"
          :row-actions="eventActions"
          @action="handleEventAction"
        />
        <p v-if="!eventsLoading && events.length === 0" class="empty-tip">暂无比赛事件。</p>
      </section>

      <!-- 首发阵容 -->
      <section v-else-if="activeTab === 'lineup'" class="panel">
        <p v-if="lineup?.updated_at" class="panel-note">最近更新：{{ lineup.updated_at }} · 版本 {{ lineup.version }}</p>
        <div class="lineup-grid">
          <div v-for="side in (['home', 'away'] as const)" :key="side" class="lineup-card">
            <h3 class="lineup-title">
              {{ side === 'home' ? match.home_team_name : match.away_team_name }}
              <span class="lineup-count">{{ (side === 'home' ? lineupHome : lineupAway).length }} / 11</span>
            </h3>
            <ul class="lineup-list">
              <li v-for="player in side === 'home' ? lineupHome : lineupAway" :key="player.id" class="lineup-item">
                <span class="jersey">{{ player.jersey_no }}</span>
                <span class="player-name">{{ player.name }}</span>
                <span class="player-position">{{ player.position }}</span>
                <button type="button" class="link-danger" :disabled="finished" @click="removePlayer(side, player.id)">移除</button>
              </li>
              <li v-if="(side === 'home' ? lineupHome : lineupAway).length === 0" class="lineup-empty">暂无首发球员</li>
            </ul>
            <form class="lineup-add" @submit.prevent="addPlayer(side)">
              <input v-model="addForms[side].jersey" class="field-input tiny" type="number" min="1" max="99" placeholder="号码" :disabled="finished" />
              <input v-model="addForms[side].name" class="field-input" type="text" maxlength="20" placeholder="球员姓名" :disabled="finished" />
              <AppSelect v-model="addForms[side].position" :options="POSITION_OPTIONS" compact :disabled="finished" />
              <button type="submit" class="refresh-btn" :disabled="finished">添加</button>
            </form>
          </div>
        </div>
        <p v-if="lineupError" class="page-tip error">{{ lineupError }}</p>
        <div class="panel-footer">
          <button type="button" class="primary-btn" :disabled="finished || lineupSaving" @click="saveLineup">
            {{ lineupSaving ? '保存中…' : '保存阵容' }}
          </button>
        </div>
      </section>

      <!-- 裁判配置 -->
      <section v-else-if="activeTab === 'referees'" class="panel">
        <p class="panel-note">裁判组最多 4 人：主裁判 1 人、助理裁判最多 2 人、第四官员最多 1 人。</p>
        <div class="referee-list">
          <div v-for="(referee, index) in refereeDraft" :key="index" class="referee-row">
            <AppSelect v-model="referee.role" :options="REFEREE_ROLE_OPTIONS" compact :disabled="finished" />
            <input v-model="referee.name" class="field-input" type="text" maxlength="20" placeholder="裁判姓名" :disabled="finished" />
            <input v-model="referee.phone" class="field-input" type="text" maxlength="11" placeholder="手机号（可选）" :disabled="finished" />
            <button type="button" class="link-danger" :disabled="finished" @click="removeReferee(index)">移除</button>
          </div>
          <p v-if="refereeDraft.length === 0" class="empty-tip">暂未配置裁判。</p>
        </div>
        <p v-if="refereeError" class="page-tip error">{{ refereeError }}</p>
        <div class="panel-footer">
          <button type="button" class="refresh-btn" :disabled="finished" @click="addReferee">添加裁判</button>
          <button type="button" class="primary-btn" :disabled="finished || refereeSaving" @click="saveReferees">
            {{ refereeSaving ? '保存中…' : '保存裁判组' }}
          </button>
        </div>
      </section>

      <!-- 赛事文件 -->
      <section v-else-if="activeTab === 'files'" class="panel">
        <form class="inline-form" @submit.prevent="uploadFile">
          <div class="field narrow">
            <label class="field-label">文件类别</label>
            <AppSelect v-model="fileCategory" :options="FILE_CATEGORY_OPTIONS" :disabled="finished" />
          </div>
          <div class="field wide">
            <label class="field-label">选择文件</label>
            <input
              ref="fileInput"
              class="field-input file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              :disabled="finished"
              @change="onFilePicked"
            />
          </div>
          <div class="form-actions">
            <button type="submit" class="primary-btn" :disabled="finished || uploading">
              {{ uploading ? '上传中…' : '上传文件' }}
            </button>
          </div>
        </form>
        <p class="panel-note">支持 pdf / jpg / jpeg / png，单个文件不超过 10MB。</p>
        <p v-if="fileError" class="page-tip error">{{ fileError }}</p>

        <DataTable
          :columns="fileColumns"
          :rows="fileRows as unknown as Record<string, unknown>[]"
          :row-actions="finished ? () => ['下载'] : () => ['下载', '删除']"
          @action="handleFileAction"
        />
        <p v-if="files.length === 0" class="empty-tip">暂无赛事文件。</p>
      </section>

      <!-- 直播链接 -->
      <section v-else-if="activeTab === 'live'" class="panel">
        <div class="link-card">
          <p v-if="liveLink" class="link-current">
            当前链接：{{ liveLink.platform }} · <a :href="liveLink.url" target="_blank" rel="noreferrer">{{ liveLink.url }}</a>
            <span class="link-meta">{{ liveLink.updated_at }} 由 {{ liveLink.updated_by }} 更新</span>
          </p>
          <p v-else class="link-current">当前未配置直播链接。</p>
        </div>

        <form class="inline-form" @submit.prevent="saveLink">
          <div class="field narrow">
            <label class="field-label">直播平台</label>
            <AppSelect v-model="linkForm.platform" :options="LIVE_PLATFORMS" :disabled="finished" />
          </div>
          <div class="field wide">
            <label class="field-label">直播链接</label>
            <input
              v-model="linkForm.url"
              class="field-input"
              type="text"
              maxlength="200"
              placeholder="https://"
              :disabled="finished"
            />
          </div>
          <div class="form-actions">
            <button type="submit" class="primary-btn" :disabled="finished || linkSaving">
              {{ linkSaving ? '保存中…' : '保存链接' }}
            </button>
            <button v-if="liveLink" type="button" class="refresh-btn" :disabled="finished" @click="clearLink">清空链接</button>
          </div>
        </form>
        <p v-if="linkError" class="page-tip error">{{ linkError }}</p>
      </section>

      <!-- 人脸核验 -->
      <section v-else-if="activeTab === 'face'" class="panel">
        <form class="inline-form" @submit.prevent="verifyFace">
          <div class="field">
            <label class="field-label">核验对象</label>
            <input v-model="faceSubject" class="field-input" type="text" maxlength="20" placeholder="运动员 / 裁判姓名" :disabled="finished" />
          </div>
          <div class="field wide">
            <label class="field-label">现场照片</label>
            <input
              ref="faceInput"
              class="field-input file-input"
              type="file"
              accept=".jpg,.jpeg,.png"
              :disabled="finished"
              @change="onFacePicked"
            />
          </div>
          <div class="form-actions">
            <button type="submit" class="primary-btn" :disabled="finished || verifying">
              {{ verifying ? '核验中…' : '发起核验' }}
            </button>
          </div>
        </form>
        <p class="panel-note">照片仅用于本次核验，支持 jpg / jpeg / png，不超过 10MB。</p>
        <p v-if="faceError" class="page-tip error">{{ faceError }}</p>

        <DataTable
          :columns="faceColumns"
          :rows="faceRows as unknown as Record<string, unknown>[]"
        />
        <p v-if="faceRecords.length === 0" class="empty-tip">暂无核验记录。</p>
      </section>

      <!-- 计分板接入：绑定后由现场设备凭密钥推送比分与阶段 -->
      <section v-else-if="activeTab === 'scoreboard'" class="panel">
        <p class="panel-note">
          市州及以上赛事由赛事计分板接口自动同步；校级赛事可绑定专用端口，由现场计分板设备直接推送比分与阶段，
          无需人工录入。端口密钥只对当前比赛有效。
        </p>

        <p v-if="portLoading" class="page-tip">正在加载端口状态…</p>

        <template v-else-if="port">
          <div class="port-card">
            <p><span class="port-label">设备名称</span>{{ port.device_name }}</p>
            <p><span class="port-label">端口密钥</span><code class="port-token">{{ port.token }}</code></p>
            <p><span class="port-label">设备状态</span>{{ port.enabled ? '已启用' : '已停用' }}</p>
            <p><span class="port-label">最近同步</span>{{ port.last_sync_at || '尚未同步' }}{{ port.last_sync_by ? ` · ${port.last_sync_by}` : '' }}</p>
            <p><span class="port-label">推送接口</span><code>POST /api/scoreboard/push</code></p>
          </div>

          <div class="panel-footer">
            <button type="button" class="refresh-btn" :disabled="finished" @click="resetPort">重置密钥</button>
            <button type="button" class="refresh-btn" :disabled="finished" @click="unbindPort">解绑设备</button>
          </div>

          <h3 class="sub-title">设备推送模拟</h3>
          <form class="inline-form" @submit.prevent="simulatePush">
            <div class="field narrow">
              <label class="field-label">主队比分</label>
              <input v-model="simForm.home_score" class="field-input" type="number" min="0" max="99" :disabled="finished" />
            </div>
            <div class="field narrow">
              <label class="field-label">客队比分</label>
              <input v-model="simForm.away_score" class="field-input" type="number" min="0" max="99" :disabled="finished" />
            </div>
            <div class="field narrow">
              <label class="field-label">比赛阶段</label>
              <AppSelect v-model="simForm.phaseLabel" :options="SIM_PHASE_OPTIONS" :disabled="finished" />
            </div>
            <div class="form-actions">
              <button type="submit" class="primary-btn" :disabled="finished || portSaving">
                {{ portSaving ? '同步中…' : '模拟设备推送' }}
              </button>
            </div>
          </form>
          <p v-if="pushResult" class="page-tip">
            已同步：{{ pushResult.match_name }} {{ pushResult.home_score }} : {{ pushResult.away_score }}
            · {{ pushResult.phase_display }}（{{ pushResult.synced_at }}）
          </p>
        </template>

        <form v-else class="inline-form" @submit.prevent="bindPort">
          <div class="field">
            <label class="field-label">设备名称</label>
            <input v-model="deviceName" class="field-input" type="text" maxlength="30" placeholder="如：主计分板" :disabled="finished" />
          </div>
          <div class="form-actions">
            <button type="submit" class="primary-btn" :disabled="finished || portSaving">
              {{ portSaving ? '绑定中…' : '绑定计分板端口' }}
            </button>
          </div>
        </form>

        <p v-if="portError" class="page-tip error">{{ portError }}</p>
      </section>

      <!-- AI 比赛报告：结束后自动生成，并同步门户新闻 -->
      <section v-else-if="activeTab === 'report'" class="panel">
        <p v-if="!finished" class="page-tip hint">比赛结束后自动生成 AI 比赛报告，并同步到门户「新闻政策」与比赛详情。</p>

        <template v-else>
          <div v-if="report" class="report-card">
            <header class="report-head">
              <p class="report-kicker">AI 生成 · {{ report.published ? '已同步门户新闻' : '未发布' }}</p>
              <h2 class="report-title">{{ report.title }}</h2>
              <p class="report-meta">{{ report.generated_at }} · {{ report.phase_display }} · {{ report.score }}</p>
            </header>
            <p class="report-summary">{{ report.summary }}</p>
            <ul class="report-highlights">
              <li v-for="item in report.highlights" :key="item">{{ item }}</li>
            </ul>
            <div v-for="section in report.sections" :key="section.title" class="report-section">
              <h3>{{ section.title }}</h3>
              <p>{{ section.content }}</p>
            </div>
          </div>
          <p v-else class="empty-tip">本场尚未生成 AI 报告，可点击下方按钮生成。</p>

          <p v-if="reportError" class="page-tip error">{{ reportError }}</p>
          <div class="panel-footer">
            <button type="button" class="primary-btn" :disabled="reportLoading" @click="generateReport">
              {{ reportLoading ? '生成中…' : report ? '重新生成并同步' : '生成 AI 报告' }}
            </button>
          </div>
        </template>
      </section>
    </template>
  </div>
</template>

<style scoped>
.back-link {
  margin-bottom: 12px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--green);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}

.back-link:hover {
  text-decoration: underline;
}

.summary-card {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  margin-bottom: 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(20, 60, 40, 0.06);
}

.summary-side {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary-side.away {
  align-items: flex-end;
  text-align: right;
}

.team-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}

.side-tag {
  font-size: 12px;
  color: var(--muted);
}

.summary-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.summary-score strong {
  font-size: 24px;
  color: var(--green-dark);
}

.score-status {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--green-light);
  color: var(--green-dark);
}

.score-status.live {
  background: #fff3e0;
  color: #b26a00;
}

.score-status.done {
  background: #eef1f0;
  color: var(--muted);
}

.summary-meta {
  grid-column: 1 / -1;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
  font-size: 12px;
  color: var(--muted);
  text-align: center;
}

.tab-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0;
}

.tab-btn {
  padding: 8px 16px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  color: var(--ink);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.18s;
}

.tab-btn:hover {
  border-color: var(--green);
  color: var(--green-dark);
}

.tab-btn.active {
  border-color: var(--green);
  background: var(--green);
  color: #fff;
}

.panel {
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
}

.panel-note {
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--muted);
}

.panel-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.inline-form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 150px;
  flex: 1 1 160px;
}

.field.narrow {
  flex: 0 0 120px;
}

.field.wide {
  flex: 2 1 240px;
}

.field-label {
  font-size: 12px;
  color: var(--muted);
}

.field-input {
  width: 100%;
  padding: 9px 11px;
  border: 1.5px solid #d8e2da;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  color: var(--ink);
  background: #fff;
}

.field-input:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(30, 122, 63, 0.12);
}

.field-input:disabled {
  background: #f5f7f6;
  color: var(--muted);
}

.field-input.tiny {
  width: 72px;
  flex: 0 0 72px;
}

.file-input {
  padding: 7px 9px;
}

.form-actions {
  display: flex;
  gap: 10px;
  padding-bottom: 2px;
}

.empty-tip {
  padding: 14px 0;
  font-size: 13px;
  color: var(--muted);
  text-align: center;
}

.lineup-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.lineup-card {
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fbfdfb;
}

.lineup-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: var(--ink);
  margin-bottom: 10px;
}

.lineup-count {
  font-size: 12px;
  color: var(--muted);
}

.lineup-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
}

.lineup-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
}

.jersey {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--green-light);
  color: var(--green-dark);
  font-size: 12px;
  font-weight: 700;
}

.player-name {
  flex: 1;
  color: var(--ink);
}

.player-position {
  font-size: 12px;
  color: var(--muted);
}

.lineup-empty {
  padding: 8px 0;
  font-size: 12px;
  color: var(--muted);
}

.lineup-add {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lineup-add .field-input {
  padding: 7px 9px;
}

.link-danger {
  border: none;
  background: transparent;
  color: #b3261e;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.link-danger:disabled {
  color: var(--muted);
  cursor: not-allowed;
}

.referee-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.referee-row {
  display: grid;
  grid-template-columns: 140px 1fr 1fr auto;
  gap: 10px;
  align-items: center;
}

.link-card {
  padding: 14px 16px;
  margin-bottom: 14px;
  border: 1px dashed var(--line);
  border-radius: 10px;
  background: #fbfdfb;
}

.link-current {
  font-size: 13px;
  color: var(--ink);
  word-break: break-all;
}

.link-current a {
  color: var(--green);
}

.link-meta {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.quick-link {
  padding: 7px 14px;
  border: 1px solid var(--green);
  border-radius: 999px;
  background: #fff;
  color: var(--green-dark);
  font-size: 13px;
  font-family: inherit;
  text-decoration: none;
  cursor: pointer;
}

.quick-link:hover {
  background: var(--green-light);
}

.quick-hint {
  font-size: 12px;
  color: var(--muted);
}

.state-score {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 20px 16px;
  margin-bottom: 16px;
  border-radius: 12px;
  background: #f7fbf8;
}

.state-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1 1 0;
}

.state-team {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  text-align: center;
}

.state-input {
  width: 96px;
  padding: 8px;
  border: 1.5px solid #d8e2da;
  border-radius: 10px;
  font-size: 28px;
  font-weight: 700;
  text-align: center;
  color: var(--green-dark);
  background: #fff;
}

.state-input:disabled {
  background: #f1f4f2;
  color: var(--muted);
}

.state-colon {
  font-size: 26px;
  font-weight: 700;
  color: var(--muted);
}

.state-phase {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}

.state-note {
  margin: 0;
  padding-bottom: 8px;
}

.state-tip {
  margin-top: 14px;
  line-height: 1.7;
}

.port-card {
  padding: 14px 16px;
  border: 1px dashed var(--line);
  border-radius: 10px;
  background: #fbfdfb;
  font-size: 13px;
  line-height: 2;
}

.port-label {
  display: inline-block;
  width: 82px;
  color: var(--muted);
}

.port-token {
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--green-light);
  color: var(--green-dark);
  font-size: 13px;
}

.sub-title {
  margin: 20px 0 10px;
  font-size: 14px;
  color: var(--ink);
}

.report-card {
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fbfdfb;
}

.report-head {
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--line);
}

.report-kicker {
  font-size: 12px;
  color: var(--green);
  font-weight: 600;
  letter-spacing: 0.08em;
}

.report-title {
  margin-top: 6px;
  font-size: 18px;
  color: var(--ink);
}

.report-meta {
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
}

.report-summary {
  margin-top: 12px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--ink);
}

.report-highlights {
  margin: 12px 0 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.9;
  color: var(--green-dark);
}

.report-section {
  margin-top: 16px;
}

.report-section h3 {
  font-size: 14px;
  color: var(--ink);
  margin-bottom: 6px;
}

.report-section p {
  font-size: 13px;
  line-height: 1.8;
  color: var(--muted);
}

@media (max-width: 720px) {
  .summary-card {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .summary-side,
  .summary-side.away {
    align-items: center;
    text-align: center;
  }

  .referee-row {
    grid-template-columns: 1fr;
  }
}
</style>
