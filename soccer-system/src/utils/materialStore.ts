/** 已上传材料的本地留存：后端通用上传无台账模型，按上传入口分组存 localStorage，
 *  刷新后「已上传的材料」列表可恢复显示（链接为同源 /media/ 相对路径，恒有效） */
export interface MaterialRecord {
  name: string
  url: string
  /** 履历类材料的分栏标题（如「等级证书」） */
  label?: string
  time: string
}

const KEY = 'soccer-materials'
const MAX_PER_SCENE = 20

function readAll(): Record<string, MaterialRecord[]> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, MaterialRecord[]>
  } catch {
    return {}
  }
}

export function loadMaterials(scene: string): MaterialRecord[] {
  return readAll()[scene] ?? []
}

/** 记录并返回带时间戳的完整记录：页面先 unshift 再由本函数落盘，保持两处数据一致 */
export function addMaterial(scene: string, rec: { name: string; url: string; label?: string }): MaterialRecord {
  const full: MaterialRecord = { ...rec, time: new Date().toLocaleString('zh-CN', { hour12: false }) }
  const all = readAll()
  const list = all[scene] ?? []
  list.unshift(full)
  all[scene] = list.slice(0, MAX_PER_SCENE)
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // 隐私模式等场景允许失败，仅影响刷新后的列表回显
  }
  return full
}
