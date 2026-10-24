<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PortalHeader from './PortalHeader.vue'
import PortalFooter from './PortalFooter.vue'
import PortalBanner from './PortalBanner.vue'
import AppSelect from '../common/AppSelect.vue'
import DataTable from '../common/DataTable.vue'
import type { TableColumn } from '../common/types'
import { mockScorers, mockStandings, type ScorerRow, type StandingRow } from '../../data/portal-rankings'
import { fetchScorers, fetchStandings } from '../../api/portal'

// 门户公开页 · 赛事榜单：组别积分榜与射手榜，游客无需登录
// 数据优先来自后端聚合接口（/api/portal/stats/ranking|standings/，仅统计已发布赛果），
// 见 src/api/portal.ts，失败回退演示数据

const groupOptions = ['全部组别', '小学组', '中学组', '高中组', '高校组']
const groupFilter = ref('中学组')

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

// 初始展示演示数据，接口返回后无缝替换
const standings = ref<StandingRow[]>(mockStandings)
const scorers = ref<ScorerRow[]>(mockScorers)

onMounted(async () => {
  standings.value = await fetchStandings()
  scorers.value = await fetchScorers()
})

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
</script>

<template>
  <div class="portal-page">
    <PortalHeader />

    <PortalBanner
      kicker="公开信息 · 无需登录"
      title="赛事榜单"
      desc="组别积分榜与射手榜，比赛完赛并审核发布后自动计入统计。"
    />

    <main class="container">
      <h3 class="section-title">积分榜</h3>
      <div class="toolbar">
        <span class="toolbar-label">按组别筛选</span>
        <AppSelect v-model="groupFilter" :options="groupOptions" />
      </div>
      <DataTable :columns="standingColumns" :rows="visibleStandings" />

      <h3 class="section-title">射手榜</h3>
      <DataTable :columns="scorerColumns" :rows="scorers" />

      <p class="page-tip" style="margin-top: 16px">
        榜单数据来源于管理员端「赛事信息录入」中的进球与助攻记录，比赛完赛并审核发布后自动计入统计。
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
  margin: 16px 0 18px;
}

.toolbar-label {
  font-size: 14px;
  color: var(--muted);
}
</style>
