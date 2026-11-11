import { ApiError } from '../error'
import type { MatchMoment, MomentApi, MomentCategory, MomentInput, MomentQuery } from '../types'
import { readMatches, matchName } from './liveGoal'
import { requireSession } from './session'

// 精彩瞬间：由摄影师手动上传，不做自动抓取
// 图片内容存 IndexedDB，元数据存 localStorage；门户只读取已发布的瞬间

const STORAGE_KEY = 'soccer-moments'
const IMAGE_DB = 'soccer-moment-db'
const IMAGE_STORE = 'images'
const MAX_IMAGE = 5 * 1024 * 1024
const CATEGORIES: MomentCategory[] = ['精彩瞬间', '进球', '庆祝', '花絮']
const imageBlobs = new Map<string, Blob>()

function delay(ms = 280) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function nowText() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function load(): MatchMoment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      save(SEED)
      return SEED.map((item) => ({ ...item }))
    }
    const parsed = JSON.parse(raw) as MatchMoment[]
    return Array.isArray(parsed) ? parsed : SEED.map((item) => ({ ...item }))
  } catch {
    return SEED.map((item) => ({ ...item }))
  }
}

function save(list: MatchMoment[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // 隐私模式写入失败时保持内存数据可用
  }
}

function seedSvg(title: string, color: string) {
  const safe = title.replace(/[<>&"]/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${color}"/><stop offset="100%" stop-color="#14532d"/>
  </linearGradient></defs>
  <rect width="960" height="540" fill="url(#g)"/>
  <circle cx="780" cy="120" r="150" fill="rgba(255,255,255,0.10)"/>
  <circle cx="160" cy="440" r="210" fill="rgba(255,255,255,0.08)"/>
  <text x="64" y="270" fill="#ffffff" font-size="44" font-family="sans-serif" font-weight="bold">${safe}</text>
  <text x="64" y="322" fill="#c9e7d4" font-size="22" font-family="sans-serif">绿茵汇 · 精彩瞬间</text>
</svg>`
  return new Blob([svg], { type: 'image/svg+xml' })
}

const SEED: MatchMoment[] = [
  {
    id: 'moment-001',
    match_id: 5,
    match_name: '实验中学 vs 市二中',
    title: '王小磊倒钩破门',
    category: '进球',
    description: '第 63 分钟，王小磊禁区前沿倒钩射门直挂死角，现场观众沸腾。',
    photographer: '摄影师小李',
    status: '已发布',
    created_at: '2026-10-22 16:20',
    published_at: '2026-10-22 18:00',
  },
  {
    id: 'moment-002',
    match_id: 6,
    match_name: '实小少年队 vs 朝阳小学',
    title: '赛前双方队长握手',
    category: '花絮',
    description: '开赛前的友好握手，展现校园足球的体育精神。',
    photographer: '摄影师小王',
    status: '已发布',
    created_at: '2026-10-23 13:50',
    published_at: '2026-10-23 15:30',
  },
  {
    id: 'moment-003',
    match_id: 10,
    match_name: '实验中学 vs 师大附中',
    title: '门将飞身扑救',
    category: '精彩瞬间',
    description: '下半场门将连续两次扑出对方必进球，成为全场焦点。',
    photographer: '摄影师小李',
    status: '待发布',
    created_at: '2026-11-01 16:40',
    published_at: null,
  },
]

function seedColor(category: MomentCategory) {
  if (category === '进球') return '#1e7a3f'
  if (category === '庆祝') return '#b26a00'
  if (category === '花絮') return '#1f5d98'
  return '#2f6b4f'
}

function openImageDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前环境不支持 IndexedDB'))
      return
    }
    const request = indexedDB.open(IMAGE_DB, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(IMAGE_STORE)) db.createObjectStore(IMAGE_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 打开失败'))
  })
}

function runImageStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openImageDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(IMAGE_STORE, mode)
        const request = run(tx.objectStore(IMAGE_STORE))
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

async function saveImage(id: string, blob: Blob) {
  try {
    await runImageStore('readwrite', (store) => store.put(blob, id))
  } catch {
    imageBlobs.set(id, blob)
  }
}

async function readImage(id: string): Promise<Blob | null> {
  try {
    const blob = await runImageStore<Blob | undefined>('readonly', (store) => store.get(id))
    if (blob) return blob
  } catch {
    // IndexedDB 不可用时走内存兜底
  }
  return imageBlobs.get(id) ?? null
}

async function removeImage(id: string) {
  imageBlobs.delete(id)
  try {
    await runImageStore('readwrite', (store) => store.delete(id))
  } catch {
    // 内容删除失败不阻断元数据清理
  }
}

function belongsToSchool(matchId: number, schoolCode: string) {
  const match = readMatches().find((item) => item.id === matchId)
  if (!match) return false
  return match.home_school_code === schoolCode || match.away_school_code === schoolCode
}

function requireManager() {
  const session = requireSession()
  if (!['admin', 'super', 'school'].includes(session.role)) {
    throw new ApiError(40300, '仅管理员或校级管理员可管理精彩瞬间')
  }
  return session
}

function assertMatchVisible(matchId: number, session: { role: string; schoolCode?: string }) {
  const match = readMatches().find((item) => item.id === matchId)
  if (!match) throw new ApiError(40400, '比赛不存在')
  if (session.role === 'school' && !belongsToSchool(matchId, session.schoolCode ?? '')) {
    throw new ApiError(20004, '只能管理本校比赛的精彩瞬间')
  }
  return match
}

export const mockMomentApi: MomentApi = {
  async list(query: MomentQuery = {}) {
    await delay()
    const session = requireManager()
    const matchIds = readMatches().map((match) => match.id)
    return load()
      .filter((item) => {
        if (session.role === 'school') {
          if (!matchIds.includes(item.match_id)) return false
          if (!belongsToSchool(item.match_id, session.schoolCode ?? '')) return false
        }
        if (query.status && item.status !== query.status) return false
        if (query.matchId && item.match_id !== query.matchId) return false
        return true
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((item) => ({ ...item }))
  },

  async upload(input: MomentInput, file: File) {
    await delay(420)
    const session = requireManager()
    const match = assertMatchVisible(input.match_id, session)
    const title = (input.title ?? '').trim()
    if (!title) throw new ApiError(10001, '请填写瞬间标题')
    if (title.length > 40) throw new ApiError(10001, '标题不能超过 40 个字符')
    if (!CATEGORIES.includes(input.category)) throw new ApiError(10001, '请选择瞬间类别')
    const description = (input.description ?? '').trim()
    if (description.length > 200) throw new ApiError(10001, '文字说明不能超过 200 个字符')
    const photographer = (input.photographer ?? '').trim() || session.account
    if (photographer.length > 20) throw new ApiError(10001, '摄影师名称不能超过 20 个字符')

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      throw new ApiError(10006, '图片格式不支持，仅支持 jpg / jpeg / png / webp')
    }
    if (file.type && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new ApiError(10006, '图片格式不支持，仅支持 jpg / jpeg / png / webp')
    }
    if (file.size > MAX_IMAGE) throw new ApiError(10007, '单张图片不能超过 5MB')

    const id = `moment-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    await saveImage(id, file)
    const moment: MatchMoment = {
      id,
      match_id: match.id,
      match_name: matchName(match),
      title,
      category: input.category,
      description,
      photographer,
      status: '待发布',
      created_at: nowText(),
      published_at: null,
    }
    const list = load()
    list.unshift(moment)
    save(list)
    return { ...moment }
  },

  async setStatus(id: string, action: 'publish' | 'offline') {
    await delay(240)
    const session = requireManager()
    const list = load()
    const index = list.findIndex((item) => item.id === id)
    const current = list[index]
    if (index < 0 || !current) throw new ApiError(40400, '精彩瞬间不存在或已被删除')
    assertMatchVisible(current.match_id, session)
    const updated: MatchMoment = {
      ...current,
      status: action === 'publish' ? '已发布' : '已下架',
      published_at: action === 'publish' ? nowText() : current.published_at,
    }
    list[index] = updated
    save(list)
    return { ...updated }
  },

  async remove(id: string) {
    await delay(260)
    const session = requireManager()
    const list = load()
    const index = list.findIndex((item) => item.id === id)
    const current = list[index]
    if (index < 0 || !current) throw new ApiError(40400, '精彩瞬间不存在或已被删除')
    assertMatchVisible(current.match_id, session)
    list.splice(index, 1)
    save(list)
    await removeImage(id)
  },

  async publicList(matchId?: number) {
    await delay()
    return load()
      .filter((item) => item.status === '已发布' && (!matchId || item.match_id === matchId))
      .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
      .map((item) => ({ ...item }))
  },

  async image(id: string) {
    await delay(120)
    const stored = await readImage(id)
    if (stored) return stored
    const moment = load().find((item) => item.id === id)
    if (moment) {
      // 内置示例没有真实图片：按类别生成一张同尺寸封面，保证门户图集可预览
      const fallback = seedSvg(moment.title, seedColor(moment.category))
      await saveImage(id, fallback)
      return fallback
    }
    return seedSvg('精彩瞬间', '#2f6b4f')
  },
}
