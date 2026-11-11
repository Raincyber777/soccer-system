<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import AppSelect from '../../components/common/AppSelect.vue'
import DataTable from '../../components/common/DataTable.vue'
import AppModal from '../../components/common/AppModal.vue'
import DeviceIntegrationPanel from '../../components/common/DeviceIntegrationPanel.vue'
import type { TableColumn } from '../../components/common/types'
import {
  cameraApi,
  ApiError,
  liveMatchOptions,
  type CameraDevice,
  type CameraStatus,
  type RoiPolygon,
} from '../../api'

// 管理端 · 摄像设备：绑定比赛、配置 MJPEG 流地址、标定主客两侧球门 ROI
// 标定要求：机位侧对球门，ROI 贴门线内侧，主队球门与客队球门分别标注

const STATUS_OPTIONS = ['全部状态', '在线', '离线', '已停用']
const statusFilter = ref('全部状态')
const matchFilter = ref('全部比赛')

const matchOptions = liveMatchOptions()
const matchFilterOptions = ['全部比赛', ...matchOptions.map((m) => m.name)]

const STATUS_TEXT: Record<CameraStatus, string> = { online: '在线', offline: '离线', disabled: '已停用' }
const TEXT_STATUS: Record<string, CameraStatus> = { 在线: 'online', 离线: 'offline', 已停用: 'disabled' }

const columns: TableColumn[] = [
  { key: 'name', label: '设备名称' },
  { key: 'device_id', label: '设备 ID', width: '150px' },
  { key: 'match', label: '绑定比赛' },
  { key: 'statusText', label: '设备状态', width: '100px' },
  { key: 'integrationText', label: '联调结果', width: '120px' },
  { key: 'lastSeenText', label: '最近心跳', width: '140px' },
  { key: 'pendingText', label: '待审核', width: '80px' },
  { key: 'roiText', label: 'ROI 标定' },
]

const items = ref<CameraDevice[]>([])
const loading = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

// ===== ESP32 联调 =====
const LAST_KEY = 'soccer-esp32-last'
const INTEGRATION_TEXT: Record<string, string> = {
  online: '设备在线',
  partial: '画面可达',
  offline: '未接通',
  checking: '检测中',
  idle: '未检测',
}

const integrationOpen = ref(false)
const integrationTarget = ref<CameraDevice | null>(null)
const lastResults = ref<Record<string, { state: string; checkedAt: string }>>({})

function readLastResults() {
  try {
    const raw = localStorage.getItem(LAST_KEY)
    lastResults.value = raw
      ? (JSON.parse(raw) as Record<string, { state: string; checkedAt: string }>)
      : {}
  } catch {
    lastResults.value = {}
  }
}

const integrationStats = computed(() => {
  const stats = { online: 0, partial: 0, offline: 0, untested: 0 }
  for (const camera of items.value) {
    const state = lastResults.value[camera.device_id]?.state
    if (state === 'online') stats.online += 1
    else if (state === 'partial') stats.partial += 1
    else if (state === 'offline') stats.offline += 1
    else stats.untested += 1
  }
  return stats
})

function openIntegration(row: Record<string, unknown>) {
  const target = items.value.find((camera) => camera.id === Number(row.id))
  if (!target) return
  integrationTarget.value = target
  integrationOpen.value = true
}

function openFirstIntegration() {
  const first = items.value[0]
  if (first) openIntegration({ id: first.id })
}

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
}

function timeText(iso: string | null) {
  return iso ? iso.slice(5, 16).replace('T', ' ') : '—'
}

const rows = computed<Record<string, unknown>[]>(() =>
  items.value.map((camera) => ({
    ...camera,
    match: camera.match_name ?? '未绑定',
    statusText: camera.status_display,
    integrationText: INTEGRATION_TEXT[lastResults.value[camera.device_id]?.state ?? ''] ?? '未检测',
    lastSeenText: timeText(camera.last_seen_at),
    pendingText: camera.pending_count ? `${camera.pending_count} 条` : '0 条',
    roiText: `${camera.home_roi ? '主队已标定' : '主队未标定'} / ${camera.away_roi ? '客队已标定' : '客队未标定'}`,
  })),
)

const matchIdOf = (): number | undefined => {
  if (matchFilter.value === '全部比赛') return undefined
  return matchOptions.find((m) => m.name === matchFilter.value)?.id
}

async function load() {
  loading.value = true
  try {
    items.value = await cameraApi.list({
      status: statusFilter.value === '全部状态' ? '' : (TEXT_STATUS[statusFilter.value] ?? ''),
      match_id: matchIdOf(),
    })
    readLastResults()
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '摄像设备加载失败', 'error')
  } finally {
    loading.value = false
  }
}

