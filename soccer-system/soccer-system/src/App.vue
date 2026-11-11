<script setup lang="ts">
import DialogHost from './components/common/DialogHost.vue'
</script>

<template>
  <!-- 所有页面都通过路由渲染在这里；DialogHost 渲染全局确认/输入弹窗 -->
  <router-view />
  <DialogHost />
</template>

<style scoped></style>
