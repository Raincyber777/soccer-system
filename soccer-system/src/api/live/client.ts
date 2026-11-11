import { ApiError } from '../error'

// 真实接口客户端：仅在 VITE_USE_MOCK=false 时启用
// 对齐后端统一信封 { code, msg, data, success, trace_id }，路径一律无尾斜杠

export const TOKEN_KEY = 'soccer-token'
export const REFRESH_KEY = 'soccer-refresh-token'

interface Envelope<T> {
  code: number
  msg?: string
  message?: string
  data: T
  success?: boolean
  trace_id?: string
}

const BASE_URL = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')
const TIMEOUT = 8000
const UPLOAD_TIMEOUT = 15000

export function getToken(): string {
  return sessionStorage.getItem(TOKEN_KEY) || ''
}

export function setTokens(access: string, refresh?: string) {
  sessionStorage.setItem(TOKEN_KEY, access)
  if (refresh) sessionStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_KEY)
}

function resolveUrl(path: string): string {
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

function buildQuery(query?: Record<string, unknown>): string {
  if (!query) return ''
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.append(key, String(value))
  })
  const text = params.toString()
  return text ? `?${text}` : ''
}

function defaultHeaders(): Headers {
  const headers = new Headers()
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

function messageOf(envelope: Envelope<unknown>): string {
  return envelope.msg || envelope.message || '请求失败'
}

async function parseEnvelope<T>(resp: Response): Promise<T> {
  let body: Envelope<T> | T
  try {
    body = (await resp.json()) as Envelope<T> | T
  } catch {
    throw new ApiError(resp.status || -1, resp.status === 401 ? '登录已过期，请重新登录' : '请求失败')
  }

  if (body && typeof body === 'object' && 'code' in body) {
    const envelope = body as Envelope<T>
    if (envelope.code !== 0) {
      if (envelope.code === 20001 || resp.status === 401) clearTokens()
      throw new ApiError(envelope.code, messageOf(envelope))
    }
    return envelope.data
  }

  if (!resp.ok) throw new ApiError(resp.status, '请求失败')
  return body as T
}

export interface RequestOptions extends RequestInit {
  /** 覆盖默认超时（毫秒） */
  timeout?: number
}

export async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const { timeout = TIMEOUT, ...rest } = init
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const headers = new Headers(rest.headers || defaultHeaders())
  if (!headers.has('Authorization')) {
    const token = getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  if (rest.body !== undefined && !(rest.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  try {
    const resp = await fetch(resolveUrl(path), { ...rest, signal: controller.signal, headers })
    return await parseEnvelope<T>(resp)
  } catch (error) {
    if (error instanceof ApiError) throw error
    if ((error as Error)?.name === 'AbortError') {
      throw new ApiError(-1, '请求超时，请稍后重试')
    }
    throw new ApiError(-1, '网络异常，请稍后重试')
  } finally {
    clearTimeout(timer)
  }
}

function jsonBody(body: unknown): string | undefined {
  return body === undefined ? undefined : JSON.stringify(body)
}

export const api = {
  get<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    return request<T>(`${path}${buildQuery(query)}`)
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: 'POST', body: jsonBody(body) })
  },
  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: 'PUT', body: jsonBody(body) })
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: 'PATCH', body: jsonBody(body) })
  },
  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' })
  },
  upload<T>(path: string, form: FormData): Promise<T> {
    return request<T>(path, { method: 'POST', body: form, timeout: UPLOAD_TIMEOUT })
  },
  async download(path: string): Promise<Blob> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT)
    try {
      const resp = await fetch(resolveUrl(path), {
        method: 'GET',
        headers: defaultHeaders(),
        signal: controller.signal,
      })
      const contentType = resp.headers.get('Content-Type') || ''
      if (contentType.includes('application/json')) {
        await parseEnvelope<unknown>(resp)
        throw new ApiError(-1, '文件下载失败')
      }
      if (!resp.ok) {
        if (resp.status === 401) clearTokens()
        throw new ApiError(resp.status, '文件下载失败')
      }
      return await resp.blob()
    } catch (error) {
      if (error instanceof ApiError) throw error
      if ((error as Error)?.name === 'AbortError') throw new ApiError(-1, '下载超时，请稍后重试')
      throw new ApiError(-1, '网络异常，请稍后重试')
    } finally {
      clearTimeout(timer)
    }
  },
}

/** 事件上报幂等键：后端要求全局唯一，重复提交返回 40009 */
export function clientToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}
