<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import StatsPanel from '../../components/common/StatsPanel.vue'

// 校级数据：固定本校范围，可按时间、球队、比赛筛选
</script>

<template>
  <div class="page-root">
    <PageHeader title="本校数据" desc="查看本校球队与球员的参赛统计，支持时间、球队、比赛筛选" />

    <p class="page-tip">
      数据范围固定为本校，统计口径来自球员比赛明细与补录事件；可按最近一周、最近一月或全部时间查询。
    </p>

    <StatsPanel mode="school" />
  </div>
</template>
