<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import PortalHeader from './PortalHeader.vue'
import PortalFooter from './PortalFooter.vue'
import AppModal from '../common/AppModal.vue'
import {
  portalApi,
  publicLiveApi,
  momentApi,
  ApiError,
  type MatchMoment,
  type MatchReport,
  type PortalArticle,
  type PortalMatch,
  type PublicGoalRecord,
} from '../../api'

// 门户公开页 · 比赛详情：展示对阵、比分、进球记录、AI 报告与自动关联的精彩瞬间、相关报道
// 公开端只返回进球时间与得分方，不返回机位、置信度与证据图，避免暴露算法与设备细节

const route = useRoute()
const matchId = computed(() => Number(route.params.id))

const match = ref<PortalMatch | null>(null)
const goals = ref<PublicGoalRecord[]>([])
const report = ref<MatchReport | null>(null)
const moments = ref<MatchMoment[]>([])
const momentUrls = reactive<Record<string, string>>({})
const news = ref<PortalArticle[]>([])
const activeArticle = ref<PortalArticle | null>(null)
const loading = ref(true)
const error = ref('')
const objectUrls = new Set<string>()

function timeText(iso: string) {
  return iso.slice(11, 16)
}

async function loadMomentImages(list: MatchMoment[]) {
  for (const moment of list) {
    try {
      const blob = await momentApi.image(moment.id)
      const url = URL.createObjectURL(blob)
      momentUrls[moment.id] = url
      objectUrls.add(url)
    } catch {
      momentUrls[moment.id] = ''
    }
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [schedule, records, reportData, momentList, newsList] = await Promise.all([
      portalApi.schedule(),
      publicLiveApi.goalDetections(matchId.value),
      publicLiveApi.matchReport(matchId.value),
      momentApi.publicList(matchId.value),
      portalApi.matchNews(matchId.value),
    ])
    match.value = schedule.find((m) => m.id === matchId.value) ?? null
    goals.value = records
    report.value = reportData
    moments.value = momentList
    news.value = newsList
    if (!match.value) error.value = '未找到该场比赛'
    await loadMomentImages(momentList)
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '比赛详情加载失败'
  } finally {
    loading.value = false
  }
}

onBeforeUnmount(() => {
  for (const url of objectUrls) URL.revokeObjectURL(url)
  objectUrls.clear()
})

onMounted(load)
</script>

