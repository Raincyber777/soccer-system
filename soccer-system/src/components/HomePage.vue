<script setup lang="ts">
import soccerMatch from '../assets/soccer-match.png'
import AppIcon from './common/AppIcon.vue'

// 顶部导航（功能后续再接入对应页面）
const navLinks = [
  { label: '首页', active: true },
  { label: '赛事报名', active: false },
  { label: '球队管理', active: false },
  { label: '信息公示', active: false },
]

// 首页下方的功能亮点介绍（icon 为 AppIcon 图标名）
const features = [
  {
    icon: 'trophy',
    title: '赛事报名',
    desc: '在线填报报名表、上传盖章件与学籍材料，审核进度实时可查。',
  },
  {
    icon: 'users',
    title: '球队与人员管理',
    desc: '维护球队资料、队员名单与教练组，运动员、教练员注册信息统一管理。',
  },
  {
    icon: 'megaphone',
    title: '信息公示',
    desc: '赛程对阵、比赛结果、新闻政策与榜单公示，成绩荣誉公开可查。',
  },
]
</script>

<template>
  <div class="home-page">
    <!-- 顶部导航栏 -->
    <header class="navbar">
      <div class="nav-inner">
        <router-link to="/" class="brand">
          <AppIcon name="ball" :size="24" class="brand-ball" />
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
          <router-link to="/admin/dashboard" class="btn btn-admin">管理端</router-link>
          <router-link to="/login" class="btn btn-ghost">登录</router-link>
          <router-link to="/register" class="btn btn-primary">注册</router-link>
        </div>
      </div>
    </header>

    <!-- 首屏：整幅深绿背景，左侧文案、右侧大图（图片下缘探入波浪区） -->
    <section class="hero">
      <!-- 背景装饰：球场中圈线稿 -->
      <svg class="hero-lines" viewBox="0 0 600 600" aria-hidden="true">
        <circle cx="300" cy="300" r="290" />
        <circle cx="300" cy="300" r="8" />
        <line x1="300" y1="10" x2="300" y2="590" />
      </svg>

      <div class="hero-inner">
        <div class="hero-copy">
          <p class="hero-kicker">省级中小学足球赛事服务平台</p>
          <h1 class="hero-title">从校园球场<br />到省级赛场</h1>
          <span class="hero-bar" aria-hidden="true"></span>
          <p class="hero-desc">
            学校在线报名组队，运动员、教练员注册信息一站维护，赛程赛果与政策文件及时公示，让每一场比赛都规范、公开、精彩。
          </p>
          <div class="hero-actions">
            <router-link to="/user/registration-form" class="hero-btn primary">赛事报名</router-link>
            <router-link to="/user/team-info" class="hero-btn ghost">球队管理</router-link>
            <router-link to="/user/publicity" class="hero-btn ghost">信息公示</router-link>
          </div>
        </div>

        <div class="hero-media">
          <img :src="soccerMatch" alt="绿茵场上的校园足球比赛" />
        </div>
      </div>

      <!-- 底部双层波浪：盖住图片下缘，与下方奶白区域自然衔接 -->
      <!-- 奶白波浪中间特意留了一段浅凹槽，正好避开图片里的足球位置 -->
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

    <!-- 功能亮点 -->
    <section class="features">
      <div v-for="item in features" :key="item.title" class="feature-card">
        <span class="feature-icon">
          <AppIcon :name="item.icon" :size="30" />
        </span>
        <h3 class="feature-title">{{ item.title }}</h3>
        <p class="feature-desc">{{ item.desc }}</p>
      </div>
    </section>

    <!-- 页脚 -->
    <footer class="footer">
      <p class="footer-brand">
        <AppIcon name="ball" :size="18" />
        绿茵汇
      </p>
      <p class="footer-text">让每一支校园球队都有正式赛场 · © 2026 绿茵汇</p>
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
  color: var(--green);
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

.btn-admin {
  background: #f1efe8;
  color: var(--muted);
  border: 1.5px solid transparent;
}

.btn-admin:hover {
  background: #e7e4da;
  color: var(--green-dark);
}

/* ===== 首屏：整幅深绿背景 + 左文案右图片 + 底部双层波浪 ===== */
.hero {
  position: relative;
  background: linear-gradient(140deg, #0f2f20 0%, #17402c 52%, #1e5a38 100%);
  color: #fff;
  overflow: hidden;
}

/* 背景装饰：球场中圈线稿 */
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 84px 24px 150px;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 56px;
  align-items: center;
}

.hero-kicker {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.32em;
  color: #9fd4b5;
}

.hero-title {
  margin-top: 16px;
  font-size: 46px;
  line-height: 1.28;
  font-weight: 800;
}

/* 标题下的高亮短杠 */
.hero-bar {
  display: block;
  width: 76px;
  height: 5px;
  margin-top: 20px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--green-bright), #7ddba6);
}

.hero-desc {
  margin-top: 22px;
  max-width: 460px;
  font-size: 15px;
  line-height: 1.9;
  color: #d7e7dc;
}

.hero-actions {
  margin-top: 32px;
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.hero-btn {
  display: inline-block;
  border-radius: 999px;
  padding: 12px 30px;
  font-size: 15px;
  font-weight: 600;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}

.hero-btn.primary {
  background: var(--green-bright);
  color: #fff;
}

.hero-btn.primary:hover {
  background: #3cb768;
}

.hero-btn.ghost {
  border: 1.5px solid rgba(255, 255, 255, 0.45);
  color: #fff;
}

.hero-btn.ghost:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: #fff;
}

/* 右侧比赛图片：向下探入波浪区，让波浪盖住图片下缘 */
.hero-media {
  align-self: end;
  margin-bottom: -150px;
  position: relative;
  z-index: 1;
}

.hero-media img {
  width: 100%;
  height: 520px;
  object-fit: cover;
  object-position: center bottom; /* 锚定底部：保证图片下缘的足球留在画面里 */
  display: block;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.28);
}

/* 底部双层波浪：盖在图片下缘上，与下方奶白区域衔接 */
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
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--green-light);
  color: var(--green);
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.footer-text {
  margin-top: 8px;
  font-size: 13px;
}

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .hero-inner {
    grid-template-columns: 1fr;
    gap: 40px;
    padding: 64px 20px 150px;
  }

  .hero-media {
    align-self: auto;
    margin-bottom: -150px;
  }

  .hero-media img {
    height: 340px;
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
