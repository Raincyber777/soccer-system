<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchNews, type NewsItem } from '../../api/portal'
import heroFocus from '../../assets/hero-focus.jpg'

// 门户首页首屏（参考体育协会官网布局）：左侧赛事焦点大图（图上叠加最新战报），
// 右侧最新动态列表，底部金色荣誉饰带。焦点图可在 assets/hero-focus.jpg 整体替换。

const router = useRouter()
const news = ref<NewsItem[]>([])
const focus = ref<NewsItem | null>(null)
const restNews = ref<NewsItem[]>([])

onMounted(async () => {
  // 拉取后拆分：第一条做焦点大图，后续 4 条进右侧动态列表
  news.value = await fetchNews()
  const first = news.value[0]
  if (first) {
    focus.value = first
    restNews.value = news.value.slice(1, 5)
  }
})

function goNews() {
  router.push('/news')
}
</script>

<template>
  <section class="hero">
    <!-- 背景装饰：球场中圈线稿 -->
    <svg class="hero-lines" viewBox="0 0 600 600" aria-hidden="true">
      <circle cx="300" cy="300" r="290" />
      <circle cx="300" cy="300" r="8" />
      <line x1="300" y1="10" x2="300" y2="590" />
    </svg>

    <div class="hero-inner">
      <!-- 左：赛事焦点大图（图上叠加标题与入口） -->
      <button type="button" class="focus-card" @click="goNews">
        <img :src="heroFocus" alt="赛事焦点" class="focus-img" />
        <div class="focus-shade" aria-hidden="true"></div>

        <div class="focus-top">
          <span class="focus-badge">省级中小学足球赛事服务平台</span>
        </div>

        <div class="focus-body">
          <span class="focus-tag">{{ focus?.tag || '赛事焦点' }}</span>
          <h1 class="focus-title">
            {{ focus ? focus.title : '从校园球场，到省级赛场 —— 省级中小学足球赛事服务平台' }}
          </h1>
          <p class="focus-meta">
            <span v-if="focus?.tournament" class="focus-tournament">{{ focus.tournament }}</span>
            <span>{{ focus?.source || '赛事组委会' }} · {{ focus?.date || '' }}</span>
          </p>
        </div>

        <div class="focus-actions" @click.stop>
          <button type="button" class="hero-btn primary" @click="router.push('/schedule')">赛程赛果</button>
          <button type="button" class="hero-btn ghost" @click="router.push('/news')">新闻政策</button>
          <button type="button" class="hero-btn ghost" @click="router.push('/rankings')">赛事榜单</button>
        </div>
      </button>

      <!-- 右：最新动态列表 -->
      <aside class="news-rail">
        <div class="rail-head">
          <span class="rail-title">最新动态</span>
          <button type="button" class="rail-more" @click="goNews">查看全部 →</button>
        </div>
        <ul class="rail-list">
          <li v-for="item in restNews" :key="item.title">
            <button type="button" class="rail-item" @click="goNews">
              <span class="rail-tag">{{ item.tag }}</span>
              <span class="rail-text">{{ item.title }}</span>
              <span class="rail-date">{{ item.date }}</span>
            </button>
          </li>
          <li v-if="restNews.length === 0" class="rail-empty">暂无动态，发布新闻后在此展示。</li>
        </ul>
      </aside>
    </div>

    <!-- 金色荣誉饰带 -->
    <div class="honor-band" aria-hidden="false">
      <span class="honor-item">省级青少年校园足球联赛</span>
      <span class="honor-dot">★</span>
      <span class="honor-item">覆盖全省 21 个市州</span>
      <span class="honor-dot">★</span>
      <span class="honor-item">校园足球特色学校 187 所</span>
      <span class="honor-dot">★</span>
      <span class="honor-item">注册运动员 400 余人</span>
    </div>

    <!-- 底部波浪：衔接奶白内容区 -->
    <div class="hero-wave" aria-hidden="true">
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none">
        <path
          d="M0 46 C 240 18 480 74 720 50 C 960 28 1200 66 1440 40 L1440 90 L0 90 Z"
          fill="rgba(255, 255, 255, 0.12)"
        />
        <path
          d="M0 42 C 200 36 420 58 720 62 C 1020 66 1240 34 1440 44 L1440 90 L0 90 Z"
          fill="#f7f3ea"
        />
      </svg>
    </div>
  </section>
