<script setup lang="ts">
import { reactive } from 'vue'
import type { SearchField } from './types'

// 通用搜索栏：传入搜索字段配置，点搜索时把条件抛给父页面
const props = defineProps<{
  fields: SearchField[]
}>()

const emit = defineEmits<{
  (e: 'search', filters: Record<string, string>): void
  (e: 'reset', filters: Record<string, string>): void
}>()

const filters = reactive<Record<string, string>>({})
props.fields.forEach((f) => (filters[f.key] = ''))

function doSearch() {
  emit('search', { ...filters })
}

function doReset() {
  props.fields.forEach((f) => (filters[f.key] = ''))
  emit('reset', { ...filters })
}
</script>

<template>
  <div class="search-bar">
    <label v-for="f in fields" :key="f.key" class="search-item">
      <span class="search-label">{{ f.label }}</span>
      <select v-if="f.type === 'select'" v-model="filters[f.key]">
        <option value="">全部</option>
        <option v-for="opt in f.options" :key="opt" :value="opt">{{ opt }}</option>
      </select>
      <input v-else v-model="filters[f.key]" type="text" :placeholder="f.placeholder" />
    </label>
    <button type="button" class="btn btn-primary search-btn" @click="doSearch">搜索</button>
    <button type="button" class="btn btn-ghost search-btn" @click="doReset">重置</button>
  </div>
</template>

<style scoped>
.search-bar {
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  box-shadow: 0 4px 14px rgba(20, 60, 40, 0.05);
  margin-bottom: 16px;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-label {
  font-size: 13px;
  color: var(--muted);
  white-space: nowrap;
}

.search-item input,
.search-item select {
  padding: 8px 10px;
  border: 1.5px solid #d8e2da;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  min-width: 140px;
}

.search-item input:focus,
.search-item select:focus {
  border-color: var(--green);
}

.search-btn {
  padding: 8px 16px;
}
</style>
