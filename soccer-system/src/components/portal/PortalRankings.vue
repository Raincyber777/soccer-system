<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PortalHeader from './PortalHeader.vue'
import PortalFooter from './PortalFooter.vue'
import AppSelect from '../common/AppSelect.vue'
import DataTable from '../common/DataTable.vue'
import type { TableColumn } from '../common/types'
import { reportApi, rankingApi, portalApi, ApiError, type AiReport, type ScorerRank, type StandingRow } from '../../api'

// 门户公开页 · 赛事榜单：组别积分榜与射手榜，游客无需登录
// 与管理员端【榜单统计】同口径：完赛并发布后自动计入统计
// P3：接入 AI 分析报告，结论由比赛事件、球员统计与报名数据实时聚合

const groupOptions = ['全部组别', '小学组', '中学组', '高校组']
const groupFilter = ref('中学组')

// 积分榜由接口按组别提供，页面只负责筛选与展示
const standings = ref<StandingRow[]>([])
const standingsLoading = ref(false)
const standingsError = ref('')

async function loadStandings() {
  standingsLoading.value = true
  standingsError.value = ''
  try {
    standings.value = await portalApi.standings()
  } catch (error) {
    standingsError.value = error instanceof ApiError ? error.message : '积分榜加载失败'
  } finally {
    standingsLoading.value = false
  }
}

const standingColumns: TableColumn[] = [
  { key: 'rank', label: '排名', width: '70px' },
  { key: 'team', label: '球队' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'played', label: '赛', width: '60px' },
  { key: 'win', label: '胜', width: '60px' },
  { key: 'draw', label: '平', width: '60px' },
  { key: 'loss', label: '负', width: '60px' },
  { key: 'gf', label: '进', width: '60px' },
  { key: 'ga', label: '失', width: '60px' },
  { key: 'diff', label: '净胜', width: '70px' },
  { key: 'points', label: '积分', width: '70px' },
]

const visibleStandings = computed(() =>
  groupFilter.value === '全部组别' ? standings.value : standings.value.filter((s) => s.group === groupFilter.value),
)

const scorerColumns: TableColumn[] = [
  { key: 'rank', label: '排名', width: '70px' },
  { key: 'name', label: '球员', width: '110px' },
  { key: 'team', label: '所属球队' },
  { key: 'goals', label: '进球', width: '80px' },
  { key: 'assists', label: '助攻', width: '80px' },
]

// 射手榜由接口按「球员比赛明细 + 管理员补录事件」聚合，与 AI 报告同一口径
const scorers = ref<ScorerRank[]>([])
const scorersLoading = ref(false)
const scorersError = ref('')

async function loadScorers() {
  scorersLoading.value = true
  scorersError.value = ''
  try {
    scorers.value = await rankingApi.scorers()
  } catch (error) {
    scorersError.value = error instanceof ApiError ? error.message : '射手榜加载失败'
  } finally {
    scorersLoading.value = false
  }
}

// AI 分析报告：由管理员补录的事件、球员统计与报名数据生成
const report = ref<AiReport | null>(null)
const reportLoading = ref(false)
const reportError = ref('')

async function loadReport() {
  reportLoading.value = true
  reportError.value = ''
  try {
    report.value = await reportApi.rankingReport()
  } catch (error) {
    reportError.value = error instanceof ApiError ? error.message : 'AI 报告生成失败'
  } finally {
    reportLoading.value = false
  }
}

onMounted(() => {
  loadReport()
  loadScorers()
  loadStandings()
})
</script>

