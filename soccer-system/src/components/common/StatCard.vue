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
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 4px 14px rgba(20, 60, 40, 0.05);
}

.stat-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--green-light);
  color: var(--green);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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
}

.stat-hint {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}
</style>
