<script setup lang="ts">
// 页面标题栏：每个后台页面顶部统一使用
defineProps<{
  title: string
  desc?: string
}>()
</script>

<template>
  <header class="page-header">
    <h2>{{ title }}</h2>
    <p v-if="desc">{{ desc }}</p>
  </header>
</template>

<style scoped>
.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  font-size: 22px;
  color: var(--ink);
  letter-spacing: 0.01em;
}

/* 标题下的渐变小横条，替代纯文字标题的单调感 */
.page-header h2::after {
  content: '';
  display: block;
  width: 46px;
  height: 4px;
  margin-top: 10px;
  border-radius: 999px;
  background: var(--grad-green);
}

.page-header p {
  margin-top: 8px;
  font-size: 13px;
  color: var(--muted);
}
</style>
