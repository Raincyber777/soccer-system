// 通用日期工具
/** 今天的日期字符串（本地时区，YYYY-MM-DD），用于日期选择器的禁选范围等场景 */
export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
