<script setup lang="ts">
// 使用说明页共用的步骤列表：数字圆点 + 标题 + 说明文字
interface GuideStep {
  title: string
  desc: string
}

defineProps<{ steps: GuideStep[] }>()
</script>

<template>
  <ol class="guide-steps">
    <li v-for="(s, i) in steps" :key="s.title" class="guide-step">
      <span class="step-index">{{ i + 1 }}</span>
      <div class="step-body">
        <p class="step-title">{{ s.title }}</p>
        <p class="step-desc">{{ s.desc }}</p>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.guide-steps {
  list-style: none;
  margin: 0;
  padding: 6px 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(20, 60, 40, 0.05);
}

.guide-step {
  display: flex;
  gap: 14px;
  padding: 14px 0;
}

.guide-step + .guide-step {
  border-top: 1px dashed var(--line);
}

.step-index {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--green);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
}

.step-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--green-dark);
}

.step-desc {
  margin-top: 4px;
  font-size: 13px;
  color: var(--ink);
  line-height: 1.7;
}
</style>
