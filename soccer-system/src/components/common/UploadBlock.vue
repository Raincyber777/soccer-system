<script setup lang="ts">
import AppIcon from './AppIcon.vue'

// 通用上传占位块：第一版演示用，接入后端后替换为真实上传逻辑
defineProps<{
  title: string
  desc?: string
}>()

const emit = defineEmits<{
  (e: 'select'): void
}>()
</script>

<template>
  <div class="upload-block" @click="emit('select')">
    <span class="upload-icon">
      <AppIcon name="upload" :size="26" />
    </span>
    <p class="upload-title">{{ title }}</p>
    <p v-if="desc" class="upload-desc">{{ desc }}</p>
    <button type="button" class="upload-btn" @click.stop="emit('select')">选择文件</button>
  </div>
</template>

<style scoped>
.upload-block {
  background: #fff;
  border: 2px dashed #bfd6c5;
  border-radius: 12px;
  padding: 24px 18px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.upload-block:hover {
  border-color: var(--green);
  background: #fbfdfb;
}

.upload-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--green-light);
  color: var(--green);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.upload-title {
  margin-top: 8px;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}

.upload-desc {
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
}

.upload-btn {
  margin-top: 12px;
  padding: 7px 18px;
  border: 1.5px solid var(--green);
  border-radius: 6px;
  background: #fff;
  color: var(--green);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-btn:hover {
  background: var(--green);
  color: #fff;
}
</style>
