<script setup lang="ts">
import soccerMatch from '../assets/soccer-match.png'

// 顶部导航（赛事/球队/场地等功能后续再接入对应页面）
const navLinks = [
  { label: '首页', active: true },
  { label: '赛事', active: false },
  { label: '球队', active: false },
  { label: '场地', active: false },
]

// 首页下方的功能亮点介绍
const features = [
  {
    icon: '🏆',
    title: '赛事报名',
    desc: '浏览并报名身边的业余联赛与杯赛，赛程、比分、积分榜一目了然。',
  },
  {
    icon: '👥',
    title: '球队组建',
    desc: '一键创建或加入心仪球队，轻松管理队内成员、训练与阵容安排。',
  },
  {
    icon: '⚽',
    title: '约球匹配',
    desc: '按时间和场上位置智能匹配球友，随时组局，让每一脚都有回应。',
  },
]
</script>

<template>
  <div class="home-page">
    <!-- 顶部导航栏 -->
    <header class="navbar">
      <div class="nav-inner">
        <router-link to="/" class="brand">
          <span class="brand-ball">⚽</span>
          <span class="brand-name">绿茵汇</span>
        </router-link>

        <nav class="nav-links">
          <span
            v-for="link in navLinks"
            :key="link.label"
            class="nav-link"
            :class="{ active: link.active }"
          >
            {{ link.label }}
          </span>
        </nav>

        <div class="nav-actions">
          <router-link to="/login" class="btn btn-ghost">登录</router-link>
          <router-link to="/register" class="btn btn-primary">注册</router-link>
        </div>
      </div>
    </header>

    <!-- 首屏：左边比赛图片，右边深绿宣传面板 -->
    <section class="hero">
      <div class="hero-media">
        <img :src="soccerMatch" alt="绿茵场上的业余足球比赛" />
      </div>

      <div class="hero-panel">
        <p class="hero-kicker">找到属于你的绿茵场</p>
        <h1 class="hero-title">让每一次踢球<br />都尽兴而归</h1>

        <!-- 标题下的波浪装饰线 -->
        <svg class="hero-underline" viewBox="0 0 160 12" aria-hidden="true">
          <path
            d="M2 8 Q 22 2 42 7 T 82 7 T 122 7 T 158 6"
            fill="none"
            stroke="#5fc98e"
            stroke-width="3"
            stroke-linecap="round"
          />
        </svg>

        <p class="hero-desc">
          组织一场比赛不该那么麻烦。从约球组局、球队管理到赛事报名，绿茵汇帮你轻松找到球友、球队和身边的比赛。
        </p>

        <p class="hero-start">开 始 探 索</p>
        <div class="hero-actions">
          <button type="button" class="hero-btn">赛事报名</button>
          <button type="button" class="hero-btn">加入球队</button>
          <button type="button" class="hero-btn">约球匹配</button>
        </div>
      </div>
    </section>

    <!-- 首屏底部的波浪过渡边 -->
    <div class="hero-wave" aria-hidden="true">
      <svg viewBox="0 0 1440 56" preserveAspectRatio="none">
        <path
          d="M0 0h1440v20q-90 36 -180 0q-90 36 -180 0q-90 36 -180 0q-90 36 -180 0q-90 36 -180 0q-90 36 -180 0q-90 36 -180 0q-90 36 -180 0z"
          fill="#17402c"
        />
      </svg>
    </div>

    <!-- 功能亮点 -->
    <section class="features">
      <div v-for="item in features" :key="item.title" class="feature-card">
        <span class="feature-icon">{{ item.icon }}</span>
        <h3 class="feature-title">{{ item.title }}</h3>
        <p class="feature-desc">{{ item.desc }}</p>
      </div>
    </section>

    <!-- 页脚 -->
    <footer class="footer">
      <p class="footer-brand">⚽ 绿茵汇</p>
      <p class="footer-text">让热爱足球的每一脚都有回响 · © 2026 绿茵汇</p>
    </footer>
  </div>
</template>

<style scoped>
/* ===== 顶部导航栏 ===== */
.navbar {
  background: #fff;
  border-bottom: 1px solid var(--line);
}

.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 22px;
  font-weight: 800;
  color: var(--green-dark);
  letter-spacing: 2px;
}

.brand-ball {
  font-size: 24px;
}

.nav-links {
  display: flex;
  gap: 28px;
}

.nav-link {
  font-size: 15px;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.2s;
}

.nav-link:hover {
  color: var(--green);
}

.nav-link.active {
  color: var(--green);
  font-weight: 700;
}

.nav-actions {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 8px 22px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.6;
  transition: all 0.2s;
}

.btn-ghost {
  border: 1.5px solid var(--green);
  color: var(--green);
}

.btn-ghost:hover {
  background: var(--green-light);
}

.btn-primary {
  background: var(--green-dark);
  color: #fff;
  border: 1.5px solid var(--green-dark);
}

.btn-primary:hover {
  background: var(--green-deeper);
}

/* ===== 首屏 ===== */
.hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 560px;
}

.hero-media {
  overflow: hidden;
}

.hero-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.hero-panel {
  background: var(--green-dark);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 72px 48px;
}

.hero-kicker {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.4em;
  text-indent: 0.4em; /* 抵消最后一个字的字距，保证视觉居中 */
  color: #cfe6d8;
}

.hero-title {
  margin-top: 18px;
  font-size: 44px;
  line-height: 1.3;
  font-weight: 800;
}

.hero-underline {
  width: 150px;
  margin-top: 16px;
}

.hero-desc {
  margin-top: 26px;
  max-width: 440px;
  font-size: 15px;
  line-height: 1.9;
  color: #d7e7dc;
}

.hero-start {
  margin-top: 36px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.5em;
  text-indent: 0.5em;
}

.hero-actions {
  margin-top: 18px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.hero-btn {
  background: var(--green);
  color: #fff;
  border: none;
  border-radius: 3px;
  padding: 13px 30px;
  font-size: 15px;
  font-weight: 600;
  transition: background 0.2s, transform 0.2s;
}

.hero-btn:hover {
  background: var(--green-bright);
  transform: translateY(-2px);
}

/* 首屏底部的波浪过渡 */
.hero-wave {
  line-height: 0;
  margin-top: -1px;
}

.hero-wave svg {
  display: block;
  width: 100%;
  height: 56px;
}

/* ===== 功能亮点 ===== */
.features {
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 24px 72px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.feature-card {
  background: #fff;
  border-radius: 12px;
  padding: 32px 28px;
  text-align: center;
  box-shadow: 0 6px 18px rgba(20, 60, 40, 0.06);
  transition: transform 0.25s, box-shadow 0.25s;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(20, 60, 40, 0.1);
}

.feature-icon {
  font-size: 36px;
}

.feature-title {
  margin-top: 14px;
  font-size: 18px;
  color: var(--green-dark);
}

.feature-desc {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--muted);
}

/* ===== 页脚 ===== */
.footer {
  background: var(--green-dark);
  color: #cfe0d5;
  text-align: center;
  padding: 28px 24px;
}

.footer-brand {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2px;
}

.footer-text {
  margin-top: 8px;
  font-size: 13px;
}

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .hero-media {
    height: 320px;
  }

  .hero-title {
    font-size: 32px;
  }

  .features {
    grid-template-columns: 1fr;
  }

  .nav-links {
    display: none;
  }
}
</style>
