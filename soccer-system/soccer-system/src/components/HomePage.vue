<script setup lang="ts">
import { ref } from 'vue'
import PortalHeader from './portal/PortalHeader.vue'
import PortalFooter from './portal/PortalFooter.vue'
import PortalHero from './portal/PortalHero.vue'
import AppIcon from './common/AppIcon.vue'

// 门户首页：头部（导航/登录区/说明弹窗）、首屏（PortalHero）与功能亮点三段组成
// hero 按钮与功能卡片通过 ref 调用头部的 openModal 打开对应弹窗
type FeatureKey = 'registration' | 'team' | 'publicity'

const header = ref<InstanceType<typeof PortalHeader> | null>(null)

// 首页下方的功能亮点介绍（icon 为 AppIcon 图标名，key 对应功能弹窗）
const features: { key: FeatureKey; icon: string; title: string; desc: string }[] = [
  {
    key: 'registration',
    icon: 'trophy',
    title: '赛事报名',
    desc: '在线填报报名表、上传盖章件与学籍材料，审核进度实时可查。',
  },
  {
    key: 'team',
    icon: 'users',
    title: '球队与人员管理',
    desc: '维护球队资料、队员名单与教练组，运动员、教练员注册信息统一管理。',
  },
  {
    key: 'publicity',
    icon: 'megaphone',
    title: '信息公示',
    desc: '赛程对阵、比赛结果、新闻政策与榜单公示，成绩荣誉公开可查。',
  },
]
</script>

<template>
  <div class="home-page">
    <!-- 顶部导航：品牌 / 导航 / 登录区 / 说明弹窗统一在公共头部组件中 -->
    <PortalHeader ref="header" />

    <!-- 首屏：深绿背景 + 左文案右图片 + 底部波浪，按钮开弹窗 -->
    <PortalHero @open="header?.openModal" />

    <!-- 功能亮点（点击打开对应功能说明弹窗） -->
    <section class="features">
      <div v-for="item in features" :key="item.title" class="feature-card" role="button" @click="header?.openModal(item.key)">
        <span class="feature-icon">
          <AppIcon :name="item.icon" :size="30" />
        </span>
        <h3 class="feature-title">{{ item.title }}</h3>
        <p class="feature-desc">{{ item.desc }}</p>
      </div>
    </section>

    <!-- 页脚（与公开浏览页共用） -->
    <PortalFooter />
  </div>
</template>

<style scoped>
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
  border: 1px solid #eef2ee;
  border-radius: var(--radius);
  padding: 32px 28px;
  text-align: center;
  box-shadow: 0 6px 18px rgba(20, 60, 40, 0.06);
  cursor: pointer;
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
  background: var(--grad-green);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 20px rgba(30, 122, 63, 0.25);
  transition: transform 0.25s;
}

/* 悬停时图标轻轻放大，呼应卡片上浮 */
.feature-card:hover .feature-icon {
  transform: scale(1.08);
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

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .features {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .feature-card,
  .feature-icon {
    transition: none;
  }
}
</style>
