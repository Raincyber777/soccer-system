<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import soccerMatch from '../assets/soccer-match.jpg'
import AppIcon from './common/AppIcon.vue'
import PortalHeader from './portal/PortalHeader.vue'
import PortalFooter from './portal/PortalFooter.vue'
import {
  portalApi,
  tournamentApi,
  momentApi,
  rankingApi,
  registrationApi,
  type MatchMoment,
  type PortalArticle,
  type PortalMatch,
  type Registration,
  type ScorerRank,
  type StandingRow,
  type Tournament,
  type TournamentLevel,
} from '../api'
import { useAuth } from '../stores/auth'

// 门户首页：赛事数据门户，首屏即比赛与报名
// 公开接口并行加载；我的报名只在已登录用户端追加，游客不触发需要登录的接口
const auth = useAuth()

const schedule = ref<PortalMatch[]>([])
const tournaments = ref<Tournament[]>([])
const news = ref<PortalArticle[]>([])
const moments = ref<MatchMoment[]>([])
const scorers = ref<ScorerRank[]>([])
const standings = ref<StandingRow[]>([])
const myRegistrations = ref<Registration[]>([])
const loading = ref(true)
const error = ref('')

const momentUrls = reactive<Record<string, string>>({})
const momentLoading = reactive(new Set<string>())
const momentFailed = reactive(new Set<string>())
const objectUrls = new Set<string>()

const LEVEL_LABEL: Record<TournamentLevel, string> = {
  school: '校级比赛',
  city: '市级比赛',
  province: '省级比赛',
}

function endOfDay(date: string) {
  const time = new Date(`${date}T23:59:59`).getTime()
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY
}

