<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PortalHeader from './PortalHeader.vue'
import PortalFooter from './PortalFooter.vue'
import PortalBanner from './PortalBanner.vue'
import AppSelect from '../common/AppSelect.vue'
import DataTable from '../common/DataTable.vue'
import type { TableColumn } from '../common/types'
import { mockMatches, type MatchRow } from '../../data/portal-matches'
import { fetchMatches } from '../../api/portal'

// 门户公开页 · 赛程赛果：游客无需登录即可浏览
// 数据优先来自后端 /api/portal/matches/（已发布赛果才返回 result，见 src/api/portal.ts），
// 后端未启动时自动回退演示数据；与管理员端【对阵信息管理】【赛果发布管理】同口径

const groupOptions = ['全部组别', '小学组', '中学组', '高中组', '高校组']
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

// 初始展示演示数据，接口返回后无缝替换
const matches = ref<MatchRow[]>(mockMatches)

onMounted(async () => {
  matches.value = await fetchMatches()
})

const visibleRows = computed(() =>
  groupFilter.value === '全部组别' ? matches.value : matches.value.filter((m) => m.group === groupFilter.value),
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