watch([statusFilter, matchFilter], load)

// ===== 编辑弹窗：基础配置 + Canvas ROI 标定 =====
type Point = [number, number]

const editOpen = ref(false)
const editing = ref<CameraDevice | null>(null)
const editError = ref('')
const saving = ref(false)

const form = reactive({
  name: '',
  match: '不绑定',
  streamUrl: '',
  status: '在线',
})

const draft = reactive<{ home: Point[]; away: Point[] }>({ home: [], away: [] })
const closed = reactive({ home: false, away: false })
const roiSide = ref<'home' | 'away'>('home')
const roiError = ref('')

const editMatchOptions = ['不绑定', ...matchOptions.map((m) => m.name)]

const canvas = ref<HTMLCanvasElement | null>(null)
const CANVAS_W = 640
const CANVAS_H = 360

function drawPolygon(ctx: CanvasRenderingContext2D, points: Point[], color: string, side: 'home' | 'away') {
  if (!points.length) return
  ctx.beginPath()
  points.forEach((point, index) => {
    const x = point[0] * CANVAS_W
    const y = point[1] * CANVAS_H
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  if (closed[side] && points.length >= 3) {
    ctx.closePath()
    ctx.fillStyle = `${color}44`
    ctx.fill()
  }
  ctx.strokeStyle = color
  ctx.lineWidth = 2.5
  ctx.stroke()
  for (const point of points) {
    ctx.beginPath()
    ctx.arc(point[0] * CANVAS_W, point[1] * CANVAS_H, 4.5, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }
}

function draw() {
  const el = canvas.value
  if (!el) return
  const ctx = el.getContext('2d')
  if (!ctx) return

  // 背景：模拟侧对球门的抓帧画面，右侧为球门
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
  grad.addColorStop(0, '#2a6b45')
  grad.addColorStop(1, '#123021')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  ctx.strokeStyle = 'rgba(255,255,255,0.32)'
  ctx.lineWidth = 2
  ctx.strokeRect(40, 40, CANVAS_W - 80, CANVAS_H - 80)
  ctx.beginPath()
  ctx.moveTo(40, CANVAS_H / 2)
  ctx.lineTo(CANVAS_W - 40, CANVAS_H / 2)
  ctx.stroke()

  // 球门门框与门线
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(CANVAS_W - 130, 100)
  ctx.lineTo(CANVAS_W - 130, 300)
  ctx.lineTo(CANVAS_W - 40, 300)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(CANVAS_W - 130, 100)
  ctx.lineTo(CANVAS_W - 40, 100)
  ctx.stroke()

  drawPolygon(ctx, draft.home, '#ffd666', 'home')
  drawPolygon(ctx, draft.away, '#7fd1ff', 'away')

  // 当前编辑侧边框
  ctx.strokeStyle = roiSide.value === 'home' ? 'rgba(255,214,102,0.85)' : 'rgba(127,209,255,0.85)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(1, 1, CANVAS_W - 2, CANVAS_H - 2)
}

function pointFromEvent(event: MouseEvent): Point {
  const el = canvas.value
  if (!el) return [0, 0]
  const rect = el.getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width
  const y = (event.clientY - rect.top) / rect.height
  return [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))]
}

let clickTimer: ReturnType<typeof setTimeout> | undefined

function onCanvasClick(event: MouseEvent) {
  if (clickTimer) clearTimeout(clickTimer)
  const point = pointFromEvent(event)
  // 延迟落点：双击用于闭合多边形，避免把第二次点击当成新顶点
  clickTimer = setTimeout(() => {
    const points = draft[roiSide.value]
    if (points.length >= 32) {
      roiError.value = '单个球门 ROI 最多 32 个顶点'
      return
    }
    points.push(point)
    closed[roiSide.value] = false
    roiError.value = ''
    draw()
  }, 200)
}

function onCanvasDblClick() {
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = undefined
  }
  const points = draft[roiSide.value]
  if (points.length < 3) {
    roiError.value = '至少需要 3 个顶点才能闭合多边形'
    return
  }
  closed[roiSide.value] = true
  roiError.value = ''
  draw()
}

function clearSide() {
  draft[roiSide.value] = []
  closed[roiSide.value] = false
  roiError.value = ''
  draw()
}

watch(roiSide, draw)

function openEdit(row: Record<string, unknown>) {
  const id = Number(row.id)
  const camera = items.value.find((c) => c.id === id)
  if (!camera) return
  editing.value = camera
  form.name = camera.name
  form.match = camera.match_name ?? '不绑定'
  form.streamUrl = camera.stream_url
  form.status = STATUS_TEXT[camera.status]
  draft.home = camera.home_roi ? camera.home_roi.polygon.map((p) => [p[0], p[1]] as Point) : []
  draft.away = camera.away_roi ? camera.away_roi.polygon.map((p) => [p[0], p[1]] as Point) : []
  closed.home = draft.home.length >= 3
  closed.away = draft.away.length >= 3
  roiSide.value = 'home'
  roiError.value = ''
  editError.value = ''
  editOpen.value = true
  void nextTick(draw)
}

