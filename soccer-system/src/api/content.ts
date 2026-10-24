import { api, getPage } from './client'
import { errMsg } from './manage'

// 门户内容管理：轮播图 / 合作方 / 精彩瞬间 / 最佳阵容。
// 图片与 Logo 字段均为 CharField 存 URL：先经通用上传 POST /api/common/upload/
// 拿到地址，再随表单写入（上传函数在 api/registration.ts 的 uploadCommonFile）。
// 读失败返回 null（页面保留演示数据），写失败抛 ApiError 由页面提示。

/** 读失败回退 null：调用方据此决定是否保留本地演示行 */
async function tryList<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch {
    return null
  }
}

// ---------- 轮播图 /api/portal/banners/ ----------

export interface ApiBanner {
  id: number
  title: string
  image: string
  link_url: string
  link_news: number | null
  link_news_title: string
  sort: number
  is_active: boolean
  start_at: string | null
  end_at: string | null
  created_at: string
}

export type BannerPayload = Partial<
  Pick<ApiBanner, 'title' | 'image' | 'link_url' | 'link_news' | 'sort' | 'is_active' | 'start_at' | 'end_at'>
>

export function fetchBanners() {
  return tryList(() => getPage<ApiBanner>('/api/portal/banners/', { page_size: 100 }))
}

export function createBanner(payload: BannerPayload) {
  return api.post<never, ApiBanner>('/api/portal/banners/', payload)
}

export function updateBanner(id: number, payload: BannerPayload) {
  return api.patch<never, ApiBanner>(`/api/portal/banners/${id}/`, payload)
}

export function deleteBanner(id: number) {
  return api.delete(`/api/portal/banners/${id}/`)
}

// ---------- 合作方 /api/portal/partners/ ----------

export interface ApiPartner {
  id: number
  name: string
  logo: string
  website_url: string
  sort: number
  is_active: boolean
  created_at: string
}

export type PartnerPayload = Partial<Pick<ApiPartner, 'name' | 'logo' | 'website_url' | 'sort' | 'is_active'>>

export function fetchPartners() {
  return tryList(() => getPage<ApiPartner>('/api/portal/partners/', { page_size: 100 }))
}

export function createPartner(payload: PartnerPayload) {
  return api.post<never, ApiPartner>('/api/portal/partners/', payload)
}

export function updatePartner(id: number, payload: PartnerPayload) {
  return api.patch<never, ApiPartner>(`/api/portal/partners/${id}/`, payload)
}

export function deletePartner(id: number) {
  return api.delete(`/api/portal/partners/${id}/`)
}

// ---------- 精彩瞬间 /api/portal/highlights/ ----------

export interface ApiHighlight {
  id: number
  title: string
  description: string
  image: string
  video_url: string
  match: number | null
  match_display: string
  is_published: boolean
  published_at: string | null
  created_at: string
}

export type HighlightPayload = Partial<
  Pick<ApiHighlight, 'title' | 'description' | 'image' | 'video_url' | 'match' | 'is_published'>
>

/** 瞬间列表（staff 全量；支持 match/group_type 过滤，这里拉全量由页面筛） */
export function fetchHighlights(params?: Record<string, unknown>) {
  return tryList(() => getPage<ApiHighlight>('/api/portal/highlights/', { page_size: 100, ...params }))
}

export function createHighlight(payload: HighlightPayload) {
  return api.post<never, ApiHighlight>('/api/portal/highlights/', payload)
}

export function updateHighlight(id: number, payload: HighlightPayload) {
  return api.patch<never, ApiHighlight>(`/api/portal/highlights/${id}/`, payload)
}

export function deleteHighlight(id: number) {
  return api.delete(`/api/portal/highlights/${id}/`)
}

// ---------- 最佳阵容 /api/portal/best-lineups/ ----------

export interface ApiBestLineupPlayer {
  id: number
  name: string
  team_name: string
  position: string
  jersey_number: number | null
  avatar: string
  sort: number
}

export interface ApiBestLineup {
  id: number
  title: string
  tournament_name: string
  group_type: string
  group_type_display: string
  formation: string
  match: number | null
  match_display: string
  description: string
  is_published: boolean
  published_at: string | null
  players: ApiBestLineupPlayer[]
  created_at: string
}

export interface BestLineupPlayerInput {
  name: string
  team_name?: string
  position?: string
  jersey_number?: number | null
}

export interface BestLineupPayload {
  title?: string
  tournament_name?: string
  group_type?: string
  formation?: string
  match?: number | null
  description?: string
  is_published?: boolean
  /** 球员明细：传入即整体替换，不传保持原明细 */
  players?: BestLineupPlayerInput[]
}

export function fetchBestLineups() {
  return tryList(() => getPage<ApiBestLineup>('/api/portal/best-lineups/', { page_size: 100 }))
}

export function createBestLineup(payload: BestLineupPayload) {
  return api.post<never, ApiBestLineup>('/api/portal/best-lineups/', payload)
}

export function updateBestLineup(id: number, payload: BestLineupPayload) {
  return api.patch<never, ApiBestLineup>(`/api/portal/best-lineups/${id}/`, payload)
}

export function deleteBestLineup(id: number) {
  return api.delete(`/api/portal/best-lineups/${id}/`)
}

export { errMsg }
