<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

// 通用弹窗：遮罩 + 居中卡片，Esc / 点击遮罩 / 关闭按钮均可关闭
const props = defineProps<{
  open: boolean
  title: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

// 打开期间锁定背景滚动，并监听 Esc 关闭
watch(
  () => props.open,
  (open) => {
    if (open) {
      document.addEventListener('keydown', onKeydown)
      document.body.style.overflow = 'hidden'
    } else {
      document.removeEventListener('keydown', onKeydown)
      document.body.style.overflow = ''
    }
  },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-overlay" @click.self="emit('close')">
        <div class="modal-card" role="dialog" aria-modal="true" :aria-label="title">
          <header class="modal-head">
            <h3 class="modal-title">{{ title }}</h3>
            <button type="button" class="modal-close" aria-label="关闭弹窗" @click="emit('close')">×</button>
          </header>
          <div class="modal-body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="modal-foot">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(15, 47, 32, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal-card {
  background: #fff;
  border-radius: 16px;
  width: min(520px, 100%);
  max-height: calc(100vh - 64px);
  overflow: auto;
  box-shadow: 0 24px 64px rgba(15, 47, 32, 0.25);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px 0;
}

.modal-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--green-dark);
}

.modal-close {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  font-size: 20px;
  line-height: 1;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.modal-close:hover {
  background: var(--green-light);
  color: var(--green-dark);
}

.modal-body {
  padding: 14px 22px 20px;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 0 22px 20px;
}

/* 过渡：遮罩淡入 + 卡片轻微上浮 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.22s ease;
}

.modal-enter-active .modal-card,
.modal-leave-active .modal-card {
  transition: transform 0.22s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-card,
.modal-leave-to .modal-card {
  transform: translateY(14px) scale(0.98);
}
</style>
