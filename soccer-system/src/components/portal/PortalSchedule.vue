<script setup lang="ts">
import { computed, ref } from 'vue'
import PortalHeader from './PortalHeader.vue'
import PortalFooter from './PortalFooter.vue'
import PortalBanner from './PortalBanner.vue'
import AppSelect from '../common/AppSelect.vue'
import DataTable from '../common/DataTable.vue'
import type { TableColumn } from '../common/types'

// 门户公开页 · 赛程赛果：游客无需登录即可浏览
// 与管理员端【对阵信息管理】【赛果发布管理】同口径：赛果经审核「已发布」才对外，
// 管理端待审核的场次（如中学组第 2 轮一中 vs 师大附中）不会出现在公开页

// 用 type 而非 interface：type 别名带隐式索引签名，可直接传给 DataTable 的 rows（Record<string, unknown>[]）
type MatchRow = {
  match: string
  group: string
  home: string
  score: string
  away: string
  time: string
  venue: string
  status: string
}

const groupOptions = ['全部组别', '小学组', '中学组', '高校组']
const groupFilter = ref('全部组别')

const columns: TableColumn[] = [
  { key: 'match', label: '场次' },
  { key: 'home', label: '主队', width: '140px' },
  { key: 'score', label: '比分', width: '90px' },
  { key: 'away', label: '客队', width: '140px' },
  { key: 'time', label: '比赛时间', width: '160px' },
  { key: 'venue', label: '场地', width: '180px' },
  { key: 'status', label: '状态', width: '90px' },
]

const matches: MatchRow[] = [
  { match: '小学组 第 1 轮', group: '小学组', home: '实小少年队', score: '5 : 2', away: '城关小学', time: '2026-10-12 10:00', venue: '市体育中心副场', status: '已结束' },
  { match: '高校组 第 1 轮', group: '高校组', home: '成都体育学院', score: '1 : 0', away: '西南交通大学', time: '2026-10-17 15:00', venue: '成都体育学院足球场', status: '已结束' },
  { match: '高校组 第 1 轮', group: '高校组', home: '四川大学', score: '2 : 0', away: '川师大队', time: '2026-10-18 15:00', venue: '四川大学足球场', status: '已结束' },
  { match: '中学组 第 1 轮', group: '中学组', home: '实验中学', score: '2 : 0', away: '一中', time: '2026-10-13 15:00', venue: '省青少年足球基地 2 号场', status: '已结束' },
  { match: '中学组 第 3 轮', group: '中学组', home: '实验中学', score: '3 : 1', away: '市二中', time: '2026-10-22 15:00', venue: '省青少年足球基地 1 号场', status: '已结束' },
  { match: '小学组 第 2 轮', group: '小学组', home: '实小少年队', score: '—', away: '朝阳小学', time: '2026-10-23 14:00', venue: '市体育中心副场', status: '进行中' },
  { match: '中学组 第 4 轮', group: '中学组', home: '师大附中', score: '—', away: '实验中学', time: '2026-10-25 15:00', venue: '省青少年足球基地 1 号场', status: '未开始' },
  { match: '高校组 第 2 轮', group: '高校组', home: '川师大队', score: '—', away: '西南交通大学', time: '2026-10-26 15:00', venue: '四川师范大学足球场', status: '未开始' },
  { match: '小学组 第 3 轮', group: '小学组', home: '城关小学', score: '—', away: '朝阳小学', time: '2026-10-27 10:00', venue: '市体育中心副场', status: '未开始' },
]

const visibleRows = computed(() =>
  groupFilter.value === '全部组别' ? matches : matches.filter((m) => m.group === groupFilter.value),
)
</script>

<template>
  <div class="portal-page">
    <PortalHeader />

    <PortalBanner
      kicker="公开信息 · 无需登录"
      title="赛程赛果"
      desc="小学组、中学组、高校组赛程对阵与比赛结果，完赛并审核发布后自动更新。"
    />

    <main class="container">
      <div class="toolbar">
        <span class="toolbar-label">按组别筛选</span>
        <AppSelect v-model="groupFilter" :options="groupOptions" />
      </div>

      <DataTable :columns="columns" :rows="visibleRows" />

      <p class="page-tip" style="margin-top: 16px">
        本页展示近期重点场次，完整赛程以赛事组委会发布为准。
        比分「—」表示比赛尚未结束；「进行中」的场次可在管理员端「赛事图文直播」查看逐分钟战报。
        比赛结果经管理端审核发布后才会展示在本页。
      </p>
    </main>

    <PortalFooter />
  </div>
</template>

<style scoped>
.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.toolbar-label {
  font-size: 14px;
  color: var(--muted);
}
</style>
