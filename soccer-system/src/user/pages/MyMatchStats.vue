<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'
import { fetchMyMatchStats, type MyMatchStatsResp } from '../../api/stats'

// 我的参赛数据：运动员登录后查看自己每场比赛的进球、红黄牌、犯规等技术统计。
// 数据来自管理端「技术统计录入」，按账号实名身份证匹配注册球员。

const columns: TableColumn[] = [
  { key: 'time', label: '比赛时间', width: '120px' },
  { key: 'tournament', label: '赛事' },
  { key: 'match', label: '对阵（比分）' },
  { key: 'goals', label: '进球', width: '60px' },
  { key: 'assists', label: '助攻', width: '60px' },
  { key: 'yellow', label: '黄牌', width: '60px' },
  { key: 'red', label: '红牌', width: '60px' },
  { key: 'fouls', label: '犯规', width: '60px' },
  { key: 'minutes', label: '出场分钟', width: '80px' },
]

interface Row {
  id: number
  time: string
  tournament: string
  match: string
  goals: number
  assists: number
  yellow: number
  red: number
  fouls: number
  minutes: string
}

const data = ref<MyMatchStatsResp | null>(null)
const loaded = ref(false)
const rows = ref<Row[]>([])

const summaryItems = [
  { key: 'matches', label: '出场场次' },
  { key: 'goals', label: '进球' },
  { key: 'assists', label: '助攻' },
  { key: 'yellow_cards', label: '黄牌' },
  { key: 'red_cards', label: '红牌' },
  { key: 'fouls', label: '犯规' },
  { key: 'minutes', label: '总出场分钟' },
] as const

onMounted(async () => {
  data.value = await fetchMyMatchStats()
  rows.value = (data.value?.items ?? []).map((s) => ({
    id: s.id,
    time: s.match_info.time,
    tournament: s.match_info.tournament || '—',
    match: `${s.match_info.home} ${s.match_info.score || 'vs'} ${s.match_info.away}`,
    goals: s.goals,
    assists: s.assists,
    yellow: s.yellow_cards,
    red: s.red_cards,
    fouls: s.fouls,
    minutes: s.minutes === null || s.minutes === undefined ? '—' : String(s.minutes),
  }))
  loaded.value = true
})
</script>

<template>
  <PageHeader title="我的参赛数据" desc="查看自己每场比赛的进球、红黄牌、犯规等技术统计（按实名认证的身份证匹配注册球员）" />

  <!-- 未实名 / 未匹配到球员：提示去个人中心完成认证 -->
  <p v-if="loaded && data && !data.player" class="page-tip warn-tip">
    {{ data.hint || '尚未匹配到注册球员：请先在个人中心填写身份证号完成实名认证。' }}
  </p>

  <template v-if="data && data.player">
    <p class="page-tip">
      {{ data.player.name }} · {{ data.player.team }} —— 共 {{ data.summary.matches }} 场比赛有统计记录
    </p>

    <div class="stat-grid">
      <div v-for="item in summaryItems" :key="item.key" class="stat-cell">
        <span class="stat-num">{{ data.summary[item.key] }}</span>
        <span class="stat-label">{{ item.label }}</span>
      </div>
    </div>

    <h3 class="section-title">逐场技术统计（{{ rows.length }}）</h3>
    <DataTable :columns="columns" :rows="rows" />
    <p v-if="rows.length === 0" class="page-tip">暂无逐场统计：比赛结束后由管理端录入，录入后自动展示。</p>
  </template>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 8px;
}

.stat-cell {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 16px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-num {
  font-size: 24px;
  font-weight: 800;
  color: var(--green-dark);
}

.stat-label {
  font-size: 12px;
  color: var(--muted);
}
</style>
