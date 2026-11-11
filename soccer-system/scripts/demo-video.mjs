import { chromium } from 'playwright'
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const BACKEND = path.resolve(ROOT, '..', 'soccer-database-main')
const OUTPUT = path.join(ROOT, 'demo-output')
const RAW = path.join(OUTPUT, 'raw')
const PDF = path.resolve(ROOT, '..', 'test-stamped-form.pdf')
const SCREEN_MODE = process.env.RECORD_MODE === 'screen'
const SCREEN_FILE = path.join(OUTPUT, 'screen.mp4')
const FRAMES_DIR = path.join(OUTPUT, 'frames-cdp')
const NO_CAPTIONS = process.env.CAPTIONS === 'off'
const FINAL_FILE = path.join(OUTPUT, NO_CAPTIONS ? '绿茵汇功能演示-无字幕.mp4' : '绿茵汇功能演示.mp4')

const BASE = 'http://127.0.0.1:5173'
const VIEWPORT = { width: 1440, height: 900 }
const TARGET_SECONDS = 215

fs.mkdirSync(RAW, { recursive: true })
fs.rmSync(RAW, { recursive: true, force: true })
fs.mkdirSync(RAW, { recursive: true })

if (!fs.existsSync(PDF)) {
  throw new Error(`缺少测试盖章文件：${PDF}`)
}

// 每次录制前重置演示报名，保证流程可重复
execFileSync(
  path.join(BACKEND, '.venv', 'Scripts', 'python.exe'),
  [path.join(BACKEND, 'scripts', 'reset_demo.py')],
  { cwd: BACKEND, stdio: 'inherit' },
)

const captions = []
let startedAt = 0

function captionAt(text) {
  const start = (Date.now() - startedAt) / 1000
  captions.push({ start, text })
}

async function installOverlays(page) {
  await page.addInitScript((noCaption) => {
    const NO_CAPTION_FLAG = noCaption
    const ensure = () => {
      if (!document.body) return
      if (!document.getElementById('demo-caption') && !NO_CAPTION_FLAG) {
        const box = document.createElement('div')
        box.id = 'demo-caption'
        Object.assign(box.style, {
          position: 'fixed',
          left: '50%',
          bottom: '28px',
          transform: 'translateX(-50%)',
          maxWidth: '88vw',
          padding: '12px 22px',
          borderRadius: '10px',
          background: 'rgba(12, 46, 28, .90)',
          color: '#fff',
          font: '600 19px/1.5 "Microsoft YaHei", "PingFang SC", sans-serif',
          letterSpacing: '.3px',
          boxShadow: '0 10px 30px rgba(0,0,0,.28)',
          zIndex: 999999,
          pointerEvents: 'none',
          textAlign: 'center',
          whiteSpace: 'nowrap',
        })
        document.body.appendChild(box)
      }
      if (!document.getElementById('demo-cursor')) {
        const dot = document.createElement('div')
        dot.id = 'demo-cursor'
        Object.assign(dot.style, {
          position: 'fixed',
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: 'rgba(255, 196, 0, .95)',
          border: '2px solid #fff',
          boxShadow: '0 2px 8px rgba(0,0,0,.35)',
          zIndex: 1000000,
          pointerEvents: 'none',
          transform: 'translate(-50%, -50%)',
          transition: 'left .12s linear, top .12s linear',
        })
        document.body.appendChild(dot)
        document.addEventListener('mousemove', (event) => {
          dot.style.left = `${event.clientX}px`
          dot.style.top = `${event.clientY}px`
        })
        document.addEventListener('mousedown', (event) => {
          const ripple = document.createElement('div')
          Object.assign(ripple.style, {
            position: 'fixed',
            left: `${event.clientX}px`,
            top: `${event.clientY}px`,
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            border: '3px solid rgba(255, 196, 0, .95)',
            zIndex: 999998,
            pointerEvents: 'none',
            transform: 'translate(-50%, -50%)',
            animation: 'demo-ripple .45s ease-out forwards',
          })
          const style = document.createElement('style')
          style.textContent = '@keyframes demo-ripple{to{width:46px;height:46px;opacity:0}}'
          document.head.appendChild(style)
          document.body.appendChild(ripple)
          setTimeout(() => ripple.remove(), 500)
        })
      }
    }
    if (document.body) ensure()
    else document.addEventListener('DOMContentLoaded', ensure)
  }, NO_CAPTIONS)
}

