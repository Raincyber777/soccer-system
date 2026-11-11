<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  formatBytes,
  formatUptime,
  normalizeBaseUrl,
  probeEsp32Status,
  probeEsp32Stream,
  type Esp32Status,
  type StreamProbe,
} from '../../utils/esp32'

// ESP32 设备联调面板：面向现场人员，直接给出「接口有没有接上」的结论
// 设备状态走 /status 探测；若浏览器被 CORS 拦截，再用 <img> 探测 /stream 判断画面是否可达
const props = defineProps<{
  deviceId: string
  deviceName: string
  streamUrl: string
}>()

const emit = defineEmits<{ (e: 'checked'): void }>()

const ENDPOINT_KEY = 'soccer-esp32-endpoints'
const LAST_KEY = 'soccer-esp32-last'

type ConnectionState = 'idle' | 'checking' | 'online' | 'partial' | 'offline'

const endpoint = ref('')
const connection = ref<ConnectionState>('idle')
const status = ref<Esp32Status | null>(null)
const latency = ref(0)
const errorText = ref('')
const lastChecked = ref('')
const streamState = ref<'idle' | 'loading' | 'playing' | 'error'>('idle')
const showStream = ref(false)
const streamProbe = ref<StreamProbe | null>(null)
const backendChecking = ref(false)
const backendChecked = ref(false)
const copyTip = ref('')

const CHECK_ITEMS = [
  { key: 'device', label: '设备状态接口', path: 'GET /status' },
  { key: 'stream', label: '视频流接口', path: 'GET /stream' },
  { key: 'config', label: '后端设备配置接口', path: 'GET /api/device/vision/config' },
  { key: 'heartbeat', label: '后端心跳接口', path: 'POST /api/device/vision/heartbeat' },
]

const stateText = computed(() => {
  if (connection.value === 'checking') return '检测中'
  if (connection.value === 'online') return '在线'
  if (connection.value === 'partial') return '画面可达'
  if (connection.value === 'offline') return '未接通'
  return '未检测'
})

const streamSrc = computed(() => {
  const base = normalizeBaseUrl(endpoint.value)
  return base ? `${base}/stream?t=${Date.now()}` : ''
})

const deviceItemState = computed(() => {
  if (connection.value === 'online') return 'ok'
  if (connection.value === 'partial') return 'warn'
  if (connection.value === 'offline') return 'fail'
  return 'pending'
})

const streamItemState = computed(() => {
  if (streamProbe.value === 'ok' || streamState.value === 'playing') return 'ok'
  if (streamProbe.value === 'timeout') return 'warn'
  if (streamProbe.value === 'fail') return 'fail'
  return 'pending'
})

