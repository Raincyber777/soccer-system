<script setup lang="ts">
import { reactive } from 'vue'
import type { FormField } from './types'
import AppSelect from './AppSelect.vue'
import AppDatePicker from './AppDatePicker.vue'

// 通用表单：传入字段配置，点提交时把整个表单数据抛给父页面
const props = defineProps<{
  fields: FormField[]
  submitText?: string
}>()

const emit = defineEmits<{
  (e: 'submit', data: Record<string, string>): void
}>()

const form = reactive<Record<string, string>>({})
props.fields.forEach((f) => (form[f.key] = ''))

function onSubmit() {
  emit('submit', { ...form })
}
</script>

<template>
  <form class="data-form" @submit.prevent="onSubmit">
    <label
      v-for="f in fields"
      :key="f.key"
      class="form-field"
      :class="{ 'full-row': f.type === 'textarea' || f.type === 'custom' }"
    >
      <span class="form-label">{{ f.label }}</span>
      <!-- 具名字段插槽：页面可用自定义控件（如学校选择器）替换某个字段的默认输入 -->
      <slot :name="`field-${f.key}`" :field="f">
        <AppSelect
          v-if="f.type === 'select'"
          v-model="form[f.key]"
          :options="f.options ?? []"
          placeholder="请选择"
        />
        <AppDatePicker
          v-else-if="f.type === 'date'"
          v-model="form[f.key]"
          :min="f.min"
          :max="f.max"
        />
        <textarea
          v-else-if="f.type === 'textarea'"
          v-model="form[f.key]"
          rows="3"
          :placeholder="f.placeholder"
        ></textarea>
        <input
          v-else-if="f.type !== 'custom'"
          v-model="form[f.key]"
          :type="f.type ?? 'text'"
          :placeholder="f.placeholder"
        />
      </slot>
    </label>
    <div class="form-actions full-row">
      <button type="submit" class="btn btn-primary">{{ submitText ?? '提交' }}</button>
    </div>
  </form>
</template>

<style scoped>
.data-form {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px 20px;
  box-shadow: 0 4px 14px rgba(20, 60, 40, 0.05);
}

.full-row {
  grid-column: 1 / -1;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}

.form-field input,
.form-field textarea {
  padding: 10px 12px;
  border: 1.5px solid #d8e2da;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  resize: vertical;
}

.form-field input:focus,
.form-field textarea:focus {
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(30, 122, 63, 0.12);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 700px) {
  .data-form {
    grid-template-columns: 1fr;
  }
}
</style>
