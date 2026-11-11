<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import AppModal from '../../components/common/AppModal.vue'
import type { SearchField, TableColumn } from '../../components/common/types'
import { registrationApi, ApiError, type Registration } from '../../api'
import { useAuth } from '../../stores/auth'

// 报名审核：市州管理员做初审，通过后提交省级；省级管理员可反向驳回
// 驳回必须填写原因，用户端【我的报名】能看到原因并重新提交
const auth = useAuth()
const isSuper = computed(() => auth.state.role === 'super')
const reviewer = computed(() => (isSuper.value ? '省教育厅' : '成都市教育局'))

const searchFields: SearchField[] = [
  { key: 'team', label: '球队名称', placeholder: '输入球队 / 学校名称' },
  { key: 'group', label: '报名组别', type: 'select', options: ['小学组', '中学组', '高中组', '高校组'] },
  { key: 'status', label: '审核状态', type: 'select', options: ['待初审', '已提交省级', '已通过', '已驳回'] },
]

const columns = computed<TableColumn[]>(() => {
  const base: TableColumn[] = [
    { key: 'team', label: '球队名称' },
    { key: 'unit', label: '所属学校', width: '130px' },
    { key: 'tournament', label: '赛事' },
    { key: 'group', label: '组别', width: '90px' },
    { key: 'players', label: '人数', width: '70px' },
    { key: 'submitTime', label: '提交时间', width: '150px' },
    { key: 'status', label: '审核状态', width: '110px' },
    { key: 'rejectReason', label: '驳回原因' },
  ]
  if (isSuper.value) base.splice(1, 0, { key: 'city', label: '市州', width: '90px' })
  return base
})

const items = ref<Registration[]>([])
const filters = ref<Record<string, string>>({})
const loading = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const rejectOpen = ref(false)
const rejectTarget = ref<Registration | null>(null)
const rejectReason = ref('')
const rejectError = ref('')

const detailOpen = ref(false)
const detailTarget = ref<Registration | null>(null)

const filtered = computed(() => {
  const key = (filters.value.team ?? '').trim().toLowerCase()
  return items.value.filter((r) => {
    if (filters.value.group && r.group !== filters.value.group) return false
    if (filters.value.status && r.status !== filters.value.status) return false
    if (!key) return true
    return r.team.toLowerCase().includes(key) || r.school.toLowerCase().includes(key)
  })
})

const rows = computed<Record<string, unknown>[]>(() =>
  filtered.value.map((r) => ({
    ...r,
    unit: r.school,
    tournament: r.tournamentName,
    rejectReason: r.rejectReason ?? '—',
  })),
)

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
}

async function load() {
  loading.value = true
  try {
    items.value = await registrationApi.list(isSuper.value ? {} : { city: '成都市' })
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '报名数据加载失败', 'error')
  } finally {
    loading.value = false
  }
}

function onSearch(next: Record<string, string>) {
  filters.value = { ...next }
}

function rowActions(row: Record<string, unknown>) {
  const status = String(row.status ?? '')
  if (!isSuper.value && status === '待初审') return ['查看材料', '通过初审', '驳回']
  if (isSuper.value && status === '已提交省级') return ['查看材料', '通过终审', '驳回']
  return ['查看材料']
}

async function handleAction(action: string, row: Record<string, unknown>) {
  const id = String(row.id ?? '')
  const current = items.value.find((r) => r.id === id)
  if (!current) return

  if (action === '查看材料') {
    detailTarget.value = current
    detailOpen.value = true
    return
  }

  if (action === '驳回') {
    rejectTarget.value = current
    rejectReason.value = ''
    rejectError.value = ''
    rejectOpen.value = true
    return
  }

  try {
    if (action === '通过初审') {
      await registrationApi.approve(id, 'city')
      showMessage('初审已通过，报名已提交省级终审。')
    } else if (action === '通过终审') {
      await registrationApi.approve(id, 'province')
      showMessage('省级终审已通过，报名信息可以公示。')
    } else {
      return
    }
    await load()
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '审核操作失败', 'error')
  }
}

async function submitReject() {
  const target = rejectTarget.value
  if (!target) return
  const reason = rejectReason.value.trim()
  if (!reason) {
    rejectError.value = '请填写驳回原因，原因会推送给报送球队'
    return
  }

  try {
    await registrationApi.reject(target.id, reason, reviewer.value)
    rejectOpen.value = false
    showMessage(`已驳回「${target.team}」，球队可在用户端查看原因并重新提交。`)
    await load()
  } catch (error) {
    rejectError.value = error instanceof ApiError ? error.message : '驳回失败'
  }
}

