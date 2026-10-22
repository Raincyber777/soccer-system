// 动态 favicon：把 favicon.svg 画到 canvas 上逐帧旋转，用 data URL 替换 <link rel="icon">
// SVG 的 SMIL 动画只有 Firefox 认，Chrome/Edge 标签页永远是静态图——这里用 canvas 补齐全浏览器动效
const SVG_URL = '/favicon.svg'
const FRAME_INTERVAL = 80 // ~12.5fps，旋转平滑且几乎不耗性能
const PERIOD_MS = 10_000 // 一圈 10 秒：动得明显但不晃眼
const SIZE = 64 // 画布 64px，高分屏缩放后仍清晰

export function startAnimatedFavicon(): void {
  // 系统开了"减少动态效果"就不动，尊重用户偏好
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) return

  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const img = new Image()
  img.src = SVG_URL
  img.addEventListener('load', () => {
    let raf = 0
    let last = 0
    const step = (now: number) => {
      if (now - last >= FRAME_INTERVAL) {
        last = now
        const angle = ((now % PERIOD_MS) / PERIOD_MS) * Math.PI * 2
        ctx.clearRect(0, 0, SIZE, SIZE)
        ctx.save()
        ctx.translate(SIZE / 2, SIZE / 2)
        ctx.rotate(angle)
        ctx.drawImage(img, 0, 0, SIZE, SIZE)
        ctx.restore()
        link.href = canvas.toDataURL('image/png')
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
  })
}