<template>
  <div class="portal-page">
    <PortalHeader />

    <section class="page-banner">
      <div class="banner-inner">
        <p class="banner-kicker">公开信息 · 无需登录</p>
        <h1 class="banner-title">{{ match ? `${match.home} vs ${match.away}` : '比赛详情' }}</h1>
        <p v-if="match" class="banner-desc">
          {{ match.match }} · {{ match.time }} · {{ match.venue }} · {{ match.status }}
        </p>
      </div>
    </section>

    <main class="container">
      <p v-if="loading" class="page-tip">正在加载比赛信息…</p>
      <p v-else-if="error" class="page-tip error">{{ error }}</p>

      <template v-else-if="match">
        <div class="score-card">
          <div class="score-side">
            <span class="score-team">{{ match.home }}</span>
            <span class="score-label">主队</span>
          </div>
          <div class="score-center">
            <span class="score-value">{{ match.score }}</span>
            <span class="score-status">{{ match.phase || match.status }}</span>
          </div>
          <div class="score-side right">
            <span class="score-team">{{ match.away }}</span>
            <span class="score-label">客队</span>
          </div>
        </div>

        <section class="goal-section">
          <header class="goal-head">
            <h2>进球记录</h2>
            <span class="goal-count">已确认 {{ goals.length }} 球</span>
          </header>

          <p v-if="!goals.length" class="page-tip">本场暂无已确认的进球记录。</p>

          <ol v-else class="goal-timeline">
            <li v-for="goal in goals" :key="goal.id" class="goal-item">
              <span class="goal-minute">{{ goal.minute }}'</span>
              <span class="goal-dot" :class="goal.scoring_side" aria-hidden="true" />
              <div class="goal-body">
                <p class="goal-main">第 {{ goal.minute }} 分钟 · {{ goal.scoring_side_display }}进球</p>
                <p class="goal-time">{{ timeText(goal.occurred_at) }} 记录</p>
              </div>
            </li>
          </ol>
        </section>

        <section v-if="report" class="report-section">
          <header class="goal-head">
            <h2>AI 比赛报告</h2>
            <span class="goal-count">自动生成 · {{ report.phase_display }}</span>
          </header>
          <p class="report-summary">{{ report.summary }}</p>
          <ul class="report-highlights">
            <li v-for="item in report.highlights" :key="item">{{ item }}</li>
          </ul>
          <div v-for="section in report.sections" :key="section.title" class="report-block">
            <h3>{{ section.title }}</h3>
            <p>{{ section.content }}</p>
          </div>
          <p class="report-meta">生成时间：{{ report.generated_at }} · 内容由比赛事件自动汇总</p>
        </section>

        <section v-if="moments.length" class="moment-section">
          <header class="goal-head">
            <h2>精彩瞬间</h2>
            <span class="goal-count">摄影师现场拍摄 · {{ moments.length }} 张</span>
          </header>
          <div class="moment-grid">
            <figure v-for="moment in moments" :key="moment.id" class="moment-card">
              <img v-if="momentUrls[moment.id]" :src="momentUrls[moment.id]" :alt="moment.title" />
              <figcaption>
                <p class="moment-title">{{ moment.title }}</p>
                <p class="moment-desc">{{ moment.description || '—' }}</p>
                <p class="moment-meta">
                  {{ moment.category }} · {{ moment.photographer }} · {{ moment.published_at }}
                </p>
              </figcaption>
            </figure>
          </div>
        </section>

        <section v-if="news.length" class="news-section">
          <header class="goal-head">
            <h2>相关报道</h2>
            <span class="goal-count">按比赛与球队自动关联</span>
          </header>
          <ul class="related-news">
            <li v-for="article in news" :key="article.title" @click="activeArticle = article">
              <span class="related-tag">{{ article.tag }}</span>
              <span class="related-title">{{ article.title }}</span>
              <span class="related-date">{{ article.date }}</span>
            </li>
          </ul>
        </section>

        <p class="page-tip note">
          进球记录经管理员复核确认后发布；比赛进行中可稍后刷新查看最新记录。
          <router-link to="/schedule" class="back-link">返回赛程赛果</router-link>
        </p>
      </template>
    </main>

    <AppModal :open="activeArticle !== null" :title="activeArticle?.title ?? ''" @close="activeArticle = null">
      <template v-if="activeArticle">
        <p class="article-meta">
          <span class="article-tag">{{ activeArticle.tag }}</span>
          {{ activeArticle.source }} · {{ activeArticle.date }}
        </p>
        <div class="article-body">
          <p v-for="(para, index) in activeArticle.body" :key="index">{{ para }}</p>
        </div>
      </template>
    </AppModal>

    <PortalFooter />
  </div>
</template>

