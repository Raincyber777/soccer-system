<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ApiError, schoolProfileApi, type SchoolProfile } from '../../api'
import PageHeader from '../../components/common/PageHeader.vue'

// 校级管理员 · 本校信息：学校标识码由系统绑定不可改，名称 / 地址 / 联系人可维护

const profile = ref<SchoolProfile | null>(null)
const loading = ref(true)
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const form = reactive({
  name: '',
  address: '',
  contact: '',
  phone: '',
})

function fill(data: SchoolProfile) {
  profile.value = data
  form.name = data.name
  form.address = data.address
  form.contact = data.contact
  form.phone = data.phone
}

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    fill(await schoolProfileApi.get())
  } catch (error) {
    errorMsg.value = error instanceof ApiError ? error.message : '本校信息加载失败'
  } finally {
    loading.value = false
  }
}

async function save() {
  if (saving.value) return
  errorMsg.value = ''
  successMsg.value = ''
  if (!form.name.trim()) {
    errorMsg.value = '请填写学校名称'
    return
  }
  saving.value = true
  try {
    const saved = await schoolProfileApi.save({
      name: form.name.trim(),
      address: form.address.trim(),
      contact: form.contact.trim(),
      phone: form.phone.trim(),
    })
    fill(saved)
    successMsg.value = '本校信息已保存。'
  } catch (error) {
    errorMsg.value = error instanceof ApiError ? error.message : '本校信息保存失败'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <PageHeader title="本校信息" desc="学校标识码由系统绑定，用于本校比赛与球队的数据范围校验" />

    <p v-if="errorMsg" class="page-tip error">{{ errorMsg }}</p>
    <p v-if="successMsg" class="page-tip success">{{ successMsg }}</p>

    <form v-if="profile" class="info-card" @submit.prevent="save">
      <div class="info-row">
        <span class="info-label">学校标识码</span>
        <span class="info-value mono">{{ profile.school_code }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">所属城市</span>
        <span class="info-value">{{ profile.city || '—' }}</span>
      </div>

      <label class="info-field">
        <span class="info-label">学校名称</span>
        <input v-model="form.name" class="info-input" type="text" maxlength="40" />
      </label>

      <label class="info-field">
        <span class="info-label">学校地址</span>
        <input v-model="form.address" class="info-input" type="text" maxlength="60" placeholder="如：成都市成华区一环路东三段 1 号" />
      </label>

      <label class="info-field">
        <span class="info-label">赛事联系人</span>
        <input v-model="form.contact" class="info-input" type="text" maxlength="20" placeholder="如：张老师" />
      </label>

      <label class="info-field">
        <span class="info-label">联系电话</span>
        <input v-model="form.phone" class="info-input" type="text" maxlength="11" placeholder="11 位手机号" />
      </label>

      <div class="info-footer">
        <span v-if="profile.updated_at" class="update-time">最近更新：{{ profile.updated_at }}</span>
        <button type="submit" class="primary-btn" :disabled="saving">
          {{ saving ? '保存中…' : '保存本校信息' }}
        </button>
      </div>
    </form>

    <p v-else-if="loading" class="page-tip hint">加载中…</p>
  </div>
</template>

<style scoped>
.info-card {
  max-width: 640px;
  padding: 22px 24px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(20, 60, 40, 0.06);
}

.info-row,
.info-field {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px dashed var(--line);
}

.info-field {
  cursor: text;
}

.info-label {
  flex: 0 0 110px;
  font-size: 13px;
  color: var(--muted);
}

.info-value {
  font-size: 14px;
  color: var(--ink);
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: 0.5px;
}

.info-input {
  flex: 1;
  min-width: 0;
  padding: 9px 11px;
  border: 1.5px solid #d8e2da;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: var(--ink);
}

.info-input:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(30, 122, 63, 0.12);
}

.info-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 18px;
}

.update-time {
  font-size: 12px;
  color: var(--muted);
}

@media (max-width: 600px) {
  .info-row,
  .info-field {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .info-label {
    flex: none;
  }
}
</style>
