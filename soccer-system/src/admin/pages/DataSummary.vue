<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import StatCard from '../../components/common/StatCard.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'
import { summaryApi, ApiError, type DataSummary, type SummaryRow } from '../../api'

// 汇总数据：球队 / 球员 / 报名按市州与组别聚合，另附三类赛事的发布情况
// 数据实时读取 mock 数据源，管理员端发布赛事、审核报名后刷新即可看到变化
const summary = ref<DataSummary | null>(null)
const loading = ref(false)
const message = ref('')

const stats = computed(() => {
  const s = summary.value
  if (!s) return []
  return [
    { icon: 'users', label: '球队总数', value: s.teamTotal, hint: '已建立的球队档案' },
    { icon: 'user', label: '注册球员', value: s.playerTotal, hint: '含待审核与未公示' },
    { icon: 'clipboard-list', label: '报名总数', value: s.registrationTotal, hint: '各区县提交的报名' },
    { icon: 'circle-check', label: '审核通过率', value: `${s.approvalRate}%`, hint: `已通过 ${s.approvedTotal} 份` },
    { icon: 'shield', label: '待审核报名', value: s.pendingTotal, hint: `已驳回 ${s.rejectedTotal} 份` },
  ]
})

const rowColumns: TableColumn[] = [
  { key: 'key', label: '维度', width: '120px' },
  { key: 'teams', label: '球队数', width: '90px' },
  { key: 'players', label: '球员数', width: '90px' },
  { key: 'registrations', label: '报名数', width: '90px' },
  { key: 'approved', label: '已通过', width: '90px' },
  { key: 'pending', label: '待审核', width: '90px' },
  { key: 'rejected', label: '已驳回', width: '90px' },
  { key: 'approvalRateLabel', label: '通过率', width: '100px' },
]

function toRows(rows: SummaryRow[]): Record<string, unknown>[] {
  return rows.map((r) => ({ ...r, approvalRateLabel: `${r.approvalRate}%` }))
}

const cityRows = computed(() => toRows(summary.value?.byCity ?? []))
const groupRows = computed(() => toRows(summary.value?.byGroup ?? []))

const levelColumns: TableColumn[] = [
  { key: 'label', label: '赛事类别', width: '120px' },
  { key: 'total', label: '赛事总数', width: '100px' },
  { key: 'open', label: '报名中', width: '100px' },
]

const levelRows = computed<Record<string, unknown>[]>(() =>
  (summary.value?.tournamentLevels ?? []).map((l) => ({ ...l })),
)

async function load() {
  loading.value = true
  message.value = ''
  try {
    summary.value = await summaryApi.summary()
  } catch (error) {
    message.value = error instanceof ApiError ? error.message : '汇总数据加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <PageHeader title="汇总数据" desc="按市州、组别汇总球队、球员与报名审核情况，掌握全省参赛数据分布" />

  <div class="toolbar">
    <span class="toolbar-hint">
      {{ summary ? `数据生成时间：${summary.generatedAt}` : '正在汇总数据…' }}
    </span>
    <button type="button" class="btn btn-ghost" :disabled="loading" @click="load">
      {{ loading ? '刷新中…' : '刷新数据' }}
    </button>
  </div>

  <p v-if="message" class="page-tip error-tip">{{ message }}</p>

  <div class="stat-grid">
    <StatCard v-for="s in stats" :key="s.label" v-bind="s" />
  </div>

  <h3 class="section-title">按市州汇总</h3>
  <DataTable :columns="rowColumns" :rows="cityRows" />

  <h3 class="section-title">按组别汇总</h3>
  <DataTable :columns="rowColumns" :rows="groupRows" />

  <h3 class="section-title">赛事发布情况</h3>
  <DataTable :columns="levelColumns" :rows="levelRows" />
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.toolbar-hint {
  font-size: 12px;
  color: var(--muted);
}

.error-tip {
  color: #a3312a;
}
</style>