onMounted(load)
</script>

<template>
  <PageHeader
    :title="isSuper ? '报名信息审核（省级终审）' : '报名审核（市州初审）'"
    :desc="
      isSuper
        ? '复核市州初审通过的报名件，可反向驳回；驳回原因将推送给报送球队'
        : '审核本区域报名材料，通过后提交省级终审；驳回需填写原因'
    "
  />

  <p class="page-tip">
    {{
      isSuper
        ? '省级终审：复核市州初审通过的报名件。通过后进入公示；如不符合要求可反向驳回，驳回原因会推送给用户端球队。'
        : '市州初审：核对报名表信息完整性、球员学籍与注册状态、带队教练资质。通过后自动提交省级终审；驳回时需填写原因。'
    }}
    仅能处理权限范围内的报名件。
  </p>

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <p v-if="message" class="notice" :class="messageType">{{ message }}</p>

  <DataTable
    :columns="columns"
    :rows="rows"
    :row-actions="rowActions"
    @action="handleAction"
  />

  <p v-if="loading" class="loading-tip">正在加载报名数据…</p>

  <AppModal :open="rejectOpen" title="填写驳回原因" @close="rejectOpen = false">
    <p class="modal-tip">
      正在驳回「{{ rejectTarget?.team }}」的报名申请。原因会同步到用户端【我的报名】，球队可修改后重新提交。
    </p>
    <textarea
      v-model="rejectReason"
      class="reject-textarea"
      rows="4"
      placeholder="如：缺少 3 名球员的学籍证明，请补充后重新提交。"
    ></textarea>
    <p v-if="rejectError" class="form-error">{{ rejectError }}</p>
    <div class="modal-actions">
      <button type="button" class="btn btn-ghost" @click="rejectOpen = false">取消</button>
      <button type="button" class="btn btn-primary" @click="submitReject">确认驳回</button>
    </div>
  </AppModal>

  <AppModal :open="detailOpen" title="报名材料" @close="detailOpen = false">
    <template v-if="detailTarget">
      <dl class="detail-list">
        <div><dt>赛事</dt><dd>{{ detailTarget.tournamentName }}</dd></div>
        <div><dt>球队</dt><dd>{{ detailTarget.team }}</dd></div>
        <div><dt>学校</dt><dd>{{ detailTarget.school }}</dd></div>
        <div><dt>市州</dt><dd>{{ detailTarget.city }}</dd></div>
        <div><dt>组别 / 人数</dt><dd>{{ detailTarget.group }} · {{ detailTarget.players }} 人</dd></div>
        <div v-if="detailTarget.leader"><dt>领队 / 电话</dt><dd>{{ detailTarget.leader }} · {{ detailTarget.phone }}</dd></div>
        <div v-if="detailTarget.coach"><dt>带队教练</dt><dd>{{ detailTarget.coach }}</dd></div>
        <div><dt>提交时间</dt><dd>{{ detailTarget.submitTime }}</dd></div>
        <div><dt>审核状态</dt><dd>{{ detailTarget.status }}</dd></div>
        <div v-if="detailTarget.rejectReason">
          <dt>驳回原因</dt>
          <dd>{{ detailTarget.rejectReason }}（{{ detailTarget.rejectBy }} · {{ detailTarget.rejectTime }}）</dd>
        </div>
        <div v-if="detailTarget.resubmitCount">
          <dt>重新提交</dt>
          <dd>已重新提交 {{ detailTarget.resubmitCount }} 次</dd>
        </div>
      </dl>
      <p class="modal-tip">报名表、学籍材料、教练资质等附件预览将在后续迭代接入。</p>
    </template>
  </AppModal>
</template>

<style scoped>
.notice {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 12px;
}

.notice.success {
  background: #eef8f0;
  border: 1px solid #bfe3c8;
  color: var(--green-dark);
}

.notice.error,
.form-error {
  background: #fff2f1;
  border: 1px solid #f0c4c0;
  color: #a3312a;
}

.form-error {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  margin-top: 10px;
}

.modal-tip {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.7;
  margin-bottom: 12px;
}

.reject-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid #d8e2da;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  outline: none;
}

.reject-textarea:focus {
  border-color: var(--green);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}

.detail-list {
  display: grid;
  gap: 9px;
  font-size: 13px;
}

.detail-list > div {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 10px;
}

.detail-list dt {
  color: var(--muted);
}

.detail-list dd {
  color: var(--ink);
  line-height: 1.6;
  word-break: break-all;
}

.loading-tip {
  margin-top: 10px;
  font-size: 12px;
  color: var(--muted);
}
</style>
