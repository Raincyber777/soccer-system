<script setup lang="ts">
import { computed, ref } from 'vue'
import PortalHeader from './PortalHeader.vue'
import PortalFooter from './PortalFooter.vue'
import PortalBanner from './PortalBanner.vue'
import AppSelect from '../common/AppSelect.vue'
import DataTable from '../common/DataTable.vue'
import type { TableColumn } from '../common/types'

// 门户公开页 · 赛事榜单：组别积分榜与射手榜，游客无需登录
// 与管理员端【榜单统计】同口径：完赛并发布后自动计入统计

const groupOptions = ['全部组别', '小学组', '中学组', '高校组']
const groupFilter = ref('中学组')

// 用 type 而非 interface：type 别名带隐式索引签名，可直接传给 DataTable 的 rows（Record<string, unknown>[]）
type StandingRow = {
  rank: number
  team: string
  group: string
  played: number
  win: number
  draw: number
  loss: number
  gf: number
  ga: number
  diff: string
  points: number
}

const standings: StandingRow[] = [
  { rank: 1, team: '实验中学足球队', group: '中学组', played: 3, win: 3, draw: 0, loss: 0, gf: 9, ga: 3, diff: '+6', points: 9 },
  { rank: 2, team: '师大附中队', group: '中学组', played: 3, win: 2, draw: 1, loss: 0, gf: 7, ga: 4, diff: '+3', points: 7 },
  { rank: 3, team: '市二中足球队', group: '中学组', played: 3, win: 1, draw: 1, loss: 1, gf: 5, ga: 6, diff: '-1', points: 4 },
  { rank: 4, team: '一中队', group: '中学组', played: 3, win: 0, draw: 2, loss: 1, gf: 4, ga: 6, diff: '-2', points: 2 },
  { rank: 1, team: '四川大学队', group: '高校组', played: 1, win: 1, draw: 0, loss: 0, gf: 2, ga: 0, diff: '+2', points: 3 },
  { rank: 2, team: '成都体育学院队', group: '高校组', played: 1, win: 1, draw: 0, loss: 0, gf: 1, ga: 0, diff: '+1', points: 3 },
  { rank: 3, team: '西南交通大学队', group: '高校组', played: 1, win: 0, draw: 0, loss: 1, gf: 0, ga: 1, diff: '-1', points: 0 },
  { rank: 4, team: '川师大队', group: '高校组', played: 1, win: 0, draw: 0, loss: 1, gf: 0, ga: 2, diff: '-2', points: 0 },
  { rank: 1, team: '实小少年队', group: '小学组', played: 1, win: 1, draw: 0, loss: 0, gf: 5, ga: 2, diff: '+3', points: 3 },
  { rank: 2, team: '朝阳小学队', group: '小学组', played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0, diff: '0', points: 0 },
  { rank: 3, team: '城关小学队', group: '小学组', played: 1, win: 0, draw: 0, loss: 1, gf: 2, ga: 5, diff: '-3', points: 0 },
]

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

const visibleStandings = computed(() =>
  groupFilter.value === '全部组别' ? standings : standings.filter((s) => s.group === groupFilter.value),
)

const scorerColumns: TableColumn[] = [
  { key: 'rank', label: '排名', width: '70px' },
  { key: 'name', label: '球员', width: '110px' },
  { key: 'team', label: '所属球队' },
  { key: 'goals', label: '进球', width: '80px' },
  { key: 'assists', label: '助攻', width: '80px' },
]

const scorers = [
  { rank: 1, name: '王小磊', team: '实验中学足球队', goals: 9, assists: 4 },
  { rank: 2, name: '周子豪', team: '市二中足球队', goals: 8, assists: 2 },
  { rank: 3, name: '李泽宇', team: '实验中学足球队', goals: 6, assists: 7 },
  { rank: 4, name: '郑凯', team: '师大附中队', goals: 5, assists: 3 },
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
