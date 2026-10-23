<script setup lang="ts">
import AppIcon from '../common/AppIcon.vue'

// 门户页脚：门户首页与公开浏览页共用
</script>

<template>
  <footer class="footer">
    <p class="footer-brand">
      <AppIcon name="ball" :size="18" />
      绿茵汇
    </p>
    <p class="footer-text">让每一支校园球队都有正式赛场 · © 2026 绿茵汇</p>
  </footer>
</template>

<style scoped>
.footer {
  background: var(--green-dark);
  color: #cfe0d5;
  text-align: center;
  padding: 28px 24px;
}

.footer-brand {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.footer-text {
  margin-top: 8px;
  font-size: 13px;
}
</style>
