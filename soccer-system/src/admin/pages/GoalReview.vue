<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import AppSelect from '../../components/common/AppSelect.vue'
import DataTable from '../../components/common/DataTable.vue'
import AppModal from '../../components/common/AppModal.vue'
import type { TableColumn } from '../../components/common/types'
import { goalDetectionApi, ApiError, liveMatchOptions, type GoalDetection, type GoalStatus } from '../../api'

// 管理端 · AI 进球待审核：视觉判定先进入队列，人工确认后才写入直播事件并更新比分
// 审核不可逆，确认 / 驳回都必须二次确认；每 10 秒轮询待审核，页面隐藏时暂停

const STATUS_OPTIONS = ['待审核', '已确认', '已驳回']
const statusFilter = ref('待审核')
const matchFilter = ref('全部比赛')

const matchOptions = liveMatchOptions()
const matchFilterOptions = ['全部比赛', ...matchOptions.map((m) => m.name)]

const columns: TableColumn[] = [
  { key: 'match', label: '比赛' },
  { key: 'camera', label: '机位', width: '120px' },
  { key: 'scoring', label: '得分方', width: '90px' },
  { key: 'minuteText', label: '分钟', width: '70px' },
  { key: 'confidenceText', label: '置信度', width: '90px' },
  { key: 'evidenceText', label: '证据图', width: '80px' },
  { key: 'statusText', label: '审核状态', width: '100px' },
  { key: 'reviewer', label: '审核人', width: '90px' },
  { key: 'occurredText', label: '判定时间', width: '120px' },
]

const items = ref<GoalDetection[]>([])
const total = ref(0)
const loading = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const statusOf = (text: string): GoalStatus | '' =>
  text === '待审核' ? 'pending' : text === '已确认' ? 'confirmed' : text === '已驳回' ? 'rejected' : ''

const matchIdOf = (): number | undefined => {
  if (matchFilter.value === '全部比赛') return undefined
  return matchOptions.find((m) => m.name === matchFilter.value)?.id
}

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
}

function timeText(iso: string) {
  return iso.slice(5, 16).replace('T', ' ')
}

const rows = computed<Record<string, unknown>[]>(() =>
  items.value.map((d) => {
    const confidence = Number.parseFloat(d.confidence)
    return {
      ...d,
      match: d.match_name,
      camera: d.camera_name,
      scoring: d.scoring_side_display,
      minuteText: `${d.minute}'`,
      confidenceText: Number.isFinite(confidence) ? `${Math.round(confidence * 100)}%` : '—',
      evidenceText: `${d.evidence_count} 张`,
      statusText: d.status_display,
      reviewer: d.reviewed_by_name ?? '—',
      occurredText: timeText(d.occurred_at),
    }
  }),
)

async function load(silent = false) {
  if (!silent) loading.value = true
  try {
    const result = await goalDetectionApi.list({
      status: statusOf(statusFilter.value),
      match_id: matchIdOf(),
      page: 1,
      page_size: 20,
    })
    items.value = result.results
    total.value = result.total
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '待审核列表加载失败', 'error')
  } finally {
    loading.value = false
  }
}

function rowActions(row: Record<string, unknown>) {
  const status = String(row.status ?? '')
  return status === 'pending' ? ['查看证据', '确认进球', '驳回'] : ['查看证据']
}

// ===== 证据图：使用 fetch + blob，卸载 / 关闭时统一 revoke =====
const evidenceOpen = ref(false)
const evidenceTarget = ref<GoalDetection | null>(null)
const evidenceUrls = ref<string[]>([])
const evidenceLoading = ref(false)
const evidenceError = ref('')

function revokeEvidence() {
  for (const url of evidenceUrls.value) URL.revokeObjectURL(url)
  evidenceUrls.value = []
}

