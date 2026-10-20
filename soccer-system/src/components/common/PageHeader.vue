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
}

.page-header p {
  margin-top: 6px;
  font-size: 13px;
  color: var(--muted);
}
</style>
