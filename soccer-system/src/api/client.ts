import axios from 'axios'
import type { ApiEnvelope } from './types'

// API 客户端：统一注入 token、解包 { code, data } 信封、把业务码/网络错误归一为 ApiError
// 开发环境 /api 走 vite 代理到本地 Django；生产同域部署时 baseURL 留空即可

/** 业务失败 / 网络失败统一抛这个，页面按需捕获或走 mock 兜底 */
export class ApiError extends Error {
  constructor(
    public readonly code: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** 登录 token 的 sessionStorage key（登录接入后由 auth 流程写入） */
export const TOKEN_KEY = 'soccer-token'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '',
  timeout: 8000,
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (resp) => {
    const body = resp.data as ApiEnvelope<unknown>
    // 统一响应信封：code=0 解包返回 data，其余按业务失败处理
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) return body.data
      throw new ApiError(body.code, body.message || '请求失败')
    }
    return resp.data
  },
  (error) => {
    // 网络层失败（后端未启动/超时/4xx/5xx）也归一为 ApiError，页面回退逻辑只认这一种
    if (error instanceof ApiError) throw error
    const status = error?.response?.status as number | undefined
    const message = (error?.response?.data as ApiEnvelope<unknown> | undefined)?.message
    throw new ApiError(status ?? -1, message || '网络异常，请稍后重试')
  },
)

/** 分页列表请求的快捷封装 */
export async function getPage<T>(url: string, params?: Record<string, unknown>): Promise<T[]> {
  const data = await api.get<never, { total: number; results: T[] }>(url, { params })
  return data.results
}