</template>

<style scoped>
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
  max-width: 1240px;
  margin: 0 auto;
  padding: 56px 24px 120px;
  display: grid;
  grid-template-columns: 1.62fr 0.98fr;
  gap: 28px;
  align-items: stretch;
}

/* ===== 左：焦点大图 ===== */
.focus-card {
  position: relative;
  display: block;
  min-height: 560px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  overflow: hidden;
  padding: 0;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
}

.focus-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.34);
}

.focus-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 底部渐变遮罩：保证叠加文字可读 */
.focus-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(10, 36, 24, 0.42) 0%,
    rgba(10, 36, 24, 0.05) 34%,
    rgba(10, 36, 24, 0.05) 55%,
    rgba(10, 36, 24, 0.82) 100%
  );
}

.focus-top {
  position: absolute;
  top: 20px;
  left: 24px;
}

.focus-badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.26);
  backdrop-filter: blur(4px);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.18em;
  color: #eaf6ee;
}

.focus-body {
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 76px;
}

.focus-tag {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 999px;
  background: var(--green-bright);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.focus-title {
  margin-top: 12px;
  font-size: 26px;
  line-height: 1.42;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
}

.focus-meta {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #cfe5d6;
}

.focus-tournament {
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(242, 193, 78, 0.2);
  border: 1px solid rgba(242, 193, 78, 0.5);
  color: #ffe1a1;
  font-size: 12px;
}

.focus-actions {
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 20px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-btn {
  border: none;
  border-radius: 999px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
}

.hero-btn.primary {
  background: var(--green-bright);
  color: #fff;
  box-shadow: 0 4px 14px rgba(46, 158, 82, 0.4);
}

.hero-btn.primary:hover {
  background: #3cb768;
  transform: translateY(-2px);
}

.hero-btn.ghost {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  backdrop-filter: blur(4px);
}

.hero-btn.ghost:hover {
  background: rgba(255, 255, 255, 0.22);
}

/* ===== 右：最新动态列表 ===== */
.news-rail {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 18px;
  padding: 18px 18px 12px;
  color: var(--ink);
  backdrop-filter: blur(6px);
  display: flex;
  flex-direction: column;
}

.rail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 4px 10px;
  border-bottom: 2px solid var(--green);
}

.rail-title {
  font-size: 17px;
  font-weight: 800;
  color: var(--green-dark);
}

.rail-more {
  border: none;
  background: none;
  font-size: 13px;
  color: var(--green);
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

.rail-more:hover {
  text-decoration: underline;
}

.rail-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.rail-item {
  width: 100%;
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 12px 6px;
  border: none;
  background: none;
  border-bottom: 1px dashed var(--line);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: background 0.15s;
}

.rail-item:hover {
  background: rgba(46, 158, 82, 0.06);
}

.rail-tag {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--green-dark);
  background: var(--green-light);
  border-radius: 999px;
  padding: 2px 8px;
}

.rail-text {
  flex: 1;
  font-size: 14px;
  line-height: 1.55;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.rail-date {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--muted);
}

.rail-empty {
  padding: 18px 6px;
  font-size: 13px;
  color: var(--muted);
}

/* ===== 金色荣誉饰带 ===== */
.honor-band {
  position: relative;
  z-index: 3;
  background: linear-gradient(90deg, #b98a1c, #d3a52e 50%, #b98a1c);
  color: #fff;
  text-align: center;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.06em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  flex-wrap: wrap;
  box-shadow: 0 -6px 24px rgba(10, 36, 24, 0.25);
}

.honor-dot {
  font-size: 11px;
  opacity: 0.85;
}

/* ===== 底部波浪 ===== */
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
  height: 70px;
}

@media (max-width: 900px) {
  .hero-inner {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 40px 20px 110px;
  }

  .focus-card {
    min-height: 380px;
  }

  .focus-title {
    font-size: 20px;
  }

  .focus-body {
    bottom: 68px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .focus-card,
  .hero-btn {
    transition: none;
  }
}
</style>