function readEndpoints(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ENDPOINT_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function saveEndpoint(value: string) {
  try {
    const map = readEndpoints()
    map[props.deviceId] = value
    localStorage.setItem(ENDPOINT_KEY, JSON.stringify(map))
  } catch {
    // 隐私模式下仅当前页面生效
  }
}

function saveLastResult(state: ConnectionState, checkedAt: string) {
  try {
    const raw = localStorage.getItem(LAST_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, { state: ConnectionState; checkedAt: string }>) : {}
    map[props.deviceId] = { state, checkedAt }
    localStorage.setItem(LAST_KEY, JSON.stringify(map))
  } catch {
    // 隐私模式下仅当前页面生效
  }
}

function deriveDefaultEndpoint() {
  const saved = readEndpoints()[props.deviceId]
  if (saved) return saved
  const url = (props.streamUrl ?? '').trim()
  const matched = url.match(/^https?:\/\/[^/]+/i)
  return matched ? matched[0] : '192.168.7.1:81'
}

function nowText() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

async function checkConnection() {
  if (connection.value === 'checking') return
  connection.value = 'checking'
  errorText.value = ''
  status.value = null
  streamProbe.value = null
  showStream.value = false
  streamState.value = 'idle'
  saveEndpoint(endpoint.value)

  const result = await probeEsp32Status(endpoint.value)
  latency.value = result.latency
  lastChecked.value = nowText()

  if (result.ok) {
    connection.value = 'online'
    status.value = result.status
    saveLastResult('online', lastChecked.value)
    emit('checked')
    return
  }

  // 状态读不到时用画面探测区分「设备不可达」与「仅 CORS 拦截」
  const stream = await probeEsp32Stream(endpoint.value)
  streamProbe.value = stream
  if (stream === 'ok') {
    connection.value = 'partial'
    errorText.value = '画面可达，但浏览器无法读取 /status（设备未设置 CORS）。状态监测需后端代理或设备补 CORS 头。'
  } else {
    connection.value = 'offline'
    errorText.value =
      stream === 'timeout'
        ? '设备无响应：请确认设备已上电、与电脑处于同一网络，且端口 81 可访问。'
        : `${result.message}。请检查 IP、端口、防火墙，或改用 USB 直连 192.168.7.1:81。`
  }
  saveLastResult(connection.value, lastChecked.value)
  emit('checked')
}

function toggleStream() {
  if (!normalizeBaseUrl(endpoint.value)) {
    errorText.value = '请先填写设备地址'
    return
  }
  showStream.value = !showStream.value
  streamState.value = showStream.value ? 'loading' : 'idle'
}

function onStreamLoad() {
  streamState.value = 'playing'
}

function onStreamError() {
  streamState.value = 'error'
}

function useUsbDefault() {
  endpoint.value = '192.168.7.1:81'
  saveEndpoint(endpoint.value)
}

function useStreamAddress() {
  const matched = (props.streamUrl ?? '').match(/^https?:\/\/[^/]+/i)
  if (matched) {
    endpoint.value = matched[0]
    saveEndpoint(endpoint.value)
  }
}

async function copyStream() {
  const text = `${normalizeBaseUrl(endpoint.value)}/stream`
  try {
    await navigator.clipboard.writeText(text)
    copyTip.value = '已复制'
  } catch {
    copyTip.value = text
  }
  window.setTimeout(() => {
    copyTip.value = ''
  }, 2400)
}

async function checkBackend() {
  if (backendChecking.value) return
  backendChecking.value = true
  // 纯前端演示环境无后端设备接口：按接口文档第 6.6 节，vision 接口尚未实现
  await new Promise((resolve) => setTimeout(resolve, 700))
  backendChecking.value = false
  backendChecked.value = true
}

watch(endpoint, (value) => saveEndpoint(value))

onMounted(() => {
  endpoint.value = deriveDefaultEndpoint()
})

onBeforeUnmount(() => {
  showStream.value = false
})
</script>

<template>
  <div class="esp32-panel">
    <div class="esp32-head">
      <div>
        <p class="esp32-name">{{ deviceName }}</p>
        <p class="esp32-sub">设备联调：先测通设备，再确认后端接口</p>
      </div>
      <span class="state-badge" :class="connection">{{ stateText }}</span>
    </div>

    <div class="addr-row">
      <input v-model="endpoint" class="addr-input" type="text" placeholder="设备地址，如 192.168.7.1:81" />
      <button type="button" class="btn-primary" :disabled="connection === 'checking'" @click="checkConnection">
        {{ connection === 'checking' ? '检测中…' : '测试连接' }}
      </button>
      <button type="button" class="btn-ghost" @click="toggleStream">{{ showStream ? '关闭画面' : '预览画面' }}</button>
    </div>

    <div class="addr-help">
      <button type="button" class="link-btn" @click="useUsbDefault">使用 USB 默认地址</button>
      <button v-if="streamUrl" type="button" class="link-btn" @click="useStreamAddress">使用已配置流地址</button>
      <button type="button" class="link-btn" @click="copyStream">复制流地址</button>
      <span v-if="copyTip" class="copy-tip">{{ copyTip }}</span>
    </div>

    <p v-if="errorText" class="panel-error">{{ errorText }}</p>

    <div v-if="status" class="status-grid">
      <div class="status-item">
        <span>摄像头</span>
        <strong :class="status.camera ? 'ok' : 'fail'">{{ status.camera ? '已出图' : '无画面' }}</strong>
      </div>
      <div class="status-item">
        <span>帧率</span>
        <strong>{{ status.fps.toFixed(1) }} fps</strong>
      </div>
      <div class="status-item">
        <span>WiFi 信号</span>
        <strong>{{ status.rssi === 0 ? 'USB / 未连接' : `${status.rssi} dBm` }}</strong>
      </div>
      <div class="status-item">
        <span>内部内存</span>
        <strong>{{ formatBytes(status.free_heap) }}</strong>
      </div>
      <div class="status-item">
        <span>PSRAM</span>
        <strong>{{ formatBytes(status.free_psram) }}</strong>
      </div>
      <div class="status-item">
        <span>运行时长</span>
        <strong>{{ formatUptime(status.uptime) }}</strong>
      </div>
    </div>

    <p v-if="lastChecked" class="last-check">
      最近检测 {{ lastChecked }} · 响应 {{ latency }} ms
    </p>

    <div v-if="showStream" class="stream-box">
      <p class="stream-head">
        实时画面
        <span v-if="streamState === 'playing'" class="stream-ok">已连接</span>
        <span v-else-if="streamState === 'error'" class="stream-fail">无法播放</span>
        <span v-else class="stream-loading">连接中…</span>
      </p>
      <img
        v-if="streamSrc"
        :src="streamSrc"
        class="stream-image"
        alt="ESP32 实时画面"
        @load="onStreamLoad"
        @error="onStreamError"
      />
      <p v-if="streamState === 'error'" class="stream-tip">
        无法播放：设备可能不在线，或已有其他客户端在拉流（设备仅允许 1 个客户端，第二个会返回 503）。
      </p>
      <p v-else class="stream-tip">MJPEG 流仅支持 1 个客户端；打开本页面前请关闭其他预览窗口。</p>
    </div>

    <div class="checklist">
      <p class="checklist-title">接入自检</p>
      <ul>
        <li>
          <span class="dot" :class="deviceItemState" />
          <span class="check-label">设备状态接口</span>
          <code>GET /status</code>
          <span class="check-result">{{ connection === 'online' ? '正常' : connection === 'partial' ? 'CORS 拦截' : connection === 'offline' ? '未接通' : '未检测' }}</span>
        </li>
        <li>
          <span class="dot" :class="streamItemState" />
          <span class="check-label">视频流接口</span>
          <code>GET /stream</code>
          <span class="check-result">{{ streamProbe === 'ok' || streamState === 'playing' ? '正常' : streamProbe === 'timeout' ? '超时' : streamProbe === 'fail' ? '不可达' : '未检测' }}</span>
        </li>
        <li>
          <span class="dot" :class="backendChecked ? 'warn' : 'pending'" />
          <span class="check-label">后端设备配置接口</span>
          <code>GET /api/device/vision/config</code>
          <span class="check-result">{{ backendChecked ? '后端未实现' : '待检测' }}</span>
        </li>
        <li>
          <span class="dot" :class="backendChecked ? 'warn' : 'pending'" />
          <span class="check-label">后端设备心跳接口</span>
          <code>POST /api/device/vision/heartbeat</code>
          <span class="check-result">{{ backendChecked ? '后端未实现' : '待检测' }}</span>
        </li>
      </ul>
      <div class="checklist-foot">
        <button type="button" class="btn-ghost small" :disabled="backendChecking" @click="checkBackend">
          {{ backendChecking ? '检查中…' : '检查后端设备接口' }}
        </button>
        <span class="checklist-note">
          按《ESP32 对接文档》，后端 `/api/device/vision/*` 尚未实现；设备会自动降级为纯推流模式。
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.esp32-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.esp32-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.esp32-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}

