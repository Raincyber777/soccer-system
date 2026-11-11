<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PortalHeader from './PortalHeader.vue'
import PortalFooter from './PortalFooter.vue'
import AppIcon from '../common/AppIcon.vue'
import AppModal from '../common/AppModal.vue'
import { portalApi, ApiError, type PortalArticle } from '../../api'

// 门户公开页 · 新闻政策：游客无需登录即可浏览
// 与管理员端【赛事新闻管理】【政策管理】同口径：已发布 / 已生效的内容才对外展示

// 新闻与政策由接口提供，页面只负责展示
const news = ref<PortalArticle[]>([])
const policies = ref<PortalArticle[]>([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [newsList, policyList] = await Promise.all([portalApi.news(), portalApi.policies()])
    news.value = newsList
    policies.value = policyList
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '内容加载失败'
  } finally {
    loading.value = false
  }
}

// 点击新闻卡 / 政策行打开全文弹窗
const activeItem = ref<PortalArticle | null>(null)

function openItem(item: PortalArticle) {
  activeItem.value = item
}

onMounted(load)
</script>

<template>
  <div class="portal-page">
    <PortalHeader />

    <section class="page-banner">
      <div class="banner-inner">
        <p class="banner-kicker">公开信息 · 无需登录</p>
        <h1 class="banner-title">新闻政策</h1>
        <p class="banner-desc">赛事动态、比赛战报与政策文件及时公示，让每一场比赛都规范、公开、精彩。</p>
      </div>
    </section>

    <main class="container">
      <h3 class="section-title">赛事动态与战报</h3>
      <div class="news-grid">
        <article v-for="item in news" :key="item.title" class="news-card" role="button" @click="openItem(item)">
          <span class="news-tag">{{ item.tag }}</span>
          <h4 class="news-title">{{ item.title }}</h4>
          <p class="news-summary">{{ item.summary }}</p>
          <p class="news-meta">{{ item.source }} · {{ item.date }}</p>
        </article>
      </div>

      <h3 class="section-title">政策文件</h3>
      <div class="policy-list">
        <div v-for="item in policies" :key="item.title" class="policy-row" role="button" @click="openItem(item)">
          <span class="policy-icon">
            <AppIcon name="scroll-text" :size="20" />
          </span>
          <div class="policy-body">
            <p class="policy-title">{{ item.title }}</p>
            <p class="policy-meta">{{ item.source }} · {{ item.date }}发布</p>
          </div>
          <span class="policy-more">查看全文</span>
        </div>
      </div>

      <p v-if="error" class="page-tip error">{{ error }}</p>
      <p v-if="loading" class="page-tip">正在加载新闻与政策…</p>
      <p v-else-if="!news.length && !policies.length" class="page-tip">暂无已发布的新闻或政策文件。</p>

      <p class="page-tip">新闻与政策由管理员端审核发布后在此公示；点击卡片或文件可查看全文。</p>
    </main>

    <AppModal :open="activeItem !== null" :title="activeItem?.title ?? ''" @close="activeItem = null">
      <template v-if="activeItem">
        <p class="article-meta">
          <span class="article-tag">{{ activeItem.tag }}</span>
          {{ activeItem.source }} · {{ activeItem.date }}
        </p>
        <div class="article-body">
          <p v-for="(para, index) in activeItem.body" :key="index">{{ para }}</p>
        </div>
        <router-link
          v-if="activeItem.matchId"
          :to="`/matches/${activeItem.matchId}`"
          class="article-link"
          @click="activeItem = null"
        >
          查看本场比赛详情与 AI 报告 →
        </router-link>
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
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}

/* ===== 新闻卡片 ===== */
.news-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.news-card {
  background: #fff;
  border-radius: 12px;
  padding: 22px 20px;
  box-shadow: 0 4px 14px rgba(20, 60, 40, 0.05);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.news-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 22px rgba(20, 60, 40, 0.1);
}

.news-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--green-light);
  color: var(--green-dark);
  font-size: 12px;
  font-weight: 600;
}

.news-title {
  margin-top: 12px;
  font-size: 16px;
  line-height: 1.5;
  color: var(--green-dark);
}

.news-summary {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.75;
  color: var(--muted);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-meta {
  margin-top: 12px;
  font-size: 12px;
  color: var(--muted);
}

/* ===== 政策文件列表 ===== */
.policy-list {
  margin-top: 16px;
  display: grid;
  gap: 12px;
}

.policy-row {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 14px rgba(20, 60, 40, 0.05);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.policy-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(20, 60, 40, 0.1);
}

.policy-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: var(--green-light);
  color: var(--green);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.policy-body {
  flex: 1;
  min-width: 0;
}

.policy-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--green-dark);
}

.policy-meta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}

.policy-more {
  font-size: 13px;
  color: var(--green);
  font-weight: 600;
  flex-shrink: 0;
}

/* ===== 全文弹窗 ===== */
.article-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--muted);
}

.article-tag {
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--green-light);
  color: var(--green-dark);
  font-size: 12px;
  font-weight: 600;
}

.article-body {
  margin-top: 14px;
  display: grid;
  gap: 12px;
}

.article-body p {
  font-size: 14px;
  line-height: 1.9;
  color: var(--ink);
}

.article-link {
  display: inline-block;
  margin-top: 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--green);
  text-decoration: none;
}

.article-link:hover {
  text-decoration: underline;
}

@media (max-width: 900px) {
  .news-grid {
    grid-template-columns: 1fr;
  }
}
.page-tip.error {
  color: #a3312a;
}
</style>