async function openEvidence(target: GoalDetection) {
  evidenceTarget.value = target
  evidenceOpen.value = true
  evidenceLoading.value = true
  evidenceError.value = ''
  revokeEvidence()
  try {
    const blobs = await Promise.all(
      Array.from({ length: target.evidence_count }, (_, index) => goalDetectionApi.evidence(target.id, index)),
    )
    evidenceUrls.value = blobs.map((blob) => URL.createObjectURL(blob))
  } catch (error) {
    evidenceError.value = error instanceof ApiError ? error.message : '证据图加载失败'
  } finally {
    evidenceLoading.value = false
  }
}

function closeEvidence() {
  evidenceOpen.value = false
  evidenceTarget.value = null
  revokeEvidence()
}

// ===== 审核：确认后写入直播事件并更新比分，二次确认不可撤销 =====
const reviewOpen = ref(false)
const reviewTarget = ref<GoalDetection | null>(null)
const reviewAction = ref<'confirm' | 'reject'>('confirm')
const reviewing = ref(false)
const reviewError = ref('')

function askReview(target: GoalDetection, action: 'confirm' | 'reject') {
  reviewTarget.value = target
  reviewAction.value = action
  reviewError.value = ''
  reviewOpen.value = true
}

async function submitReview() {
  const target = reviewTarget.value
  if (!target || reviewing.value) return
  reviewing.value = true
  reviewError.value = ''
  try {
    const result = await goalDetectionApi.review(target.id, reviewAction.value)
    reviewOpen.value = false
    if (result.status === 'confirmed') {
      showMessage(
        `已确认第 ${result.minute} 分钟进球，比分更新为 ${result.live_home_score} : ${result.live_away_score}。`,
      )
    } else {
      showMessage('已驳回该判定，比分保持不变。')
    }
    await load(true)
  } catch (error) {
    if (error instanceof ApiError) {
      reviewError.value = error.message
      if (error.code === 40009 || error.code === 40002) {
        reviewOpen.value = false
        showMessage(error.message, 'error')
        await load(true)
      }
    } else {
      reviewError.value = '审核操作失败'
    }
  } finally {
    reviewing.value = false
  }
}

async function handleAction(action: string, row: Record<string, unknown>) {
  const id = Number(row.id)
  const target = items.value.find((d) => d.id === id)
  if (!target) return
  if (action === '查看证据') {
    await openEvidence(target)
    return
  }
  if (action === '确认进球') askReview(target, 'confirm')
  if (action === '驳回') askReview(target, 'reject')
}

// 待审核队列每 10 秒刷新；document.hidden 时暂停，回到页面立即补拉一次
let pollTimer: ReturnType<typeof setInterval> | undefined

function onVisibilityChange() {
  if (!document.hidden) load(true)
}

watch([statusFilter, matchFilter], () => {
  load()
})

onMounted(() => {
  load()
  pollTimer = setInterval(() => {
    if (!document.hidden && statusFilter.value === '待审核') load(true)
  }, 10_000)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  revokeEvidence()
})
</script>

