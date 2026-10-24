<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PortalHeader from './PortalHeader.vue'
import PortalFooter from './PortalFooter.vue'
import PortalBanner from './PortalBanner.vue'
import AppIcon from '../common/AppIcon.vue'
import AppModal from '../common/AppModal.vue'
import { news as mockNews, policies as mockPolicies, type NewsItem } from '../../data/portal-news'
import { fetchNews, fetchPolicies, type NewsWithHtml } from '../../api/portal'

// 门户公开页 · 新闻政策：游客无需登录即可浏览
// 数据优先来自后端（/api/portal/news/ 与 /policy/，见 src/api/portal.ts），
// 后端未启动时自动回退到 src/data/portal-news.ts 的演示数据，与管理端同口径

// 初始直接展示演示数据，接口返回后无缝替换
const newsList = ref<NewsWithHtml[]>(mockNews)
const policyList = ref<NewsWithHtml[]>(mockPolicies)

onMounted(async () => {
  newsList.value = await fetchNews()
  policyList.value = await fetchPolicies()
})

// 点击新闻卡 / 政策行打开全文弹窗
const activeItem = ref<NewsItem | null>(null)

function openItem(item: NewsItem) {
  activeItem.value = item
}
</script>

<template>
  <div class="portal-page">
    <PortalHeader />

    <PortalBanner
      kicker="公开信息 · 无需登录"
      title="新闻政策"
      desc="赛事动态、比赛战报与政策文件及时公示，让每一场比赛都规范、公开、精彩。"
    />

    <main class="container">
      <h3 class="section-title">赛事动态与战报</h3>
      <div class="news-grid">
        <article v-for="item in newsList" :key="item.title" class="news-card" role="button" @click="openItem(item)">
          <span class="news-tag">{{ item.tag }}</span>
          <h4 class="news-title">{{ item.title }}</h4>
          <p class="news-summary">{{ item.summary }}</p>
          <p class="news-meta">{{ item.source }} · {{ item.date }}</p>
        </article>
      </div>

      <h3 class="section-title">政策文件</h3>
      <div class="policy-list">
        <div v-for="item in policyList" :key="item.title" class="policy-row" role="button" @click="openItem(item)">
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

      <p class="page-tip">新闻与政策由管理员端审核发布后在此公示；点击卡片或文件可查看全文（演示数据为示例）。</p>
    </main>

    <AppModal :open="activeItem !== null" :title="activeItem?.title ?? ''" @close="activeItem = null">
      <template v-if="activeItem">
        <p class="article-meta">
          <span class="article-tag">{{ activeItem.tag }}</span>
          {{ activeItem.source }} · {{ activeItem.date }}
        </p>
        <!-- 后端正文是富文本 HTML；演示数据只有 body 段落 -->
        <div v-if="activeItem.html" class="article-html" v-html="activeItem.html"></div>
        <div v-else class="article-body">
          <p v-for="(para, index) in activeItem.body" :key="index">{{ para }}</p>
        </div>
      </template>
    </AppModal>

    <PortalFooter />
  </div>
</template>

<style scoped>
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

/* 后端富文本正文 */
.article-html {
  margin-top: 14px;
  font-size: 14px;
  line-height: 1.9;
  color: var(--ink);
  word-break: break-word;
}

.article-html :deep(p) {
  margin: 0 0 12px;
}

.article-html :deep(img) {
  max-width: 100%;
  border-radius: 8px;
}

@media (max-width: 900px) {
  .news-grid {
    grid-template-columns: 1fr;
  }
}
</style>
