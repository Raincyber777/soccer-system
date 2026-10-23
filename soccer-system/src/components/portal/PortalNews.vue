<script setup lang="ts">
import { ref } from 'vue'
import PortalHeader from './PortalHeader.vue'
import PortalFooter from './PortalFooter.vue'
import AppIcon from '../common/AppIcon.vue'
import AppModal from '../common/AppModal.vue'

// 门户公开页 · 新闻政策：游客无需登录即可浏览
// 与管理员端【赛事新闻管理】【政策管理】同口径：已发布 / 已生效的内容才对外展示

interface NewsItem {
  tag: string
  title: string
  source: string
  date: string
  summary: string
  body: string[]
}

const news: NewsItem[] = [
  {
    tag: '赛事动态',
    title: '小学组第二轮本周开打，实小少年队冲击两连胜',
    source: '赛事组委会',
    date: '2026-10-23',
    summary: '小学组第二轮实小少年队对阵朝阳小学的比赛今日 14:00 在市体育中心副场进行，图文直播同步开启。',
    body: [
      '首轮 5:2 大胜城关小学的实小少年队将于今日 14:00 迎来小组第二个对手朝阳小学。若能取胜，实小少年队将以两连胜提前占据小组出线主动权。',
      '本场比赛在市体育中心副场进行，赛事组委会将在「赛事图文直播」中提供逐分钟文字直播，欢迎各校师生关注。',
    ],
  },
  {
    tag: '通知公告',
    title: '2026 省青少年校园足球联赛（秋季）开赛公告',
    source: '四川省足球协会',
    date: '2026-10-15',
    summary: '省级总决赛定于 10 月 12 日在省青少年足球基地拉开帷幕，各组别报名球队经市州初审、省级终审后正式参赛。',
    body: [
      '2026 年四川省青少年校园足球联赛（秋季）省级总决赛已于 10 月 12 日正式开赛。本届联赛设小学组、中学组、高中组、高校组四个组别，全省 21 个市州共 128 支球队报名参赛。',
      '所有报名球队均经过市州管理员初审与省级终审两级审核，审核通过的球队名单与参赛信息已在平台公示，可登录用户端「信息公示」查看。',
      '比赛将持续至 11 月下旬，赛程对阵与比赛结果将在本平台「赛程赛果」页面实时更新。',
    ],
  },
  {
    tag: '战报',
    title: '第三轮战报：实验中学 3:1 市二中',
    source: '赛事组委会',
    date: '2026-10-12',
    summary: '王小磊梅开二度、李泽宇锦上添花，实验中学足球队 3:1 战胜市二中，豪取三连胜领跑中学组积分榜。',
    body: [
      '中学组第三轮焦点战中，实验中学足球队凭借王小磊的梅开二度与李泽宇的进球，以 3:1 战胜市二中足球队，开赛以来三战全胜，继续领跑中学组积分榜。',
      '市二中由周子豪在下半场扳回一球。第四轮实验中学将客场挑战师大附中，比赛定于 10 月 25 日 15:00 在省青少年足球基地 1 号场进行。',
    ],
  },
  {
    tag: '通知公告',
    title: '关于开展 2026 年四川省中小学足球运动员注册工作的通知',
    source: '四川省教育厅',
    date: '2026-10-08',
    summary: '全省中小学足球运动员实行统一注册管理，学籍信息与学校标识码绑定，注册信息审核通过后方可参赛。',
    body: [
      '为规范校园足球赛事管理，全省中小学足球运动员实行统一注册。运动员注册须绑定学籍信息与教育部学校（机构）标识码，由所在学校统一组织申报。',
      '注册信息经市州管理员审核通过后生效，未生效的注册信息不参与参赛资格校验。各学校请于 11 月 10 日前完成本校运动员注册申报。',
    ],
  },
  {
    tag: '新闻动态',
    title: '成都市校园足球特色校建设成果巡礼',
    source: '成都市教育局',
    date: '2026-10-06',
    summary: '全市已建成校园足球特色学校 187 所，常态化班级联赛覆盖率达 92%，为省级联赛输送球员 400 余人。',
    body: [
      '近年来成都市持续推进校园足球特色学校建设，目前已建成特色学校 187 所，班级联赛常态化开展率达 92%。',
      '依托「教学 + 训练 + 竞赛」一体化体系，成都市为省级联赛输送优秀球员 400 余名，实验中学、成都七中等学校在历届省级赛事中均取得优异成绩。',
    ],
  },
  {
    tag: '新闻动态',
    title: '川师大队首次出征省级联赛高校组',
    source: '四川师范大学',
    date: '2026-09-28',
    summary: '川师大队以校园组冠军身份首次晋级省级联赛高校组，首轮 0:2 惜败四川大学队，积累经验再出发。',
    body: [
      '四川师范大学足球队今年以校内联赛冠军身份首次晋级省级联赛高校组。首轮比赛中 0:2 不敌传统强队四川大学队。',
      '主教练张建国表示，球队将认真总结首轮经验，在 10 月 26 日对阵西南交通大学队的第二轮比赛中全力争胜。',
    ],
  },
]

