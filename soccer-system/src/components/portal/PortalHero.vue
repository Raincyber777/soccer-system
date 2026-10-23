<script setup lang="ts">
import AppIcon from '../common/AppIcon.vue'
import soccerVictory from '../../assets/soccer-victory.jpg'

// 门户首页首屏：整幅深绿背景 + 左文案右图片 + 底部双层波浪
// 按钮点击通过 open 事件交由父级（HomePage）打开对应功能说明弹窗
const emit = defineEmits<{
  (e: 'open', key: 'registration' | 'team' | 'publicity'): void
}>()
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
      <div class="hero-copy">
        <p class="hero-kicker">省级中小学足球赛事服务平台</p>
        <h1 class="hero-title">从校园球场<br />到省级赛场</h1>
        <span class="hero-bar" aria-hidden="true"></span>
        <p class="hero-desc">
          学校在线报名组队，运动员、教练员注册信息一站维护，赛程赛果与政策文件及时公示，让每一场比赛都规范、公开、精彩。
        </p>
        <div class="hero-actions">
          <button type="button" class="hero-btn primary" @click="emit('open', 'registration')">赛事报名</button>
          <button type="button" class="hero-btn primary" @click="emit('open', 'team')">球队管理</button>
          <button type="button" class="hero-btn primary" @click="emit('open', 'publicity')">信息公示</button>
        </div>
      </div>

      <div class="hero-media">
        <img :src="soccerVictory" alt="绿茵场上的胜利庆祝时刻" />
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
</template>

<style scoped>
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
  border: none;
  border-radius: 999px;
  padding: 12px 30px;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
}

.hero-btn.primary {
  background: var(--green-bright);
  color: #fff;
  box-shadow: 0 4px 14px rgba(46, 158, 82, 0.35);
}

.hero-btn.primary:hover {
  background: #3cb768;
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(46, 158, 82, 0.4);
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
}

@media (prefers-reduced-motion: reduce) {
  .hero-btn {
    transition: none;
  }
}
</style>
