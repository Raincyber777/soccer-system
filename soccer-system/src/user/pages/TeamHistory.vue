<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import AppIcon from '../../components/common/AppIcon.vue'
import type { TableColumn } from '../../components/common/types'

// 球队履历（球队负责人）：历年参赛记录与荣誉墙
// 荣誉与履历数据待后端提供球队履历聚合接口后填充，当前展示空态

const honors: { icon: string; season: string; event: string; result: string }[] = []

const columns: TableColumn[] = [
  { key: 'season', label: '赛季', width: '110px' },
  { key: 'event', label: '赛事名称' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'players', label: '报名球员', width: '90px' },
  { key: 'result', label: '最终成绩', width: '100px' },
  { key: 'status', label: '状态', width: '90px' },
]

const rows: Record<string, unknown>[] = []
</script>

<template>
  <PageHeader title="球队履历" desc="本队历年参赛记录与荣誉，赛果审核发布后自动计入" />

  <h3 class="section-title">荣誉墙</h3>
  <p v-if="!honors.length" class="page-tip">暂无荣誉记录，赛事完赛并经管理员审核发布后自动写入。</p>
  <div v-else class="honor-grid">
    <div v-for="h in honors" :key="h.event" class="honor-card">
      <span class="honor-icon" :class="{ gold: h.result === '冠军' }">
        <AppIcon :name="h.icon" :size="24" />
      </span>
      <p class="honor-season">{{ h.season }}</p>
      <p class="honor-event">{{ h.event }}</p>
      <p class="honor-result">{{ h.result }}</p>
    </div>
  </div>

  <h3 class="section-title">参赛履历</h3>
  <DataTable :columns="columns" :rows="rows" />

  <p class="page-tip" style="margin-top: 16px">
    履历与荣誉由赛事完赛、赛果经管理员审核发布后自动写入，球队无需手动维护；未完赛场次的最终成绩显示为「待定」。
  </p>
</template>

<style scoped>
.honor-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.honor-card {
  background: #fff;
  border: 1px solid #eef2ee;
  border-radius: 14px;
  padding: 22px 18px;
  text-align: center;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s, box-shadow 0.2s;
}

.honor-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.honor-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--green-light);
  color: var(--green);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 冠军用金色渐变徽章突出 */
.honor-icon.gold {
  background: linear-gradient(135deg, #f5c445, #e0a52e);
  color: #fff;
  box-shadow: 0 6px 14px rgba(181, 138, 28, 0.3);
}

.honor-season {
  margin-top: 10px;
  font-size: 12px;
  color: var(--muted);
}

.honor-event {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
  color: var(--green-dark);
}

.honor-result {
  margin-top: 8px;
  font-size: 16px;
  font-weight: 800;
  color: var(--green);
}

@media (max-width: 900px) {
  .honor-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