const policies: NewsItem[] = [
  {
    tag: '政策文件',
    title: '四川省青少年校园足球联赛竞赛规程（2026 秋季修订版）',
    source: '四川省教育厅 · 四川省足球协会',
    date: '2026-09-30',
    summary: '明确本届联赛组别设置、报名资格、竞赛办法、名次评定与纪律要求。',
    body: [
      '第一章 总则：联赛由四川省教育厅、四川省足球协会联合主办，设小学组、中学组、高中组、高校组，实行赛会制与主客场相结合的竞赛办法。',
      '第二章 报名资格：参赛运动员须为在籍在校学生，注册信息审核通过并与学校标识码绑定；每队报名运动员 18-22 人，教练员须持有效等级证书。',
      '第三章 竞赛办法与名次评定：小组单循环 + 淘汰赛；积分相同时依次按相互间胜负、净胜球、进球数排定名次。',
    ],
  },
  {
    tag: '政策文件',
    title: '四川省中小学足球运动员注册管理办法（试行）',
    source: '四川省教育厅',
    date: '2026-09-18',
    summary: '规范运动员注册流程：学籍绑定、学校标识码校验、市州审核与注册有效期管理。',
    body: [
      '第一条 全省中小学足球运动员实行统一注册管理，注册信息包括学籍信息、身份信息与运动履历。',
      '第二条 注册须绑定教育部学校（机构）标识码，系统校验学校存在且启用、与所属市州一致后方可提交。',
      '第三条 注册信息由市州管理员审核，审核通过后生效并公示；未生效的注册信息不参与参赛资格校验。',
    ],
  },
  {
    tag: '政策文件',
    title: '校园足球特色学校建设与评价指南',
    source: '四川省教育厅',
    date: '2026-09-05',
    summary: '从课程教学、训练竞赛、师资配备、场地设施等维度提出特色学校建设标准与评价指标。',
    body: [
      '特色学校应保证每周不少于 1 次足球课，常态化开展班级联赛，并按标准配齐足球场地与器材设施。',
      '评价体系包含课程教学（30 分）、训练竞赛（30 分）、师资队伍（20 分）、场地设施（10 分）、文化建设（10 分），总分 90 分以上可申报示范校。',
    ],
  },
]

// 点击新闻卡 / 政策行打开全文弹窗
const activeItem = ref<NewsItem | null>(null)

function openItem(item: NewsItem) {
  activeItem.value = item
}
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

      <p class="page-tip">新闻与政策由管理员端审核发布后在此公示；点击卡片或文件可查看全文（演示数据为示例）。</p>
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

@media (max-width: 900px) {
  .news-grid {
    grid-template-columns: 1fr;
  }
}
</style>
