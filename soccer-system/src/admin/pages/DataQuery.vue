<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import StatsPanel from '../../components/common/StatsPanel.vue'

// 后台数据查询：省级可查看全省并按市 / 区 / 校切换，市州管理员默认本市范围
</script>

<template>
  <div class="page-root">
    <PageHeader title="数据查询" desc="按时间、球队、比赛维度查询参赛与赛事统计，支持省 / 市 / 区 / 校范围" />

    <p class="page-tip">
      统计口径来自球员比赛明细与补录事件；省级账号可切换全省、市州、区县、学校范围，
      市州管理员默认限定本市范围，校级账号仅能查看本校数据。
    </p>

    <StatsPanel mode="staff" />
  </div>
</template>
