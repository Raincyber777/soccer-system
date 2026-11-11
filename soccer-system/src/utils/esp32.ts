// ESP32-S3 设备探活工具：前端直连设备局域网地址
// 说明：设备 /status 未设置 CORS，浏览器可能读不到 JSON；此时用 <img> 探测 /stream 判断是否可达
export interface Esp32Status {
  camera: boolean
  fps: number
  rssi: number
  free_heap: number
  free_psram: number
  uptime: number
}

export type Esp32ProbeResult =
  | { ok: true; status: Esp32Status; latency: number }
  | { ok: false; kind: 'timeout' | 'network' | 'http' | 'invalid'; message: string; latency: number }

export type StreamProbe = 'ok' | 'fail' | 'timeout'

/** 把用户输入整理成 http://host:port 形式，兼容直接粘贴 /stream 或带尾斜杠 */
export function normalizeBaseUrl(input: string) {
  let value = (input ?? '').trim()
  if (!value) return ''
  if (!/^https?:\/\//i.test(value)) value = `http://${value}`
  value = value.replace(/\/+$/, '')
  value = value.replace(/\/stream$/i, '')
  return value
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function formatUptime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 秒'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (days) return `${days} 天 ${hours} 小时`
  if (hours) return `${hours} 小时 ${minutes} 分`
  if (minutes) return `${minutes} 分 ${secs} 秒`
  return `${secs} 秒`
}

function isValidStatus(value: unknown): value is Esp32Status {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return typeof data.camera === 'boolean' && typeof data.fps === 'number' && typeof data.uptime === 'number'
}

/** 读取设备 /status；超时、CORS、HTTP 错误分别给出可读原因 */
export async function probeEsp32Status(baseUrl: string, timeoutMs = 4000): Promise<Esp32ProbeResult> {
  const base = normalizeBaseUrl(baseUrl)
  if (!base) {
    return { ok: false, kind: 'invalid', message: '请先填写设备地址，如 192.168.7.1:81', latency: 0 }
  }
  const controller = new AbortController()
  const started = Date.now()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${base}/status`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })
    const latency = Date.now() - started
    if (!response.ok) {
      return { ok: false, kind: 'http', message: `设备返回 HTTP ${response.status}`, latency }
    }
    const data = await response.json()
    if (!isValidStatus(data)) {
      return { ok: false, kind: 'invalid', message: '设备返回内容不是有效的状态数据', latency }
    }
    return { ok: true, status: data, latency }
  } catch (error) {
    const latency = Date.now() - started
    if (controller.signal.aborted) {
      return { ok: false, kind: 'timeout', message: `请求超过 ${timeoutMs / 1000} 秒未响应`, latency }
    }
    return {
      ok: false,
      kind: 'network',
      message: '无法读取设备状态：设备不可达，或浏览器被 CORS 策略拦截',
      latency,
    }
  } finally {
    clearTimeout(timer)
  }
}

/** 用 <img> 探测 MJPEG 流：不经过 fetch，不受 CORS 限制，能直接判断画面是否可达 */
export function probeEsp32Stream(baseUrl: string, timeoutMs = 6000): Promise<StreamProbe> {
  const base = normalizeBaseUrl(baseUrl)
  if (!base) return Promise.resolve('fail')
  return new Promise((resolve) => {
    let settled = false
    const image = new Image()
    const finish = (result: StreamProbe) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      image.onload = null
      image.onerror = null
      image.src = ''
      resolve(result)
    }
    const timer = window.setTimeout(() => finish('timeout'), timeoutMs)
    image.onload = () => finish('ok')
    image.onerror = () => finish('fail')
    image.src = `${base}/stream?probe=${Date.now()}`
  })
}