function daysLeft(date: string) {
  const end = endOfDay(date)
  if (!Number.isFinite(end)) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${date}T00:00:00`).getTime()
  if (!Number.isFinite(target)) return null
  return Math.round((target - today.getTime()) / 86400000)
}

function deadlineText(date: string) {
  const d = daysLeft(date)
  if (d === null) return '以组委会通知为准'
  if (d < 0) return '已截止'
  if (d === 0) return '今天截止'
  return `剩余 ${d} 天`
}

function deadlineTone(date: string) {
  const d = daysLeft(date)
  if (d === null) return 'normal'
  if (d < 0) return 'expired'
  if (d === 0) return 'today'
  return d <= 3 ? 'soon' : 'normal'
}

function scheduleText(time: string) {
  return time.length >= 16 ? `${time.slice(5, 10)} ${time.slice(11, 16)}` : time
}

function statusTone(status: string) {
  if (status === '进行中') return 'live'
  if (status === '已结束') return 'done'
  return 'wait'
}

const liveMatches = computed(() => schedule.value.filter((item) => item.status === '进行中'))
const upcomingMatches = computed(() => schedule.value.filter((item) => item.status === '未开始').slice(0, 5))
const recentMatches = computed(() => schedule.value.filter((item) => item.status === '已结束').slice().reverse().slice(0, 5))

// 赛事现场固定展示最多 5 场：进行中优先，其次即将开赛，最后补最近赛果，保证板块内容充实
const spotlightMatches = computed<PortalMatch[]>(() => {
  const list: PortalMatch[] = []
  const seen = new Set<number>()
  for (const group of [liveMatches.value, upcomingMatches.value, recentMatches.value]) {
    for (const match of group) {
      if (list.length >= 5) break
      if (seen.has(match.id)) continue
      seen.add(match.id)
      list.push(match)
    }
  }
  return list
})

const openTournaments = computed(() =>
  tournaments.value
    .filter(
      (item) =>
        item.status === '报名中' &&
        item.registrationEnabled &&
        endOfDay(item.signEnd) >= Date.now(),
    )
    .slice()
    .sort((a, b) => a.signEnd.localeCompare(b.signEnd)),
)

const nextDeadline = computed(() => openTournaments.value[0] ?? null)

const latestNews = computed(() => news.value.slice(0, 6))
const latestMoments = computed(() => moments.value.slice(0, 4))
const featuredScorers = computed(() => scorers.value.slice(0, 10))

const featuredGroup = computed(() => standings.value[0]?.group ?? '')
const featuredStandings = computed(() =>
  standings.value.filter((row) => row.group === featuredGroup.value).slice(0, 10),
)

const registeredIds = computed(
  () =>
    new Set(
      myRegistrations.value
        .filter((item) => item.status !== '已驳回')
        .map((item) => item.tournamentId),
    ),
)

const heroStats = computed(() => [
  { label: '报名中赛事', value: openTournaments.value.length, unit: '项' },
  { label: '正在进行', value: liveMatches.value.length, unit: '场' },
  { label: '已发布资讯', value: news.value.length, unit: '条' },
])

function registerEntry() {
  const target = '/user/tournaments'
  return auth.state.role ? target : `/login?redirect=${encodeURIComponent(target)}`
}

function tournamentEntry(tournament: Tournament) {
  const target = `/user/registration-form?tournamentId=${encodeURIComponent(tournament.id)}`
  if (!auth.state.role) return `/login?redirect=${encodeURIComponent(target)}`
  if (auth.state.role !== 'user' || auth.state.persona !== 'leader') return '/user/tournaments'
  return target
}

function matchEntry(id: number) {
  return `/matches/${id}`
}

function categoryClass(category: MatchMoment['category']) {
  return {
    进球: 'cat-goal',
    庆祝: 'cat-celebrate',
    花絮: 'cat-backstage',
    精彩瞬间: 'cat-highlight',
  }[category]
}

// 预览图过小（上传文件损坏或占位图）时按失败处理，避免展示一张几乎不可见的图
function onMomentLoad(id: string, event: Event) {
  const image = event.target as HTMLImageElement
  if (image.naturalWidth < 40 || image.naturalHeight < 40) {
    momentFailed.add(id)
  }
}

async function loadMomentImages(list: MatchMoment[]) {
  await Promise.all(
    list.slice(0, 4).map(async (item) => {
      if (momentUrls[item.id]) return
      momentLoading.add(item.id)
      try {
        const blob = await momentApi.image(item.id)
        const url = URL.createObjectURL(blob)
        momentUrls[item.id] = url
        objectUrls.add(url)
      } catch {
        momentFailed.add(item.id)
      } finally {
        momentLoading.delete(item.id)
      }
    }),
  )
}

async function load() {
  loading.value = true
  error.value = ''
  const [scheduleResult, tournamentResult, newsResult, momentResult, scorerResult, standingResult] =
    await Promise.allSettled([
      portalApi.schedule(),
      tournamentApi.list({ publishedOnly: true }),
      portalApi.news(),
      momentApi.publicList(),
      rankingApi.scorers(),
      portalApi.standings(),
    ])

  if (scheduleResult.status === 'fulfilled') schedule.value = scheduleResult.value
  if (tournamentResult.status === 'fulfilled') tournaments.value = tournamentResult.value
  if (newsResult.status === 'fulfilled') news.value = newsResult.value
  if (momentResult.status === 'fulfilled') moments.value = momentResult.value
  if (scorerResult.status === 'fulfilled') scorers.value = scorerResult.value
  if (standingResult.status === 'fulfilled') standings.value = standingResult.value

  const results = [scheduleResult, tournamentResult, newsResult, momentResult, scorerResult, standingResult]
  if (results.every((item) => item.status === 'rejected')) {
    error.value = '首页数据加载失败，请稍后刷新重试。'
  }

  if (auth.state.role === 'user') {
    try {
      myRegistrations.value = await registrationApi.listMine()
    } catch {
      myRegistrations.value = []
    }
  }

  if (momentResult.status === 'fulfilled') {
    await loadMomentImages(momentResult.value)
  }
  loading.value = false
}

onMounted(load)

onBeforeUnmount(() => {
  for (const url of objectUrls) URL.revokeObjectURL(url)
  objectUrls.clear()
})
</script>

<template>
  <div class="home-page">
    <PortalHeader />

    <section class="hero">
      <svg class="hero-lines" viewBox="0 0 600 600" aria-hidden="true">
        <circle cx="300" cy="300" r="290" />
        <circle cx="300" cy="300" r="8" />
        <line x1="300" y1="10" x2="300" y2="590" />
      </svg>
      <span class="hero-year" aria-hidden="true">2026</span>

      <div class="hero-inner">
        <div class="hero-copy">
          <p class="hero-kicker">四川省青少年校园足球赛事服务平台</p>
          <h1 class="hero-title">从校园球场<br />到省级赛场</h1>
          <span class="hero-bar" aria-hidden="true"></span>
          <p class="hero-desc">
            查看正在进行的比赛、还能报名的赛事与最新战报，球队资料、报名审核与赛程赛果一屏掌握。
          </p>
          <div class="hero-actions">
            <router-link class="hero-btn primary" :to="registerEntry()">赛事报名</router-link>
            <router-link class="hero-btn ghost" to="/schedule">查看赛程</router-link>
            <router-link class="hero-btn ghost" to="/rankings">赛事榜单</router-link>
            <router-link class="hero-btn ghost" to="/news">新闻政策</router-link>
          </div>

          <div class="hero-board">
            <div class="board-head">
              <span>赛事数据</span>
              <span>实时更新</span>
            </div>
            <div class="hero-stats">
              <div v-for="stat in heroStats" :key="stat.label" class="hero-stat">
                <strong>{{ loading ? '—' : stat.value }}<small>{{ stat.unit }}</small></strong>
                <span>{{ stat.label }}</span>
              </div>
            </div>
            <div v-if="nextDeadline" class="board-deadline">
              <div class="deadline-info">
                <span class="deadline-label">最近截止</span>
                <strong>{{ nextDeadline.name }}</strong>
                <small>{{ nextDeadline.group }} · {{ nextDeadline.signEnd }} 截止</small>
              </div>
              <span class="deadline-pill" :class="`deadline-${deadlineTone(nextDeadline.signEnd)}`">
                {{ deadlineText(nextDeadline.signEnd) }}
              </span>
              <router-link class="board-link" :to="tournamentEntry(nextDeadline)">
                报名 <span>→</span>
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <div class="hero-media">
        <img :src="soccerMatch" alt="校园足球比赛中的拼抢瞬间" />
      </div>

      <div class="hero-wave" aria-hidden="true">
        <svg viewBox="0 0 1440 110" preserveAspectRatio="none">
          <path
            d="M0 58 C 240 22 480 92 720 64 C 960 36 1200 88 1440 52 L1440 110 L0 110 Z"
            fill="rgba(255, 255, 255, 0.12)"
          />
          <path
            d="M0 54 C 120 44 240 40 380 48 C 500 56 560 84 700 92 C 800 96 1000 96 1120 88 C 1220 80 1300 48 1440 50 L1440 110 L0 110 Z"
            fill="#f7f3ea"
          />
        </svg>
      </div>
    </section>

    <main class="portal-main">
      <p v-if="error" class="error-bar">{{ error }}</p>

      <section class="portal-section split-section">
        <div class="section-block reveal">
          <header class="section-head">
            <div>
              <p class="eyebrow">赛程</p>
              <h2>赛事现场</h2>
            </div>
            <router-link class="more-link" to="/schedule">全部赛程 <span>→</span></router-link>
          </header>

          <div v-if="loading" class="stack">
            <div v-for="i in 3" :key="i" class="skeleton-card"></div>
          </div>
          <div v-else-if="spotlightMatches.length" class="stack scroll-area match-scroll">
            <router-link
              v-for="(item, index) in spotlightMatches"
              :key="item.id"
              :to="matchEntry(item.id)"
              class="match-card reveal"
              :style="{ animationDelay: `${index * 70}ms` }"
            >
              <div class="match-top">
                <span class="match-meta">{{ item.group }} · {{ item.match }}</span>
                <span class="status-pill" :class="statusTone(item.status)">
                  <i v-if="item.status === '进行中'" class="live-dot"></i>{{ item.status }}
                </span>
              </div>
              <div class="match-score">
                <span class="team">{{ item.home }}</span>
                <strong>{{ item.score === '—' ? 'VS' : item.score }}</strong>
                <span class="team away">{{ item.away }}</span>
              </div>
              <p class="match-foot">
                <span>{{ scheduleText(item.time) }}</span>
                <span>{{ item.venue }}</span>
                <span v-if="item.phase">{{ item.phase }}</span>
              </p>
            </router-link>
          </div>
          <div v-else class="empty-card">暂无比赛</div>
        </div>

        <div class="section-block reveal">
          <header class="section-head">
            <div>
              <p class="eyebrow">报名</p>
              <h2>报名中赛事</h2>
            </div>
            <router-link class="more-link" to="/user/tournaments">浏览全部 <span>→</span></router-link>
          </header>

          <div v-if="loading" class="stack">
            <div v-for="i in 2" :key="i" class="skeleton-card"></div>
          </div>
          <div v-else-if="openTournaments.length" class="stack scroll-area tournament-scroll">
            <article
              v-for="(item, index) in openTournaments.slice(0, 5)"
              :key="item.id"
              class="tournament-card reveal"
              :style="{ animationDelay: `${index * 70}ms` }"
            >
              <div class="tournament-top">
                <span class="level-tag" :class="`level-${item.level}`">{{ LEVEL_LABEL[item.level] }}</span>
                <span class="deadline-pill" :class="`deadline-${deadlineTone(item.signEnd)}`">
                  {{ deadlineText(item.signEnd) }}
                </span>
              </div>
              <h3>{{ item.name }}</h3>
              <p class="tournament-meta">{{ item.group }} · {{ item.organizer }}</p>
              <p class="condition">球队资料完善 · 教练≥1 · 球员≥5</p>
              <div class="tournament-foot">
                <span class="sign-end">{{ item.signEnd }} 截止</span>
                <span v-if="registeredIds.has(item.id)" class="registered-badge">已报名</span>
                <router-link v-else class="mini-btn" :to="tournamentEntry(item)">立即报名</router-link>
              </div>
            </article>
          </div>
          <div v-else class="empty-card">暂无报名中赛事</div>
        </div>
      </section>

      <section class="portal-section two-col">
        <div class="section-block news-panel reveal">
          <header class="section-head">
            <div>
              <p class="eyebrow">资讯</p>
              <h2>最新资讯</h2>
            </div>
            <router-link class="more-link" to="/news">更多资讯 <span>→</span></router-link>
          </header>

          <div v-if="loading" class="stack">
            <div v-for="i in 3" :key="i" class="skeleton-card short"></div>
          </div>
          <div v-else-if="latestNews.length" class="news-list scroll-area news-scroll">
            <router-link
              v-for="(article, index) in latestNews"
              :key="article.title"
              to="/news"
              class="news-item reveal"
              :style="{ animationDelay: `${index * 60}ms` }"
            >
              <div class="news-head">
                <span class="news-tag">{{ article.tag }}</span>
                <span v-if="article.autoGenerated" class="ai-tag">AI 战报</span>
                <span class="news-date">{{ article.date }}</span>
              </div>
              <h3>{{ article.title }}</h3>
              <p>{{ article.summary }}</p>
              <small>{{ article.source }}</small>
            </router-link>
          </div>
          <div v-else class="empty-card">暂无</div>
        </div>

        <div class="rank-column">
          <div class="section-block rank-panel reveal">
            <header class="section-head">
              <div>
                <p class="eyebrow">数据</p>
                <h2>射手榜</h2>
              </div>
              <div class="head-actions">
                <span class="head-note">进球</span>
                <router-link class="more-link" to="/rankings">完整榜单 <span>→</span></router-link>
              </div>
            </header>

            <div v-if="loading" class="stack">
              <div class="skeleton-card rank-skeleton"></div>
            </div>
            <div v-else class="scroll-area rank-scroll">
              <ol v-if="featuredScorers.length" class="rank-list">
                <li v-for="(player, index) in featuredScorers" :key="`${player.name}-${player.team}`">
                  <span class="rank-no" :class="`top-${index + 1}`">{{ index + 1 }}</span>
                  <span class="rank-name">
                    {{ player.name }}
                    <small>{{ player.team }}</small>
                  </span>
                  <strong>{{ player.goals }}<small>球</small></strong>
                </li>
              </ol>
              <p v-else class="rank-empty">暂无</p>
            </div>
          </div>

          <div class="section-block rank-panel reveal">
            <header class="section-head">
              <div>
                <p class="eyebrow">数据</p>
                <h2>积分榜</h2>
              </div>
              <div class="head-actions">
                <span class="head-note">{{ featuredGroup || '组别' }}</span>
                <router-link class="more-link" to="/rankings">完整榜单 <span>→</span></router-link>
              </div>
            </header>

            <div v-if="loading" class="stack">
              <div class="skeleton-card rank-skeleton"></div>
            </div>
            <div v-else class="scroll-area rank-scroll">
              <ol v-if="featuredStandings.length" class="rank-list">
                <li v-for="(row, index) in featuredStandings" :key="`${row.team}-${row.rank}`">
                  <span class="rank-no" :class="`top-${index + 1}`">{{ index + 1 }}</span>
                  <span class="rank-name">
                    {{ row.team }}
                    <small>{{ row.win }} 胜 {{ row.draw }} 平 {{ row.loss }} 负</small>
                  </span>
                  <strong>{{ row.points }}<small>分</small></strong>
                </li>
              </ol>
              <p v-else class="rank-empty">暂无</p>
            </div>
          </div>
        </div>
      </section>

      <section v-if="loading || latestMoments.length" class="portal-section panel-section">
        <header class="section-head">
          <div>
            <p class="eyebrow">图集</p>
            <h2>精彩瞬间</h2>
          </div>
          <router-link class="more-link" to="/schedule">全部比赛 <span>→</span></router-link>
        </header>

        <div v-if="loading" class="moment-grid">
          <div v-for="i in 4" :key="i" class="skeleton-card moment-skeleton"></div>
        </div>
        <div v-else class="moment-grid" :class="`count-${Math.min(latestMoments.length, 4)}`">
          <router-link
            v-for="(item, index) in latestMoments"
            :key="item.id"
            :to="matchEntry(item.match_id)"
            class="moment-card reveal"
            :style="{ animationDelay: `${index * 70}ms` }"
          >
            <div class="moment-media" :class="[categoryClass(item.category), { failed: momentFailed.has(item.id) }]">
              <div v-if="momentLoading.has(item.id)" class="media-skeleton" aria-hidden="true"></div>
              <img
                v-else-if="momentUrls[item.id] && !momentFailed.has(item.id)"
                :src="momentUrls[item.id]"
                :alt="item.title"
                loading="lazy"
                @load="onMomentLoad(item.id, $event)"
                @error="momentFailed.add(item.id)"
              />
              <div v-else class="media-fallback">
                <AppIcon name="ball" :size="30" />
                <span>{{ item.title }}</span>
              </div>
            </div>
            <div class="moment-info">
              <div class="moment-line">
                <p class="moment-title">{{ item.title }}</p>
                <span class="moment-cat">{{ item.category }}</span>
              </div>
              <p class="moment-match">{{ item.match_name }}</p>
            </div>
          </router-link>
        </div>
      </section>
    </main>

    <PortalFooter />
  </div>
</template>

<style scoped>
.home-page {
  background: linear-gradient(180deg, #f7f3ea 0%, #fbf9f3 36%, #f6f2e8 100%);
}

.hero {
  position: relative;
  background: linear-gradient(140deg, #0f2f20 0%, #17402c 52%, #1e5a38 100%);
  color: #fff;
  overflow: hidden;
}

.hero-lines {
  position: absolute;
  top: -210px;
  left: -190px;
  width: 640px;
  height: 640px;
  fill: none;
  stroke: rgba(255, 255, 255, 0.07);
  stroke-width: 2;
}

.hero-inner {
  position: relative;
  z-index: 1;
  max-width: 1320px;
  min-height: 620px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
}

.hero-copy {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: min(540px, 46%);
  padding: 56px 0 110px;
}

/* 左下大号年份水印：填补首屏下方的空绿区，增强左栏重量 */
.hero-year {
  position: absolute;
  left: max(24px, calc((100% - 1320px) / 2 + 24px));
  bottom: 76px;
  z-index: 0;
  font-size: clamp(140px, 16vw, 240px);
  font-weight: 900;
  line-height: 0.75;
  letter-spacing: -0.04em;
  color: transparent;
  -webkit-text-stroke: 1px rgba(255, 255, 255, 0.055);
  pointer-events: none;
  user-select: none;
}

.hero-kicker {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.3em;
  color: #c9e7d4;
}

.hero-title {
  margin-top: 14px;
  font-size: clamp(34px, 4.6vw, 56px);
  line-height: 1.24;
  font-weight: 800;
}

.hero-bar {
  display: block;
  width: 76px;
  height: 5px;
  margin-top: 18px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--green-bright, #7ddba6), #7ddba6);
}

.hero-desc {
  margin-top: 20px;
  max-width: 500px;
  font-size: 15px;
  line-height: 1.9;
  color: #e6f1e9;
}

.hero-actions {
  margin-top: 30px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  padding: 11px 24px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.hero-btn.primary {
  background: var(--green-bright, #2e9e52);
  color: #fff;
  box-shadow: 0 4px 14px rgba(46, 158, 82, 0.35);
}

.hero-btn.primary:hover {
  background: #3cb768;
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(46, 158, 82, 0.4);
}

.hero-btn.ghost {
  color: #e4f2e8;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.06);
}

.hero-btn.ghost:hover {
  background: rgba(255, 255, 255, 0.14);
  transform: translateY(-2px);
}

.hero-media {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 50%;
  overflow: hidden;
  z-index: 0;
}

/* 图片左缘用深绿渐变过渡，避免生硬地切在版心边界 */
.hero-media::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(15, 47, 32, 0.5), rgba(15, 47, 32, 0) 42%);
  pointer-events: none;
}

.hero-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 62%;
  display: block;
}

/* 左侧赛事数据栏：把零散指标收成有分量的信息块 */
.hero-board {
  position: relative;
  max-width: 560px;
  margin-top: 30px;
  padding: 15px 18px 16px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: rgba(6, 26, 17, 0.55);
  backdrop-filter: blur(3px);
}

.hero-board::before {
  content: '';
  position: absolute;
  inset: 4px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  pointer-events: none;
}

.board-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 9px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.22);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2em;
  color: #d9efe1;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin-top: 12px;
}

.hero-stat {
  padding: 0 18px;
  border-left: 1px solid rgba(255, 255, 255, 0.16);
}

.hero-stat:first-child {
  padding-left: 0;
  border-left: none;
}

.hero-stat strong {
  display: block;
  font-size: 26px;
  line-height: 1.1;
  color: #fff;
}

.hero-stat strong small {
  margin-left: 3px;
  font-size: 12px;
  font-weight: 500;
  color: #d9efe1;
}

.hero-stat span {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  color: #d9efe1;
}

.board-deadline {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 13px;
  padding-top: 11px;
  border-top: 1px dashed rgba(255, 255, 255, 0.24);
}

.deadline-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.deadline-label {
  font-size: 11px;
  letter-spacing: 0.16em;
  color: #c9e7d4;
}

.deadline-info strong {
  overflow: hidden;
  color: #fff;
  font-size: 13px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.deadline-info small {
  font-size: 12px;
  color: #d9efe1;
}

.board-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #d9efe1;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.board-link span {
  transition: transform 0.2s;
}

.board-link:hover span {
  transform: translateX(3px);
}

.hero-wave {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  z-index: 2;
  line-height: 0;
  pointer-events: none;
}

.hero-wave svg {
  display: block;
  width: 100%;
  height: 110px;
}

.portal-main {
  position: relative;
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 24px 56px;
}

/* 首页头部与内容共用 1320 版心，保持品牌、标题与板块边框同一条左边界 */
.home-page :deep(.nav-inner) {
  max-width: 1320px;
}

.error-bar {
  margin-top: 20px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #fff2f1;
  border: 1px solid #f0c4c0;
  color: #a3312a;
  font-size: 13px;
}

.portal-section {
  margin-top: 30px;
}

/* 各内容板块统一外框：双层描边 + 直角，形成报纸版式 */
.section-block,
.panel-section {
  position: relative;
  padding: 22px;
  border: 1px solid #b7c6ba;
  border-radius: 0;
  background: linear-gradient(180deg, #fffefb, #fffdf8);
  box-shadow: 0 8px 22px rgba(20, 60, 40, 0.04);
  transition: border-color 0.25s, box-shadow 0.25s;
}

.section-block:hover,
.panel-section:hover {
  border-color: #a6bbaa;
  box-shadow: 0 12px 26px rgba(20, 60, 40, 0.07);
}

.section-block::before,
.panel-section::before {
  content: '';
  position: absolute;
  inset: 5px;
  border: 1px solid #d9e2da;
  pointer-events: none;
}

.split-section {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 24px;
  align-items: stretch;
}

/* 同一行的两个板块等高，底边严格对齐；列表在板内滚动 */
.split-section > .section-block {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.two-col {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 24px;
  align-items: stretch;
}

.news-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.rank-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

.rank-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--green-dark, #143c28);
}

.eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.24em;
  color: #2f6b4f;
}

.section-head h2 {
  margin-top: 6px;
  font-size: 24px;
  font-weight: 700;
  color: var(--green-dark, #143c28);
}

.more-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--green, #1e7a3f);
  text-decoration: none;
  white-space: nowrap;
}

.more-link span {
  transition: transform 0.2s;
}

.more-link:hover span {
  transform: translateX(3px);
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 列表滚动区：内容超出时在板块内滚动，滚动条收窄避免打断报纸版式 */
.scroll-area {
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(30, 122, 63, 0.3) transparent;
}

.scroll-area::-webkit-scrollbar {
  width: 6px;
}

.scroll-area::-webkit-scrollbar-thumb {
  background: rgba(30, 122, 63, 0.26);
}

.scroll-area::-webkit-scrollbar-track {
  background: transparent;
}

.match-scroll,
.tournament-scroll {
  flex: 1;
  min-height: 0;
  max-height: 330px;
  padding: 2px 8px 6px 2px;
}

.news-scroll {
  flex: 1;
  min-height: 0;
  padding: 2px 8px 6px 2px;
}

.rank-scroll {
  flex: 1;
  min-height: 0;
  max-height: 200px;
  padding: 2px 8px 6px 2px;
}

.match-card,
.tournament-card,
.news-item,
.moment-card {
  background: #fff;
  border: 1px solid #d9e2da;
  border-radius: 0;
  box-shadow: none;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.match-card:hover,
.tournament-card:hover,
.news-item:hover {
  border-color: #8fa995;
  background: #fbfdf9;
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(20, 60, 40, 0.08), inset 3px 0 0 var(--green, #1e7a3f);
}

.moment-card:hover {
  border-color: #8fa995;
  background: #fbfdf9;
  transform: translateY(-3px);
  box-shadow: 0 12px 24px rgba(20, 60, 40, 0.1);
}

.match-card {
  display: block;
  padding: 16px 18px;
  color: inherit;
  text-decoration: none;
}

.match-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.match-meta {
  font-size: 13px;
  color: var(--muted, #6b7c72);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.status-pill.live {
  background: #fff1f0;
  color: #c0392b;
}

.status-pill.done {
  background: #eef8f0;
  color: #1e7a3f;
}

.status-pill.wait {
  background: #f4f8fc;
  color: #1f5d98;
}

.live-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 5px;
  border-radius: 50%;
  background: #e5484d;
  animation: pulse 1.6s infinite;
}

.match-score {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  margin: 12px 0 10px;
}

.match-score .team {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink, #22352a);
}

.match-score .team.away {
  text-align: right;
}

.match-score strong {
  min-width: 58px;
  text-align: center;
  font-size: 20px;
  color: var(--green-dark, #143c28);
  letter-spacing: 0.04em;
}

.match-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 13px;
  color: var(--muted, #6b7c72);
}

.tournament-card {
  padding: 16px 18px;
}

.tournament-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.level-tag {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.level-province {
  background: #e7f4ec;
  color: #14532d;
}

.level-city {
  background: #eaf2fb;
  color: #1f5d98;
}

.level-school {
  background: #fff7ed;
  color: #b26a00;
}

.deadline-pill {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.deadline-normal {
  background: #eef8f0;
  color: #1e7a3f;
}

.deadline-soon {
  background: #fff7ed;
  color: #b26a00;
}

.deadline-today {
  background: #fff2f1;
  color: #c0392b;
}

.deadline-expired {
  background: #f1f3f2;
  color: #7d8a82;
}

.tournament-card h3 {
  margin-top: 10px;
  font-size: 16px;
  line-height: 1.5;
  color: var(--green-dark, #143c28);
}

.tournament-meta {
  margin-top: 5px;
  font-size: 13px;
  color: var(--muted, #6b7c72);
}

.condition {
  margin-top: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  background: #f7fbf8;
  font-size: 13px;
  color: #3f5c4b;
}

.tournament-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
}

.sign-end {
  font-size: 13px;
  color: var(--muted, #6b7c72);
}

.registered-badge {
  padding: 4px 12px;
  border-radius: 999px;
  background: #eef8f0;
  color: #1e7a3f;
  font-size: 12px;
  font-weight: 700;
}

.mini-btn {
  padding: 6px 14px;
  border-radius: 2px;
  background: linear-gradient(135deg, #1e7a3f, #2e9e52);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

.mini-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(30, 122, 63, 0.24);
}

.news-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.news-item {
  display: block;
  padding: 14px 16px;
  color: inherit;
  text-decoration: none;
}

.news-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.news-tag {
  padding: 2px 9px;
  border-radius: 999px;
  background: #eef8f0;
  color: #1e7a3f;
  font-size: 12px;
  font-weight: 600;
}

.ai-tag {
  padding: 2px 9px;
  border-radius: 999px;
  background: #14532d;
  color: #c9e7d4;
  font-size: 12px;
  font-weight: 600;
}

.news-date {
  margin-left: auto;
  font-size: 12px;
  color: var(--muted, #6b7c72);
}

.news-item h3 {
  margin-top: 8px;
  font-size: 16px;
  line-height: 1.5;
  color: var(--green-dark, #143c28);
  transition: color 0.2s;
}

.news-item:hover h3 {
  color: var(--green, #1e7a3f);
}

.news-item p {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--muted, #6b7c72);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-item small {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: #94a39b;
}

.head-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.head-note {
  font-size: 12px;
  color: var(--muted, #6b7c72);
}

.rank-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.rank-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 6px;
  border-bottom: 1px dashed #eef3ee;
  transition: background 0.2s;
}

.rank-list li:hover {
  background: #f7fbf8;
}

.rank-list li:last-child {
  border-bottom: none;
}

.rank-no {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #eef8f0;
  color: #1e7a3f;
  font-size: 11px;
  font-weight: 700;
  flex: none;
  transition: transform 0.2s;
}

.rank-list li:hover .rank-no {
  transform: scale(1.1);
}

.rank-no.top-1 {
  background: #d4a017;
  color: #fff;
}

.rank-no.top-2 {
  background: #8a94a6;
  color: #fff;
}

.rank-no.top-3 {
  background: #b87333;
  color: #fff;
}

.rank-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink, #22352a);
}

.rank-name small {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  font-weight: 400;
  color: var(--muted, #6b7c72);
}

.rank-list strong {
  font-size: 16px;
  color: var(--green-dark, #143c28);
  white-space: nowrap;
}

.rank-list strong small {
  margin-left: 2px;
  font-size: 11px;
  font-weight: 400;
  color: var(--muted, #6b7c72);
}

.rank-empty {
  padding: 18px 0 6px;
  font-size: 12px;
  color: var(--muted, #6b7c72);
  text-align: center;
}

.moment-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

/* 瞬间数量不足 4 张时按实际数量铺满，避免板块右侧留出大片空白 */
.moment-grid.count-1 {
  grid-template-columns: minmax(0, 560px);
}

.moment-grid.count-2 {
  grid-template-columns: repeat(2, 1fr);
}

.moment-grid.count-3 {
  grid-template-columns: repeat(3, 1fr);
}

.moment-card {
  overflow: hidden;
  color: inherit;
  text-decoration: none;
}

.moment-media {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: linear-gradient(135deg, #2f6b4f, #14532d);
}

.moment-media.cat-goal {
  background: linear-gradient(135deg, #1e7a3f, #0f2f20);
}

.moment-media.cat-celebrate {
  background: linear-gradient(135deg, #b26a00, #5c3600);
}

.moment-media.cat-backstage {
  background: linear-gradient(135deg, #1f5d98, #0f2f20);
}

.moment-media.cat-highlight {
  background: linear-gradient(135deg, #2f6b4f, #14532d);
}

.moment-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.moment-card:hover .moment-media img {
  transform: scale(1.04);
}

.media-skeleton {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #eef3ee 25%, #f7faf7 37%, #eef3ee 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s infinite;
}

.media-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 18px;
  text-align: center;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 600;
}

.moment-info {
  padding: 12px 14px 14px;
}

.moment-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.moment-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--green-dark, #143c28);
}

.moment-cat {
  padding: 2px 8px;
  border-radius: 999px;
  background: #eef8f0;
  color: #1e7a3f;
  font-size: 11px;
  font-weight: 600;
  flex: none;
}

.moment-match {
  margin-top: 5px;
  font-size: 12px;
  color: var(--muted, #6b7c72);
}

.empty-card {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  border: 1px dashed #c4d4c8;
  border-radius: 0;
  background: #fbfdfb;
  color: var(--muted, #6b7c72);
  font-size: 13px;
}

.skeleton-card {
  min-height: 132px;
  border-radius: 0;
  background: linear-gradient(90deg, #eef3ee 25%, #f7faf7 37%, #eef3ee 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s infinite;
}

.skeleton-card.short {
  min-height: 104px;
}

.skeleton-card.rank-skeleton {
  min-height: 220px;
}

.skeleton-card.moment-skeleton {
  min-height: 190px;
}

/* 可读性统一上调：辅助信息不再低于 13px */
.match-meta,
.match-foot,
.tournament-meta,
.condition,
.sign-end,
.news-item p,
.moment-match,
.rank-empty {
  font-size: 14px;
}

.status-pill,
.level-tag,
.deadline-pill,
.news-tag,
.ai-tag,
.news-date,
.news-item small,
.head-note,
.rank-name small,
.moment-cat,
.hero-stat span,
.hero-stat strong small,
.deadline-info small {
  font-size: 13px;
}

.news-item h3 {
  font-size: 17px;
}

.rank-name {
  font-size: 15px;
}

.moment-title {
  font-size: 16px;
}

.hero-desc {
  font-size: 16px;
}

.board-head,
.deadline-label {
  font-size: 12px;
}

.deadline-info strong,
.board-link {
  font-size: 14px;
}

.eyebrow {
  font-size: 13px;
}

.more-link {
  font-size: 14px;
}

.rank-no,
.rank-list strong small {
  font-size: 12px;
}

.reveal {
  animation: riseIn 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@keyframes riseIn {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.45;
    transform: scale(1.35);
  }
}

@media (max-width: 980px) {
  .hero-inner {
    display: block;
    min-height: 0;
    padding: 56px 20px 40px;
  }

  .hero-copy {
    width: auto;
    padding: 0;
  }

  .hero-media {
    position: static;
    width: auto;
    height: 340px;
    margin-bottom: -110px;
  }

  .hero-media::after {
    background: linear-gradient(180deg, rgba(15, 47, 32, 0.35), rgba(15, 47, 32, 0) 34%);
  }

  .hero-media img {
    height: 100%;
  }

  .split-section,
  .two-col {
    grid-template-columns: 1fr;
  }

  .moment-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .hero-inner {
    padding: 44px 20px 32px;
  }

  .hero-media {
    height: 360px;
  }

  .hero-year {
    left: 20px;
    bottom: 120px;
    font-size: 120px;
    opacity: 0.7;
  }

  .hero-actions {
    flex-direction: column;
  }

  .hero-btn {
    width: 100%;
  }

  .hero-title {
    font-size: clamp(30px, 9vw, 38px);
  }

  .hero-board {
    margin-top: 24px;
    padding: 13px 14px 14px;
  }

  .hero-stats {
    margin-top: 10px;
    gap: 0;
  }

  .hero-stat {
    padding: 0 10px;
  }

  .hero-stat:first-child {
    padding-left: 0;
  }

  .hero-stat strong {
    font-size: 20px;
  }

  .board-deadline {
    flex-wrap: wrap;
    gap: 8px;
  }

  .deadline-info {
    flex-basis: 100%;
  }

  .hero-year {
    bottom: 120px;
    font-size: 120px;
    opacity: 0.7;
  }

  .portal-main {
    padding: 4px 18px 56px;
  }

  .portal-section {
    margin-top: 28px;
  }

  .section-block,
  .panel-section {
    padding: 18px;
  }

  .match-scroll,
  .tournament-scroll {
    max-height: 300px;
  }

  .news-scroll {
    max-height: 360px;
  }

  .rank-scroll {
    max-height: 220px;
  }

  .moment-grid {
    grid-template-columns: 1fr;
  }

  .moment-grid.count-1,
  .moment-grid.count-2,
  .moment-grid.count-3 {
    grid-template-columns: 1fr;
  }

  .section-head h2 {
    font-size: 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .match-card,
  .tournament-card,
  .news-item,
  .moment-card,
  .moment-media img,
  .mini-btn,
  .more-link span {
    transition: none;
  }

  .reveal,
  .live-dot,
  .media-skeleton,
  .skeleton-card {
    animation: none;
  }
}
</style>