<template>
  <div class="page-root">
  <PageHeader
    title="AI 进球待审核"
    desc="视觉判定进入队列后由管理员复核，确认才写入直播事件与比分；审核不可撤销"
  />

  <div class="toolbar">
    <span class="toolbar-label">审核状态</span>
    <AppSelect v-model="statusFilter" :options="STATUS_OPTIONS" />
    <span class="toolbar-label">比赛</span>
    <AppSelect v-model="matchFilter" :options="matchFilterOptions" />
    <button type="button" class="refresh-btn" :disabled="loading" @click="load()">
      {{ loading ? '加载中…' : '刷新' }}
    </button>
    <span class="toolbar-note">共 {{ total }} 条 · 待审核队列每 10 秒自动刷新</span>
  </div>

  <p v-if="message" class="page-tip" :class="messageType">{{ message }}</p>

  <DataTable :columns="columns" :rows="rows" :row-actions="rowActions" @action="handleAction" />

  <p class="page-tip hint">
    置信度低于 60% 的判定建议重点核对证据图；比赛已结束的场次无法确认进球，只能驳回。
    goal_side 是「被攻破的一侧」，列表展示的是得分方 scoring_side，不要自行取反。
  </p>

  <AppModal :open="evidenceOpen" title="证据图" @close="closeEvidence">
    <p v-if="evidenceTarget" class="modal-meta">
      判定 #{{ evidenceTarget.id }} · {{ evidenceTarget.match_name }} · 第 {{ evidenceTarget.minute }} 分钟 ·
      {{ evidenceTarget.scoring_side_display }}
    </p>
    <p v-if="evidenceLoading" class="page-tip">正在加载证据图…</p>
    <p v-else-if="evidenceError" class="page-tip error">{{ evidenceError }}</p>
    <div v-else class="evidence-grid">
      <figure v-for="(url, index) in evidenceUrls" :key="index" class="evidence-item">
        <img :src="url" :alt="`证据帧 ${index + 1}`" />
        <figcaption>帧 {{ index + 1 }} · {{ index === 0 ? '触发前 2 秒' : index === evidenceUrls.length - 1 ? '触发后 1 秒' : '触发前后' }}</figcaption>
      </figure>
    </div>
    <template #footer>
      <button type="button" class="modal-btn" @click="closeEvidence">关闭</button>
    </template>
  </AppModal>

  <AppModal
    :open="reviewOpen"
    :title="reviewAction === 'confirm' ? '确认进球' : '驳回判定'"
    @close="reviewOpen = false"
  >
    <div v-if="reviewTarget" class="review-body">
      <p><strong>{{ reviewTarget.match_name }}</strong></p>
      <p>第 {{ reviewTarget.minute }} 分钟 · {{ reviewTarget.scoring_side_display }}</p>
      <p>机位：{{ reviewTarget.camera_name }} · 置信度：{{ Math.round(Number.parseFloat(reviewTarget.confidence) * 100) }}%</p>
      <p v-if="reviewAction === 'confirm'" class="review-warning">
        确认后将立即写入直播事件并将比分 +1，审核不可撤销。
      </p>
      <p v-else class="review-warning">驳回后比分保持不变，该判定不可再次审核。</p>
      <p v-if="reviewError" class="page-tip error">{{ reviewError }}</p>
    </div>
    <template #footer>
      <button type="button" class="modal-btn" :disabled="reviewing" @click="reviewOpen = false">取消</button>
      <button
        type="button"
        class="modal-btn primary"
        :class="{ danger: reviewAction === 'reject' }"
        :disabled="reviewing"
        @click="submitReview"
      >
        {{ reviewing ? '提交中…' : reviewAction === 'confirm' ? '确认写入' : '确认驳回' }}
      </button>
    </template>
  </AppModal>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.toolbar-label {
  font-size: 13px;
  color: var(--muted);
}

.toolbar :deep(.app-select) {
  width: 190px;
}

.refresh-btn {
  border: 1px solid #d9e6dc;
  background: #fff;
  color: var(--green-dark);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.refresh-btn:hover:not(:disabled) {
  border-color: var(--green);
  background: var(--green-light);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-note {
  font-size: 12px;
  color: var(--muted);
}

.page-tip {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 12px;
}

.page-tip.success {
  color: var(--green-dark);
}

.page-tip.error {
  color: #a3312a;
}

.page-tip.hint {
  margin-top: 14px;
  line-height: 1.8;
}

.modal-meta {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 12px;
}

.evidence-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.evidence-item {
  margin: 0;
  border: 1px solid #e7eee8;
  border-radius: 10px;
  overflow: hidden;
  background: #f7faf7;
}

.evidence-item img {
  display: block;
  width: 100%;
  height: auto;
}

.evidence-item figcaption {
  padding: 6px 8px;
  font-size: 12px;
  color: var(--muted);
}

.review-body p {
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--ink);
}

.review-warning {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff6e6;
  color: #8a5a12;
  line-height: 1.7;
}

.modal-btn {
  border: 1px solid #d9e6dc;
  background: #fff;
  color: var(--green-dark);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 18px;
  border-radius: 8px;
  cursor: pointer;
}

.modal-btn.primary {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
}

.modal-btn.danger {
  background: #a3312a;
  border-color: #a3312a;
}

.modal-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