.esp32-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}

.state-badge {
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: #eef1f0;
  color: var(--muted);
}

.state-badge.online {
  background: var(--green-light);
  color: var(--green-dark);
}

.state-badge.partial {
  background: #fff4e5;
  color: #a5611a;
}

.state-badge.offline {
  background: #fff2f1;
  color: #a3312a;
}

.state-badge.checking {
  background: #eef4fb;
  color: #1f5d98;
}

.addr-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.addr-input {
  flex: 1;
  min-width: 200px;
  padding: 9px 12px;
  border: 1.5px solid #d8e2da;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
}

.btn-primary,
.btn-ghost {
  padding: 9px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.btn-primary {
  border: none;
  background: var(--green);
  color: #fff;
}

.btn-ghost {
  border: 1px solid #d9e6dc;
  background: #fff;
  color: var(--green-dark);
}

.btn-primary:disabled,
.btn-ghost:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-ghost.small {
  padding: 6px 12px;
  font-size: 12px;
}

.addr-help {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.link-btn {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--green);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.link-btn:hover {
  text-decoration: underline;
}

.copy-tip {
  color: var(--muted);
}

.panel-error {
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff8f7;
  border: 1px solid #f0d4d0;
  color: #a3312a;
  font-size: 12px;
  line-height: 1.7;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
}

.status-item {
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: #fbfdfb;
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
  color: var(--muted);
}

.status-item strong {
  font-size: 14px;
  color: var(--ink);
}

.status-item strong.ok {
  color: var(--green-dark);
}

.status-item strong.fail {
  color: #a3312a;
}

.last-check {
  font-size: 12px;
  color: var(--muted);
}

.stream-box {
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #101d16;
}

.stream-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #c9e7d4;
  margin-bottom: 8px;
}

.stream-ok {
  color: #9fe3b8;
}

.stream-fail {
  color: #ffb4aa;
}

.stream-loading {
  color: #e8d18a;
}

.stream-image {
  width: 100%;
  max-height: 360px;
  object-fit: contain;
  border-radius: 8px;
  background: #000;
}

.stream-tip {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.7;
  color: #b9d8c6;
}

.checklist {
  padding: 12px 14px;
  border: 1px dashed #dbe6df;
  border-radius: 10px;
  background: #fbfdfb;
}

.checklist-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 8px;
}

.checklist ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.checklist li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 12px;
  color: var(--muted);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #c9d3cd;
}

.dot.ok {
  background: #1e7a3f;
}

.dot.warn {
  background: #d18a1c;
}

.dot.fail {
  background: #b3261e;
}

.check-label {
  color: var(--ink);
}

.checklist code {
  padding: 1px 6px;
  border-radius: 4px;
  background: #eef3ef;
  font-size: 11px;
  color: var(--green-dark);
}

.check-result {
  margin-left: auto;
  font-weight: 600;
}

.checklist-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e6ece8;
}

.checklist-note {
  font-size: 11px;
  line-height: 1.6;
  color: var(--muted);
}
</style>
