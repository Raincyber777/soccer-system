<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import StatCard from '../../components/common/StatCard.vue'
import type { TableColumn } from '../../components/common/types'
import {
  identityApi,
  playerApi,
  ApiError,
  type PlayerMatchRecord,
  type RealNameRecord,
} from '../../api'

// 个人参赛记录：按实名绑定（或球队队长）展示每场比赛的进球与红黄牌
// 支持全部 / 最近一周 / 最近一月筛选，帮助队员快速回顾个人表现
const records = ref<PlayerMatchRecord[]>([])
const identity = ref<RealNameRecord | null>(null)
const loading = ref(true)
const message = ref('')
const range = ref<'all' | 'week' | 'month'>('all')

const RANGE_TABS: { value: 'all' | 'week' | 'month'; label: string }[] = [
  { value: 'all', label: '全部时间' },
  { value: 'week', label: '最近一周' },
  { value: 'month', label: '最近一月' },
]

function cutoffOf(value: 'week' | 'month') {
  const date = new Date()
  date.setDate(date.getDate() - (value === 'week' ? 7 : 30))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const filtered = computed(() => {
  if (range.value === 'all') return records.value
  const cutoff = cutoffOf(range.value)
  return records.value.filter((record) => record.date >= cutoff)
})

const totals = computed(() => ({
  matches: filtered.value.length,
  goals: filtered.value.reduce((sum, record) => sum + record.goals, 0),
  assists: filtered.value.reduce((sum, record) => sum + record.assists, 0),
  yellowCards: filtered.value.reduce((sum, record) => sum + record.yellowCards, 0),
  redCards: filtered.value.reduce((sum, record) => sum + record.redCards, 0),
}))

const cards = computed(() => [
  { icon: 'users', label: '出场场次', value: totals.value.matches, hint: '按比赛明细统计' },
  { icon: 'ball', label: '进球', value: totals.value.goals, hint: '个人进球总数' },
  { icon: 'star', label: '助攻', value: totals.value.assists, hint: '个人助攻总数' },
  { icon: 'info', label: '黄牌', value: totals.value.yellowCards, hint: '纪律数据' },
  { icon: 'shield', label: '红牌', value: totals.value.redCards, hint: '纪律数据' },
])

const columns: TableColumn[] = [
  { key: 'date', label: '日期', width: '110px' },
  { key: 'tournamentName', label: '赛事' },
  { key: 'opponent', label: '对手', width: '150px' },
  { key: 'score', label: '比分', width: '70px' },
  { key: 'result', label: '结果', width: '60px' },
  { key: 'minutes', label: '出场', width: '70px' },
  { key: 'goals', label: '进球', width: '60px' },
  { key: 'assists', label: '助攻', width: '60px' },
  { key: 'yellowCards', label: '黄牌', width: '60px' },
  { key: 'redCards', label: '红牌', width: '60px' },
]

const rows = computed<Record<string, unknown>[]>(() =>
  filtered.value.map((record) => ({
    ...record,
    minutes: `${record.minutes}'`,
  })),
)

async function load() {
  loading.value = true
  try {
    const [recordList, mine] = await Promise.all([playerApi.myRecords(), identityApi.mine()])
    records.value = recordList
    identity.value = mine
  } catch (error) {
    message.value = error instanceof ApiError ? error.message : '参赛记录加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <PageHeader title="我的参赛记录" desc="查看个人每场比赛的进球、助攻与红黄牌数据" />

  <p v-if="message" class="page-tip error">{{ message }}</p>

  <div class="identity-bar">
    <span v-if="identity?.status === '已认证'" class="identity-ok">
      已实名：{{ identity.name }} · {{ identity.idCardMasked }} · 绑定球员 {{ identity.playerName || '—' }}
    </span>
    <span v-else class="identity-tip">
      尚未完成实名认证，当前按球队队长或球队首名球员展示记录。
      <router-link to="/user/identity">去实名认证</router-link>
    </span>
  </div>

  <div class="range-tabs">
    <button
      v-for="tab in RANGE_TABS"
      :key="tab.value"
      type="button"
      class="range-tab"
      :class="{ active: range === tab.value }"
      @click="range = tab.value"
    >
      {{ tab.label }}
    </button>
  </div>

  <div class="stat-grid">
    <StatCard v-for="card in cards" :key="card.label" v-bind="card" />
  </div>

  <h3 class="section-title">比赛明细</h3>
  <DataTable :columns="columns" :rows="rows" />
  <p v-if="loading" class="page-tip">正在加载参赛记录…</p>
  <p v-else-if="!rows.length" class="page-tip">当前时间范围内暂无参赛记录。</p>
</template>

<style scoped>
.identity-bar {
  margin-bottom: 14px;
  font-size: 12px;
  color: var(--muted);
}

.identity-ok {
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--green-light);
  color: var(--green-dark);
}

.identity-tip a {
  color: var(--green);
}

.range-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.range-tab {
  padding: 7px 16px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  color: var(--ink);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}

.range-tab.active {
  border-color: var(--green);
  background: var(--green);
  color: #fff;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 14px;
}
</style>