<template>
  <div class="portal-page">
    <PortalHeader />

    <section class="page-banner">
      <div class="banner-inner">
        <p class="banner-kicker">公开信息 · 无需登录</p>
        <h1 class="banner-title">赛事榜单</h1>
        <p class="banner-desc">组别积分榜与射手榜，比赛完赛并审核发布后自动计入统计。</p>
      </div>
    </section>

    <main class="container">
      <section class="ai-card">
        <div class="ai-head">
          <div>
            <p class="ai-kicker">AI 分析 · 自动生成</p>
            <h2 class="ai-title">{{ report?.title ?? '赛事榜单 AI 分析报告' }}</h2>
            <p class="ai-meta">
              <template v-if="report">{{ report.scope }} · 生成于 {{ report.generatedAt }}</template>
              <template v-else>正在根据最新赛事数据生成报告…</template>
            </p>
          </div>
          <button type="button" class="btn btn-ghost" :disabled="reportLoading" @click="loadReport">
            {{ reportLoading ? '生成中…' : '重新生成' }}
          </button>
        </div>

        <p v-if="reportError" class="ai-error">{{ reportError }}</p>

        <template v-if="report">
          <p class="ai-summary">{{ report.summary }}</p>
          <ul class="ai-highlights">
            <li v-for="item in report.highlights" :key="item">{{ item }}</li>
          </ul>
          <div class="ai-sections">
            <article v-for="section in report.sections" :key="section.title" class="ai-section">
              <h4 class="ai-section-title">{{ section.title }}</h4>
              <p class="ai-section-text">{{ section.content }}</p>
            </article>
          </div>
          <p class="ai-note">报告由管理员补录的比赛事件与球员统计自动汇总，数据更新后可重新生成。</p>
        </template>
      </section>

      <h3 class="section-title">积分榜</h3>
      <div class="toolbar">
        <span class="toolbar-label">按组别筛选</span>
        <AppSelect v-model="groupFilter" :options="groupOptions" />
      </div>
      <DataTable :columns="standingColumns" :rows="visibleStandings" />
      <p v-if="standingsError" class="ai-error">{{ standingsError }}</p>
      <p v-if="standingsLoading" class="loading-tip">正在加载积分榜…</p>
      <p v-else-if="!visibleStandings.length" class="page-tip">该组别暂无已发布的比赛结果。</p>

      <h3 class="section-title">射手榜</h3>
      <p v-if="scorersError" class="ai-error">{{ scorersError }}</p>
      <DataTable :columns="scorerColumns" :rows="scorers" />
      <p v-if="scorersLoading" class="loading-tip">正在加载射手榜…</p>
      <p v-else-if="!scorers.length" class="page-tip">暂无进球/助攻记录，管理员补录比赛事件后自动计入。</p>

      <p class="page-tip" style="margin-top: 16px">
        射手榜由管理员端「赛事信息录入」补录的进球与助攻事件实时聚合，与 AI 报告使用同一份数据。
      </p>
    </main>

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
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0 18px;
}

.toolbar-label {
  font-size: 14px;
  color: var(--muted);
}

.ai-card {
  background: linear-gradient(150deg, #f3faf5 0%, #ffffff 45%, #f7fbf8 100%);
  border: 1px solid #dbeade;
  border-radius: 16px;
  padding: 22px 24px;
  margin-bottom: 28px;
  box-shadow: 0 8px 24px rgba(20, 60, 40, 0.06);
}

.ai-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.ai-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: var(--green);
}

.ai-title {
  margin-top: 6px;
  font-size: 20px;
  font-weight: 800;
  color: var(--ink);
}

.ai-meta {
  margin-top: 5px;
  font-size: 12px;
  color: var(--muted);
}

.ai-summary {
  margin-top: 14px;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--ink);
}

.ai-highlights {
  margin: 14px 0 0;
  padding: 12px 16px 12px 30px;
  background: #fff;
  border-radius: 10px;
  border-left: 3px solid var(--green);
  font-size: 13px;
  line-height: 1.9;
  color: var(--ink);
}

.ai-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.ai-section {
  background: #fff;
  border-radius: 10px;
  padding: 14px 16px;
  border: 1px solid #e6f0e8;
}

.ai-section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--green-dark);
}

.ai-section-text {
  margin-top: 6px;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--muted);
}

.ai-note {
  margin-top: 14px;
  font-size: 11.5px;
  color: var(--muted);
}

.ai-error {
  margin-top: 12px;
  font-size: 13px;
  color: #a3312a;
}

.loading-tip {
  margin-top: 10px;
  font-size: 12px;
  color: var(--muted);
}

@media (max-width: 640px) {
  .ai-head {
    flex-direction: column;
  }
}
</style>