async function setCaption(page, text, holdMs = 4500) {
  if (!NO_CAPTIONS) {
    captionAt(text)
    await page.evaluate((value) => {
      const box = document.getElementById('demo-caption')
      if (box) box.textContent = value
    }, text).catch(() => {})
  }
  await page.waitForTimeout(holdMs)
}

async function login(page, { admin = false, account, password }) {
  await page.evaluate(() => sessionStorage.clear()).catch(() => {})
  await page.goto(`${BASE}${admin ? '/admin/login' : '/login'}`, { waitUntil: 'networkidle' })
  await page.locator('#auth-account').fill(account)
  await page.locator('#auth-password').fill(password)
  await page.locator('button.auth-submit').click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login') && !url.pathname.endsWith('/admin/login'), {
    timeout: 20000,
  })
  await page.waitForTimeout(1600)
}

async function main() {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: !SCREEN_MODE,
    args: SCREEN_MODE
      ? ['--window-position=0,0', '--window-size=1600,1000']
      : ['--force-device-scale-factor=1'],
  })
  const context = await browser.newContext({
    viewport: SCREEN_MODE ? null : VIEWPORT,
    locale: 'zh-CN',
    ...(SCREEN_MODE ? {} : { recordVideo: { dir: RAW, size: VIEWPORT } }),
  })
  const page = await context.newPage()
  await installOverlays(page)
  await page.bringToFront().catch(() => {})

  let ffmpeg = null
  let cdp = null
  let frameIndex = 0
  const frameList = []
  if (SCREEN_MODE) {
    fs.rmSync(SCREEN_FILE, { force: true })
    ffmpeg = spawn(
      'ffmpeg',
      [
        '-y', '-hide_banner', '-loglevel', 'error',
        '-f', 'gdigrab', '-framerate', '25',
        '-offset_x', '0', '-offset_y', '0',
        '-video_size', '2400x1500', '-i', 'desktop',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
        SCREEN_FILE,
      ],
      { stdio: ['pipe', 'ignore', 'inherit'] },
    )
    await page.waitForTimeout(800)
  } else {
    fs.rmSync(FRAMES_DIR, { recursive: true, force: true })
    fs.mkdirSync(FRAMES_DIR, { recursive: true })
    cdp = await context.newCDPSession(page)
    cdp.on('Page.screencastFrame', async (event) => {
      const file = path.join(FRAMES_DIR, `frame_${String(frameIndex).padStart(6, '0')}.jpg`)
      frameIndex += 1
      fs.writeFileSync(file, Buffer.from(event.data, 'base64'))
      frameList.push({ file, ts: event.metadata.timestamp })
      try {
        await cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId })
      } catch {
        // 页面已关闭时忽略
      }
    })
    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 82,
      maxWidth: VIEWPORT.width,
      maxHeight: VIEWPORT.height,
      everyNthFrame: 1,
    })
  }

  startedAt = Date.now()

  // 1. 门户首页
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await setCaption(page, '绿茵汇 · 省级青少年足球赛事平台', 4500)
  await page.mouse.wheel(0, 620)
  await page.waitForTimeout(1800)
  await setCaption(page, '首页展示正在进行的比赛与报名中赛事', 5200)
  await page.mouse.wheel(0, 760)
  await page.waitForTimeout(1800)
  await setCaption(page, '赛事数据、榜单与现场图集一屏汇总', 5200)

  // 2. 球队负责人
  await login(page, { account: '13500000001', password: 'pass1234' })
  await page.waitForTimeout(1200)
  await setCaption(page, '球队负责人登录：工作台汇总球队、报名与待办', 5000)
  await page.goto(`${BASE}/user/team-info`, { waitUntil: 'networkidle' })
  await setCaption(page, '球队资料：真实读取后端球队与完善度', 5500)
  await page.goto(`${BASE}/user/team-members`, { waitUntil: 'networkidle' })
  await setCaption(page, '球队成员：真实球员名单，支持新增、删除与批量导入', 6500)
  await page.goto(`${BASE}/user/team-coaches`, { waitUntil: 'networkidle' })
  await setCaption(page, '教练组：满足赛事报名的资格要求', 5000)

  // 3. 赛事报名
  await page.goto(`${BASE}/user/tournaments`, { waitUntil: 'networkidle' })
  await setCaption(page, '赛事列表：选择“2026 成都市青少年足球杯”', 5500)
  const tournamentRow = page.locator('tr', { hasText: '2026 成都市青少年足球杯' }).first()
  await tournamentRow.getByRole('button', { name: '报名' }).click()
  await page.waitForURL(/registration-form/, { timeout: 15000 })
  await page.waitForTimeout(1200)
  await setCaption(page, '报名资格自查：球队、教练、球员全部就绪', 6000)
  await page.locator('input[type=file]').setInputFiles(PDF)
  await page.waitForTimeout(1600)
  await setCaption(page, '上传盖章报名表扫描件后提交', 4500)
  await page.getByRole('button', { name: '提交报名表' }).click()
  await page.locator('.success-card').waitFor({ timeout: 30000 })
  await setCaption(page, '报名提交成功：市州初审 → 省级终审时间线', 7000)
  await page.goto(`${BASE}/user/registrations`, { waitUntil: 'networkidle' })
  await setCaption(page, '我的报名：状态“待初审”，可随时查看审核进度', 6000)

  // 4. 市州初审
  await login(page, { admin: true, account: '13600000001', password: 'pass1234' })
  await page.goto(`${BASE}/admin/registration-first-review`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await setCaption(page, '市州管理员：查看报名材料并进行初审', 5500)
  const cityRow = page
    .locator('tr', { hasText: '成都实验中学一队' })
    .filter({ hasText: '2026 成都市青少年足球杯' })
    .first()
  await cityRow.getByRole('button', { name: '通过初审' }).click()
  await page.waitForTimeout(2600)
  await setCaption(page, '初审通过，报名自动报送省级终审', 6000)

  // 5. 省级终审
  await login(page, { admin: true, account: 'admin@ball.local', password: 'admin123' })
  await page.goto(`${BASE}/super/registration-review`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await setCaption(page, '省级终审：复核市州报送的报名件', 5500)
  const provinceRow = page
    .locator('tr', { hasText: '成都实验中学一队' })
    .filter({ hasText: '2026 成都市青少年足球杯' })
    .first()
  await provinceRow.getByRole('button', { name: '通过终审' }).click()
  await page.waitForTimeout(2600)
  await setCaption(page, '终审通过，报名状态更新为“已通过”', 6000)

  // 6. 校级比赛运营
  await login(page, { admin: true, account: '13700000001', password: 'pass1234' })
  await page.goto(`${BASE}/admin/school/matches`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await setCaption(page, '校级管理员：本校比赛列表', 5000)
  await page.locator('tbody tr').first().getByRole('button', { name: '比赛运营' }).click()
  await page.waitForURL(/\/admin\/school\/matches\/\d+/, { timeout: 15000 })
  await page.waitForTimeout(1800)
  await setCaption(page, '比赛运营：比分、事件、阵容、裁判、文件与直播', 5500)
  await page.locator('.tab-btn', { hasText: '比赛事件' }).click()
  await page.waitForTimeout(1800)
  await setCaption(page, '比赛事件：进球自动联动比分', 5000)
  await page.locator('.tab-btn', { hasText: '首发阵容' }).click()
  await page.waitForTimeout(1800)
  await setCaption(page, '首发阵容：主客队名单与号码', 5000)
  await page.locator('.tab-btn', { hasText: '裁判配置' }).click()
  await page.waitForTimeout(1800)
  await setCaption(page, '裁判组配置与赛事文件留档', 5000)

  // 7. 球员库
  await login(page, { admin: true, account: 'admin@ball.local', password: 'admin123' })
  await page.goto(`${BASE}/super/player-manage`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await setCaption(page, '球员库：按姓名、球队、城市与公示状态检索', 5500)
  await page.locator('tbody tr').first().getByRole('button', { name: '查看全量统计' }).click()
  await page.waitForURL(/\/super\/players\/\d+/, { timeout: 15000 })
  await page.waitForTimeout(2000)
  await setCaption(page, '球员全量档案：球队、赛季汇总与逐场记录', 6500)

  // 8. 公众端收尾
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)
  await setCaption(page, '公众端同步查看赛程、赛果与比赛详情', 5500)
  await page.mouse.wheel(0, 700)
  await page.waitForTimeout(2200)

  const elapsed = (Date.now() - startedAt) / 1000
  if (elapsed < TARGET_SECONDS) {
    await setCaption(page, '绿茵汇 · 让校园足球赛事管理更简单', (TARGET_SECONDS - elapsed) * 1000)
  }

  if (cdp) {
    const endTs = Date.now() / 1000
    await cdp.send('Page.stopScreencast').catch(() => {})
    await page.waitForTimeout(700)
    await cdp.detach().catch(() => {})
    await page.close()
    await context.close()
    await browser.close()

    if (frameList.length < 10) {
      throw new Error(`录屏帧不足：${frameList.length}`)
    }
    const listFile = path.join(OUTPUT, 'frames.txt')
    const lines = []
    frameList.forEach((frame, index) => {
      const next = frameList[index + 1]
      const raw = (next ? next.ts : endTs) - frame.ts
      const duration = Math.max(0.03, Math.min(12, raw))
      lines.push(`file '${path.relative(OUTPUT, frame.file).replace(/\\/g, '/')}'`)
      lines.push(`duration ${duration.toFixed(3)}`)
    })
    const lastFile = path.relative(OUTPUT, frameList[frameList.length - 1].file).replace(/\\/g, '/')
    lines.push(`file '${lastFile}'`, 'duration 0.6')
    fs.writeFileSync(listFile, lines.join('\n'), 'utf8')

    execFileSync(
      'ffmpeg',
      [
        '-y', '-hide_banner', '-loglevel', 'error',
        '-f', 'concat', '-safe', '0', '-i', listFile,
        '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-vf', 'fps=25,scale=1440:900:flags=lanczos,format=yuv420p',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '22',
        '-c:a', 'aac', '-b:a', '128k', '-shortest',
        '-movflags', '+faststart',
        FINAL_FILE,
      ],
      { stdio: 'inherit', cwd: OUTPUT },
    )
    fs.writeFileSync(path.join(OUTPUT, 'captions.json'), JSON.stringify(captions, null, 2), 'utf8')
    console.log(`done: ${FINAL_FILE} frames=${frameList.length}`)
    console.log(`duration target: ${TARGET_SECONDS}s`)
    return
  }

  if (SCREEN_MODE && ffmpeg) {
    await page.waitForTimeout(600)
    ffmpeg.stdin.write('q\n')
    await new Promise((resolve) => ffmpeg.on('close', resolve))
    await page.close()
    await context.close()
    await browser.close()
    fs.writeFileSync(path.join(OUTPUT, 'captions.json'), JSON.stringify(captions, null, 2), 'utf8')
    console.log(`done: ${SCREEN_FILE}`)
    console.log(`duration target: ${TARGET_SECONDS}s`)
    return
  }

  const video = page.video()
  await page.close()
  const rawPath = await video.path()
  await context.close()
  await browser.close()
  const target = path.join(OUTPUT, 'demo-raw.webm')
  fs.copyFileSync(rawPath, target)
  fs.writeFileSync(path.join(OUTPUT, 'captions.json'), JSON.stringify(captions, null, 2), 'utf8')
  console.log(`done: ${target}`)
  console.log(`duration target: ${TARGET_SECONDS}s`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
