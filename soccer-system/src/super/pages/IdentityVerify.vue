<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import AppSelect from '../../components/common/AppSelect.vue'
import AppModal from '../../components/common/AppModal.vue'
import type { TableColumn } from '../../components/common/types'
import { identityApi, ApiError, type RealNameRecord, type RealNameStatus } from '../../api'
import { useAuth } from '../../stores/auth'

// 实名认证审核：省级看全省、市州看本市、校级看本校
// 通过后自动按姓名绑定球员档案；驳回必须填写原因并回传给用户端
const auth = useAuth()
const records = ref<RealNameRecord[]>([])
const loading = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const keyword = ref('')
const statusFilter = ref('全部状态')
const STATUS_OPTIONS = ['全部状态', '待审核', '已认证', '已驳回']

const rejectOpen = ref(false)
const rejectTarget = ref<RealNameRecord | null>(null)
const rejectReason = ref('')
const rejectError = ref('')
const detailTarget = ref<RealNameRecord | null>(null)

const scopeText = computed(() => {
  if (auth.state.role === 'super') return '省级视角：可查看并审核全省实名信息'
  if (auth.state.role === 'school') return `校级视角：仅本校（${auth.state.schoolName || '未绑定学校'}）队员`
  return `市州视角：仅本市（${auth.state.city || '未绑定市州'}）队员`
})

const columns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '90px' },
  { key: 'idCardMasked', label: '身份证号', width: '170px' },
  { key: 'account', label: '账号', width: '110px' },
  { key: 'schoolName', label: '所属学校' },
  { key: 'city', label: '市州', width: '90px' },
  { key: 'status', label: '状态', width: '90px' },
  { key: 'submittedAt', label: '提交时间', width: '150px' },
]

const rows = computed<Record<string, unknown>[]>(() =>
  records.value.map((record) => ({
    id: record.id,
    name: record.name,
    idCardMasked: record.idCardMasked,
    account: record.account,
    schoolName: record.schoolName || '—',
    city: record.city || '—',
    status: record.status,
    submittedAt: record.submittedAt,
  })),
)

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
}

async function load() {
  loading.value = true
  try {
    records.value = await identityApi.list({
      status: statusFilter.value === '全部状态' ? '' : (statusFilter.value as RealNameStatus),
      keyword: keyword.value.trim(),
    })
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '实名认证列表加载失败', 'error')
  } finally {
    loading.value = false
  }
}

function rowActions(row: Record<string, unknown>) {
  return row.status === '待审核' ? ['查看', '通过', '驳回'] : ['查看']
}

async function handleAction(action: string, row: Record<string, unknown>) {
  const target = records.value.find((record) => record.id === String(row.id))
  if (!target) return
  if (action === '查看') {
    detailTarget.value = target
    return
  }
  if (action === '通过') {
    if (!window.confirm(`确认通过「${target.name}」的实名认证？通过后将绑定球员档案。`)) return
    try {
      const saved = await identityApi.review(target.id, 'approve')
      showMessage(`已通过「${saved.name}」的实名认证${saved.playerName ? `，绑定球员 ${saved.playerName}` : ''}。`)
      await load()
    } catch (error) {
      showMessage(error instanceof ApiError ? error.message : '审核失败', 'error')
    }
    return
  }
  if (action === '驳回') {
    rejectTarget.value = target
    rejectReason.value = ''
    rejectError.value = ''
    rejectOpen.value = true
  }
}

async function submitReject() {
  const target = rejectTarget.value
  if (!target) return
  rejectError.value = ''
  try {
    await identityApi.review(target.id, 'reject', rejectReason.value)
    rejectOpen.value = false
    showMessage(`已驳回「${target.name}」的实名认证，原因已回传用户端。`)
    await load()
  } catch (error) {
    rejectError.value = error instanceof ApiError ? error.message : '驳回失败'
  }
}

onMounted(load)
</script>

<template>
  <PageHeader title="实名认证审核" desc="审核队员实名信息，通过后自动绑定球员档案并展示个人参赛记录" />

  <p class="page-tip">{{ scopeText }}。身份证号仅展示脱敏结果，平台不保存明文。</p>
  <p v-if="message" class="page-tip" :class="messageType">{{ message }}</p>

  <div class="filter-row">
    <input v-model="keyword" class="field-input" type="text" placeholder="按姓名 / 账号 / 学校搜索" />
    <AppSelect v-model="statusFilter" :options="STATUS_OPTIONS" compact />
    <button type="button" class="btn btn-primary" :disabled="loading" @click="load">
      {{ loading ? '查询中…' : '查询' }}
    </button>
  </div>

  <DataTable :columns="columns" :rows="rows" :row-actions="rowActions" @action="handleAction" />
  <p v-if="!loading && !rows.length" class="empty-tip">暂无实名认证记录。</p>

  <AppModal :open="detailTarget !== null" title="实名认证详情" @close="detailTarget = null">
    <dl v-if="detailTarget" class="detail-grid">
      <div><dt>姓名</dt><dd>{{ detailTarget.name }}</dd></div>
      <div><dt>身份证号</dt><dd>{{ detailTarget.idCardMasked }}</dd></div>
      <div><dt>账号</dt><dd>{{ detailTarget.account }}</dd></div>
      <div><dt>手机号</dt><dd>{{ detailTarget.phone || '—' }}</dd></div>
      <div><dt>所属学校</dt><dd>{{ detailTarget.schoolName || '—' }}</dd></div>
      <div><dt>市州 / 区县</dt><dd>{{ detailTarget.city || '—' }} {{ detailTarget.district }}</dd></div>
      <div><dt>绑定球员</dt><dd>{{ detailTarget.playerName || '未绑定' }}</dd></div>
      <div><dt>状态</dt><dd>{{ detailTarget.status }}</dd></div>
      <div><dt>提交时间</dt><dd>{{ detailTarget.submittedAt }}</dd></div>
      <div v-if="detailTarget.reviewedAt"><dt>审核时间</dt><dd>{{ detailTarget.reviewedAt }}</dd></div>
      <div v-if="detailTarget.rejectReason" class="wide"><dt>驳回原因</dt><dd>{{ detailTarget.rejectReason }}</dd></div>
    </dl>
  </AppModal>

  <AppModal :open="rejectOpen" title="填写驳回原因" @close="rejectOpen = false">
    <p class="page-tip">
      正在驳回「{{ rejectTarget?.name }}」的实名认证。原因将展示在用户端实名认证页面，队员可修改后重新提交。
    </p>
    <textarea v-model="rejectReason" class="reject-area" rows="4" maxlength="100" placeholder="请填写驳回原因"></textarea>
    <p v-if="rejectError" class="page-tip error">{{ rejectError }}</p>
    <div class="modal-actions">
      <button type="button" class="btn btn-ghost" @click="rejectOpen = false">取消</button>
      <button type="button" class="btn btn-primary" @click="submitReject">确认驳回</button>
    </div>
  </AppModal>
</template>

<style scoped>
.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.field-input {
  flex: 1;
  min-width: 220px;
  padding: 9px 11px;
  border: 1.5px solid #d8e2da;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
}

.empty-tip {
  padding: 16px 0;
  font-size: 13px;
  color: var(--muted);
  text-align: center;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  margin: 0;
}

.detail-grid .wide {
  grid-column: 1 / -1;
}

.detail-grid dt {
  font-size: 12px;
  color: var(--muted);
}

.detail-grid dd {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--ink);
}

.reject-area {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid #d8e2da;
  border-radius: 10px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}
</style>
