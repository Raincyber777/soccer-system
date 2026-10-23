<script setup lang="ts">
import AppIcon from './AppIcon.vue'

// 统计卡片：工作台/控制台概览用（icon 传 AppIcon 图标名）
defineProps<{
  icon: string
  label: string
  value: string | number
  hint?: string
}>()
</script>

<template>
  <div class="stat-card">
    <span class="stat-icon-wrap">
      <AppIcon :name="icon" :size="24" />
    </span>
    <div class="stat-info">
      <p class="stat-label">{{ label }}</p>
      <p class="stat-value">{{ value }}</p>
      <p v-if="hint" class="stat-hint">{{ hint }}</p>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  background: #fff;
  border: 1px solid #eef2ee;
  border-radius: var(--radius);
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

/* 绿色渐变图标底 + 投影，比纯色块更精神 */
.stat-icon-wrap {
  width: 50px;
  height: 50px;
  border-radius: 13px;
  background: var(--grad-green);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 8px 18px rgba(30, 122, 63, 0.28);
}

.stat-label {
  font-size: 13px;
  color: var(--muted);
}

.stat-value {
  font-size: 26px;
  font-weight: 800;
  color: var(--green-dark);
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.stat-hint {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}
</style>