function roiOf(points: Point[]): RoiPolygon | null {
  return points.length >= 3 ? { polygon: points.map((p) => [p[0], p[1]] as Point) } : null
}

async function save() {
  const target = editing.value
  if (!target || saving.value) return
  saving.value = true
  editError.value = ''
  try {
    const matchId = form.match === '不绑定' ? null : (matchOptions.find((m) => m.name === form.match)?.id ?? null)
    await cameraApi.update(target.id, {
      name: form.name,
      match_id: matchId,
      stream_url: form.streamUrl,
      home_roi: roiOf(draft.home),
      away_roi: roiOf(draft.away),
      status: TEXT_STATUS[form.status] ?? 'offline',
    })
    editOpen.value = false
    showMessage(`设备「${form.name}」配置已保存。`)
    await load()
  } catch (error) {
    editError.value = error instanceof ApiError ? error.message : '设备配置保存失败'
  } finally {
    saving.value = false
  }
}

function onAction(action: string, row: Record<string, unknown>) {
  if (action === '接口联调') {
    openIntegration(row)
    return
  }
  openEdit(row)
}

onMounted(load)

onBeforeUnmount(() => {
  if (clickTimer) clearTimeout(clickTimer)
})
</script>

<template>
  <PageHeader
    title="摄像设备"
    desc="绑定比赛、配置设备流地址、标定球门 ROI，并直接联调 ESP32 设备与接口"
  />

  <div class="toolbar">
    <span class="toolbar-label">设备状态</span>
    <AppSelect v-model="statusFilter" :options="STATUS_OPTIONS" />
    <span class="toolbar-label">比赛</span>
    <AppSelect v-model="matchFilter" :options="matchFilterOptions" />
    <button type="button" class="refresh-btn" :disabled="loading" @click="load">
      {{ loading ? '加载中…' : '刷新' }}
    </button>
    <span class="toolbar-note">共 {{ items.length }} 台设备</span>
  </div>

  <section class="esp32-summary">
    <div class="esp32-summary-main">
      <p class="esp32-summary-title">ESP32 设备接入</p>
      <p class="esp32-summary-desc">
        设备在线 {{ integrationStats.online }} 台 · 画面可达 {{ integrationStats.partial }} 台 ·
        未接通 {{ integrationStats.offline }} 台 · 未检测 {{ integrationStats.untested }} 台。
        后端设备配置与心跳接口尚未接通，设备会自动降级为纯推流模式。
      </p>
      <p class="esp32-summary-flow">
        联调顺序：先测设备 <code>/status</code> → 再 open <code>/stream</code> 看画面 → 最后确认后端
        <code>/api/device/vision/*</code>。
      </p>
    </div>
    <div class="esp32-summary-actions">
      <span class="esp32-badge" :class="{ ok: integrationStats.online > 0, warn: integrationStats.partial > 0 }">
        {{ integrationStats.online > 0 ? '设备已连通' : integrationStats.partial > 0 ? '部分连通' : '未连通' }}
      </span>
      <button
        type="button"
        class="refresh-btn"
        :disabled="!items.length"
        @click="openFirstIntegration"
      >
        打开设备联调
      </button>
    </div>
  </section>

  <p v-if="message" class="page-tip" :class="messageType">{{ message }}</p>

  <DataTable :columns="columns" :rows="rows" :actions="['编辑配置', '接口联调']" @action="onAction" />

  <p class="page-tip hint">
    标定要求：机位须侧对球门，ROI 贴门线内侧；主队球门与客队球门分别标注，不训练球门模型。
    设备停用后，边缘端上报的判定将被拒绝。
  </p>

  <AppModal :open="editOpen" title="设备配置" @close="editOpen = false">
    <div v-if="editing" class="form">
      <label class="field">
        <span>设备名称</span>
        <input v-model="form.name" type="text" maxlength="30" placeholder="如：东侧球门机位" />
      </label>

      <label class="field">
        <span>绑定比赛</span>
        <AppSelect v-model="form.match" :options="editMatchOptions" />
      </label>

      <label class="field">
        <span>流地址</span>
        <input v-model="form.streamUrl" type="text" maxlength="200" placeholder="http://192.168.1.50:81/stream" />
      </label>

      <label class="field">
        <span>设备状态</span>
        <AppSelect v-model="form.status" :options="['在线', '离线', '已停用']" />
      </label>

      <div class="roi-block">
        <div class="roi-head">
          <span class="roi-title">球门 ROI 标定</span>
          <div class="roi-tabs">
            <button
              type="button"
              :class="{ active: roiSide === 'home' }"
              @click="roiSide = 'home'"
            >
              主队球门{{ draft.home.length ? `（${draft.home.length} 点）` : '' }}
            </button>
            <button
              type="button"
              :class="{ active: roiSide === 'away' }"
              @click="roiSide = 'away'"
            >
              客队球门{{ draft.away.length ? `（${draft.away.length} 点）` : '' }}
            </button>
            <button type="button" class="clear" @click="clearSide">清空当前</button>
          </div>
        </div>

        <canvas
          ref="canvas"
          class="roi-canvas"
          :width="CANVAS_W"
          :height="CANVAS_H"
          @click="onCanvasClick"
          @dblclick="onCanvasDblClick"
        />

        <p class="roi-hint">
          点击添加顶点，至少 3 点后双击闭合并校验；坐标按画布宽高归一化为 0 ~ 1。
          主客两侧分别标注，未标定的球门不会参与判定。
        </p>
        <p v-if="roiError" class="page-tip error">{{ roiError }}</p>
      </div>

      <p v-if="editError" class="page-tip error">{{ editError }}</p>
    </div>

    <template #footer>
      <button type="button" class="modal-btn" :disabled="saving" @click="editOpen = false">取消</button>
      <button type="button" class="modal-btn primary" :disabled="saving" @click="save">
        {{ saving ? '保存中…' : '保存配置' }}
      </button>
    </template>
  </AppModal>

  <AppModal :open="integrationOpen" title="ESP32 设备联调" @close="integrationOpen = false">
    <DeviceIntegrationPanel
      v-if="integrationTarget"
      :device-id="integrationTarget.device_id"
      :device-name="integrationTarget.name"
      :stream-url="integrationTarget.stream_url"
      @checked="readLastResults"
    />
  </AppModal>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.toolbar-label {
  font-size: 13px;
  color: var(--muted);
}

.toolbar :deep(.app-select) {
  width: 190px;
}

.refresh-btn {
  border: 1px solid #d9e6dc;
  background: #fff;
  color: var(--green-dark);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.refresh-btn:hover:not(:disabled) {
  border-color: var(--green);
  background: var(--green-light);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-note {
  font-size: 12px;
  color: var(--muted);
}

.esp32-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px 18px;
  margin-bottom: 16px;
  border: 1px solid #dbe6df;
  border-radius: 12px;
  background: linear-gradient(135deg, #f7fbf8, #eef7f1);
}

.esp32-summary-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--green-dark);
}

.esp32-summary-desc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.8;
  color: var(--muted);
}

.esp32-summary-flow {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.8;
  color: var(--muted);
}

.esp32-summary-flow code {
  padding: 1px 6px;
  border-radius: 4px;
  background: #fff;
  color: var(--green-dark);
  font-size: 11px;
}

.esp32-summary-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.esp32-badge {
  padding: 4px 12px;
  border-radius: 999px;
  background: #fff2f1;
  color: #a3312a;
  font-size: 12px;
  font-weight: 700;
}

.esp32-badge.warn {
  background: #fff4e5;
  color: #a5611a;
}

.esp32-badge.ok {
  background: var(--green-light);
  color: var(--green-dark);
}

.page-tip {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 12px;
}

.page-tip.success {
  color: var(--green-dark);
}

.page-tip.error {
  color: #a3312a;
}

.page-tip.hint {
  margin-top: 14px;
  line-height: 1.8;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
}

.field input {
  padding: 9px 12px;
  border: 1.5px solid #d8e2da;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: var(--ink);
}

.field input:focus-visible {
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(30, 122, 63, 0.12);
  outline: none;
}

.roi-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.roi-title {
  font-size: 13px;
  color: var(--muted);
}

.roi-tabs {
  display: flex;
  gap: 6px;
}

.roi-tabs button {
  border: 1px solid #d9e6dc;
  background: #fff;
  color: var(--green-dark);
  font-size: 12px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 999px;
  cursor: pointer;
}

.roi-tabs button.active {
  background: var(--green-light);
  border-color: var(--green);
  color: var(--green);
}

.roi-tabs button.clear {
  color: #a3312a;
  border-color: #f0d6d3;
}

.roi-canvas {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 10px;
  cursor: crosshair;
}

.roi-hint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--muted);
}

.modal-btn {
  border: 1px solid #d9e6dc;
  background: #fff;
  color: var(--green-dark);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 18px;
  border-radius: 8px;
  cursor: pointer;
}

.modal-btn.primary {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
}

.modal-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
