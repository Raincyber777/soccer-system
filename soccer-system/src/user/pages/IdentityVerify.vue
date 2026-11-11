<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import { identityApi, ApiError, type RealNameRecord } from '../../api'

// 个人实名认证：队员与账号一对一绑定
// 身份证提交时校验 18 位，页面只展示脱敏结果；驳回后可按原因重新提交
const record = ref<RealNameRecord | null>(null)
const loading = ref(true)
const saving = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const form = reactive({ name: '', idCard: '', phone: '' })

const canSubmit = computed(() => !record.value || record.value.status === '已驳回')

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
}

async function submit() {
  if (!canSubmit.value || saving.value) return
  saving.value = true
  message.value = ''
  try {
    record.value = await identityApi.submit({
      name: form.name.trim(),
      idCard: form.idCard.trim(),
      phone: form.phone.trim(),
    })
    form.idCard = ''
    showMessage('实名信息已提交，等待管理员审核。')
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '实名信息提交失败', 'error')
  } finally {
    saving.value = false
  }
}

async function load() {
  loading.value = true
  try {
    record.value = await identityApi.mine()
    if (record.value) {
      form.name = record.value.name
      form.phone = record.value.phone
    }
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '实名信息加载失败', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <PageHeader title="实名认证" desc="完成队员与账号的一对一实名绑定，身份证信息仅展示前后几位" />

  <p class="page-tip">
    实名信息仅用于参赛身份核验与个人参赛记录归属。平台只保存脱敏后的身份证号（前 4 位 + 后 4 位），
    不保存明文；审核通过后自动绑定对应球员档案。
  </p>

  <p v-if="message" class="page-tip" :class="messageType">{{ message }}</p>
  <p v-if="loading" class="page-tip">正在加载实名信息…</p>

  <template v-else>
    <div v-if="record" class="status-card">
      <div class="status-head">
        <div>
          <p class="status-name">{{ record.name }}</p>
          <p class="status-id">{{ record.idCardMasked }}</p>
        </div>
        <span class="status-tag" :class="record.status === '已认证' ? 'ok' : record.status === '已驳回' ? 'reject' : ''">
          {{ record.status }}
        </span>
      </div>
      <dl class="status-grid">
        <div><dt>所属学校</dt><dd>{{ record.schoolName || '—' }}</dd></div>
        <div><dt>所属市州</dt><dd>{{ record.city || '—' }}</dd></div>
        <div><dt>提交时间</dt><dd>{{ record.submittedAt }}</dd></div>
        <div><dt>绑定球员</dt><dd>{{ record.playerName || '未绑定' }}</dd></div>
        <div v-if="record.reviewedAt"><dt>审核时间</dt><dd>{{ record.reviewedAt }}</dd></div>
        <div v-if="record.rejectReason" class="reject-reason"><dt>驳回原因</dt><dd>{{ record.rejectReason }}</dd></div>
      </dl>
      <p v-if="record.status === '待审核'" class="status-note">信息正在审核中，审核通过后自动绑定球员档案。</p>
      <p v-if="record.status === '已认证'" class="status-note">已完成实名认证，可在「我的参赛记录」查看个人比赛数据。</p>
    </div>

    <template v-if="canSubmit">
      <h3 class="section-title">{{ record?.status === '已驳回' ? '重新提交实名信息' : '提交实名信息' }}</h3>
      <form class="identity-form" @submit.prevent="submit">
        <div class="field">
          <label class="field-label">真实姓名</label>
          <input v-model="form.name" class="field-input" type="text" maxlength="20" placeholder="与身份证一致" />
        </div>
        <div class="field wide">
          <label class="field-label">身份证号</label>
          <input v-model="form.idCard" class="field-input" type="text" maxlength="18" placeholder="18 位身份证号" />
        </div>
        <div class="field">
          <label class="field-label">手机号</label>
          <input v-model="form.phone" class="field-input" type="text" maxlength="11" placeholder="11 位手机号（可选）" />
        </div>
        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? '提交中…' : '提交认证' }}
        </button>
      </form>
    </template>
  </template>
</template>

<style scoped>
.status-card {
  padding: 18px 20px;
  margin-bottom: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 14px rgba(20, 60, 40, 0.05);
}

.status-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.status-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
}

.status-id {
  margin-top: 4px;
  font-size: 13px;
  color: var(--muted);
  letter-spacing: 0.05em;
}

.status-tag {
  padding: 3px 12px;
  border-radius: 999px;
  background: #fff4e5;
  color: #a5611a;
  font-size: 12px;
  font-weight: 600;
}

.status-tag.ok {
  background: var(--green-light);
  color: var(--green-dark);
}

.status-tag.reject {
  background: #fff2f1;
  color: #a3312a;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin: 16px 0 0;
}

.status-grid dt {
  font-size: 12px;
  color: var(--muted);
}

.status-grid dd {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--ink);
}

.reject-reason dd {
  color: #a3312a;
}

.status-note {
  margin-top: 14px;
  font-size: 12px;
  color: var(--muted);
}

.identity-form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1 1 180px;
}

.field.wide {
  flex: 2 1 260px;
}

.field-label {
  font-size: 12px;
  color: var(--muted);
}

.field-input {
  width: 100%;
  padding: 9px 11px;
  border: 1.5px solid #d8e2da;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
}
</style>
