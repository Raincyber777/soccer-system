<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import AppModal from './AppModal.vue'
import { dialogState, settleDialog } from './dialog'

// 全局弹窗宿主：挂在 App.vue，渲染 confirmDialog/promptDialog 发起的请求。
// 确认弹窗显示说明文字 + 取消/确定；输入弹窗带输入框（支持必填校验与多行）。

const inputValue = ref('')
const errorMsg = ref('')
const inputEl = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)

watch(
  () => dialogState.current,
  (req) => {
    errorMsg.value = ''
    inputValue.value = req && req.kind === 'prompt' ? (req.initial ?? '') : ''
    if (req && req.kind === 'prompt') void nextTick(() => inputEl.value?.focus())
  },
)

/** Esc / 遮罩 / 右上角 × 关闭一律视为取消 */
function close() {
  settleDialog(null)
}

function submit() {
  const req = dialogState.current
  if (!req) return
  if (req.kind === 'confirm') {
    settleDialog(true)
    return
  }
  const value = inputValue.value.trim()
  if (req.required && !value) {
    errorMsg.value = req.requiredMsg ?? '该项为必填项'
    return
  }
  settleDialog(value)
}

// 弹窗请求是动态的，按钮文案与危险态需保持响应式
const isDanger = computed(() => {
  const r = dialogState.current
  return r?.kind === 'confirm' && r.danger
})
const confirmText = computed(() => {
  const r = dialogState.current
  return r?.confirmText ?? '确定'
})
</script>

<template>
  <AppModal :open="!!dialogState.current" :title="dialogState.current?.title ?? ''" @close="close">
    <template v-if="dialogState.current">
      <p v-if="dialogState.current.kind === 'confirm'" class="dialog-message">
        {{ dialogState.current.message }}
      </p>
      <template v-else>
        <p v-if="dialogState.current.message" class="dialog-message">{{ dialogState.current.message }}</p>
        <label v-if="dialogState.current.label" class="dialog-label">{{ dialogState.current.label }}</label>
        <textarea
          v-if="dialogState.current.multiline"
          ref="inputEl"
          v-model="inputValue"
          v-bind="{ maxlength: dialogState.current.maxlength }"
          class="dialog-input"
          rows="4"
          :placeholder="dialogState.current.placeholder ?? ''"
        />
        <input
          v-else
          ref="inputEl"
          v-model="inputValue"
          v-bind="{ maxlength: dialogState.current.maxlength }"
          class="dialog-input"
          type="text"
          :placeholder="dialogState.current.placeholder ?? ''"
          @keyup.enter="submit"
        />
        <p v-if="errorMsg" class="dialog-error">{{ errorMsg }}</p>
      </template>
    </template>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="close">取消</button>
      <button type="button" class="btn" :class="isDanger ? 'btn-danger' : 'btn-primary'" @click="submit">
        {{ confirmText }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.dialog-message {
  font-size: 14px;
  line-height: 1.7;
  color: var(--ink);
  white-space: pre-line;
}

.dialog-label {
  display: block;
  margin: 12px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--green-dark);
}

.dialog-input {
  width: 100%;
  resize: vertical;
}

.dialog-error {
  margin-top: 8px;
  font-size: 12px;
  color: #c0392b;
}
</style>
