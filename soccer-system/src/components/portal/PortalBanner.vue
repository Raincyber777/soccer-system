<script setup lang="ts">
// 门户公开页顶部横幅：深绿渐变 + 标语，新闻 / 赛程 / 榜单三个页面共用
defineProps<{
  kicker: string
  title: string
  desc: string
}>()
</script>

<template>
  <section class="page-banner">
    <div class="banner-inner">
      <p class="banner-kicker">{{ kicker }}</p>
      <h1 class="banner-title">{{ title }}</h1>
      <p class="banner-desc">{{ desc }}</p>
    </div>
  </section>
</template>

<style scoped>
.page-banner {
  background: linear-gradient(140deg, #0f2f20 0%, #17402c 55%, #1e5a38 100%);
  color: #fff;
  padding: 40px 24px 44px;
}

.banner-inner {
  max-width: 1100px;
  margin: 0 auto;
}

.banner-kicker {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3em;
  color: #9fd4b5;
}

.banner-title {
  margin-top: 8px;
  font-size: 30px;
  font-weight: 800;
}

.banner-desc {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.8;
  color: #d7e7dc;
}
</style>