<style scoped>
.page-banner {
  background: linear-gradient(140deg, #0f2f20 0%, #17402c 55%, #1e5a38 100%);
  color: #fff;
  padding: 40px 24px 44px;
}

.banner-inner {
  max-width: 1100px;
  margin: 0 auto;
}

.banner-kicker {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3em;
  color: #9fd4b5;
}

.banner-title {
  margin-top: 8px;
  font-size: 30px;
  font-weight: 800;
}

.banner-desc {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.8;
  color: #d7e7dc;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}

.score-card {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 18px;
  padding: 26px 24px;
  background: #fff;
  border: 1px solid #eef1ee;
  border-radius: 16px;
  box-shadow: var(--shadow-sm, 0 8px 24px rgba(20, 60, 40, 0.08));
}

.score-side {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.score-side.right {
  align-items: flex-end;
  text-align: right;
}

.score-team {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
}

.score-label {
  font-size: 12px;
  color: var(--muted);
}

.score-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.score-value {
  font-size: 34px;
  font-weight: 800;
  color: var(--green-dark);
  letter-spacing: 2px;
}

.score-status {
  font-size: 12px;
  color: var(--muted);
}

.goal-section {
  margin-top: 28px;
  background: #fff;
  border: 1px solid #eef1ee;
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-sm, 0 8px 24px rgba(20, 60, 40, 0.08));
}

.goal-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.goal-head h2 {
  font-size: 19px;
  color: var(--green-dark);
}

.goal-count {
  font-size: 12px;
  color: var(--muted);
}

.report-section {
  margin-top: 24px;
  background: #fff;
  border: 1px solid #eef1ee;
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-sm, 0 8px 24px rgba(20, 60, 40, 0.08));
}

.report-summary {
  font-size: 14px;
  line-height: 1.9;
  color: var(--ink);
}

.report-highlights {
  margin: 14px 0 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.9;
  color: var(--green-dark);
}

.report-block {
  margin-top: 18px;
}

.report-block h3 {
  font-size: 14px;
  color: var(--ink);
  margin-bottom: 6px;
}

.report-block p {
  font-size: 13px;
  line-height: 1.85;
  color: var(--muted);
}

.report-meta {
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px dashed #e6ece8;
  font-size: 12px;
  color: var(--muted);
}

.moment-section,
.news-section {
  margin-top: 24px;
  background: #fff;
  border: 1px solid #eef1ee;
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-sm, 0 8px 24px rgba(20, 60, 40, 0.08));
}

.moment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.moment-card {
  margin: 0;
  border: 1px solid #eef1ee;
  border-radius: 12px;
  overflow: hidden;
  background: #fbfdfb;
}

.moment-card img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
}

.moment-card figcaption {
  padding: 12px 14px 14px;
}

.moment-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}

.moment-desc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--muted);
}

.moment-meta {
  margin-top: 8px;
  font-size: 11px;
  color: var(--muted);
}

.related-news {
  margin: 0;
  padding: 0;
  list-style: none;
}

.related-news li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px dashed #e6ece8;
  cursor: pointer;
}

.related-news li:last-child {
  border-bottom: none;
}

.related-news li:hover .related-title {
  color: var(--green);
}

.related-tag {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--green-light);
  color: var(--green-dark);
  font-size: 11px;
}

.related-title {
  flex: 1;
  font-size: 13px;
  color: var(--ink);
}

.related-date {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--muted);
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--muted);
}

.article-tag {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--green-light);
  color: var(--green-dark);
  font-size: 11px;
}

.article-body {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.article-body p {
  font-size: 14px;
  line-height: 1.9;
  color: var(--ink);
}

.goal-timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.goal-item {
  display: flex;
  align-items: center;
  gap: 14px;
}

.goal-minute {
  width: 52px;
  flex-shrink: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--green-dark);
  text-align: right;
}

.goal-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--green);
  box-shadow: 0 0 0 4px rgba(30, 122, 63, 0.12);
}

.goal-dot.away {
  background: #2f6fa8;
  box-shadow: 0 0 0 4px rgba(47, 111, 168, 0.12);
}

.goal-body {
  border-bottom: 1px dashed var(--line, #e7eee8);
  padding-bottom: 10px;
  flex: 1;
}

.goal-main {
  font-size: 14px;
  color: var(--ink);
}

.goal-time {
  margin-top: 2px;
  font-size: 12px;
  color: var(--muted);
}

.page-tip {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 12px;
}

.page-tip.error {
  color: #a3312a;
}

.page-tip.note {
  margin-top: 20px;
  line-height: 1.8;
}

.back-link {
  color: var(--green);
  font-weight: 600;
  margin-left: 6px;
}
</style>
