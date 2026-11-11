<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'
import { registrationApi, ApiError, type Registration, type RegistrationStatus } from '../../api'
import { useAuth } from '../../stores/auth'

// 我的报名：查看审核状态与驳回原因；被驳回后可直接重新提交
const auth = useAuth()

const searchFields: SearchField[] = [
  { key: 'team', label: '球队名称', placeholder: '输入球队名称' },
  { key: 'group', label: '报名组别', type: 'select', options: ['小学组', '中学组', '高中组', '高校组'] },
  { key: 'status', label: '审核状态', type: 'select', options: ['待初审', '已提交省级', '已通过', '已驳回'] },
]

const columns: TableColumn[] = [
  { key: 'team', label: '球队名称' },
  { key: 'tournament', label: '赛事' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'players', label: '报名人数', width: '90px' },
  { key: 'submitTime', label: '提交时间', width: '150px' },
  { key: 'status', label: '审核状态', width: '110px' },
  { key: 'rejectReason', label: '驳回原因' },
]

const items = ref<Registration[]>([])
const filters = ref<Record<string, string>>({})
const loading = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const rejected = computed(() => items.value.filter((r) => r.status === '已驳回'))

type TimelineState = 'done' | 'current' | 'wait' | 'error'

interface TimelineNode {
  label: string
  state: TimelineState
}

// 审核状态时间线：与报名提交页保持同一套状态映射
function timelineOf(status: RegistrationStatus): TimelineNode[] {
  const states: Record<RegistrationStatus, TimelineState[]> = {
    待初审: ['done', 'current', 'wait', 'wait'],
    已提交省级: ['done', 'done', 'current', 'wait'],
    已通过: ['done', 'done', 'done', 'done'],
    已驳回: ['done', 'error', 'error', 'wait'],
  }
  const labels = ['提交报名', '市州初审', '省级终审', '审核通过']
  return states[status].map((state, index) => ({ label: labels[index] ?? '审核节点', state }))
}

const filtered = computed(() => {
  const key = (filters.value.team ?? '').trim().toLowerCase()
  return items.value.filter((r) => {
    if (filters.value.group && r.group !== filters.value.group) return false
    if (filters.value.status && r.status !== filters.value.status) return false
    if (!key) return true
    return r.team.toLowerCase().includes(key) || r.tournamentName.toLowerCase().includes(key)
  })
})

const rows = computed<Record<string, unknown>[]>(() =>
  filtered.value.map((r) => ({
    ...r,
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
    items.value = await registrationApi.listMine()
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
  return row.status === '已驳回' ? ['查看审核', '重新提交'] : ['查看审核', '报名表PDF']
}

async function onAction(action: string, row: Record<string, unknown>) {
  const current = items.value.find((r) => r.id === String(row.id ?? ''))
  if (!current) return

  if (action === '查看审核') {
    if (current.status === '已驳回') {
      showMessage(`「${current.team}」被${current.rejectBy}驳回：${current.rejectReason}`, 'error')
    } else {
      showMessage(`「${current.team}」当前审核状态：${current.status}`)
    }
    return
  }

  if (action === '报名表PDF') {
    showMessage('报名表 PDF 下载将在后续迭代接入。')
    return
  }

  if (action === '重新提交') {
    try {
      await registrationApi.resubmit(current.id)
      showMessage('已重新提交，报名状态回到“待初审”，请等待市州管理员审核。')
      await load()
    } catch (error) {
      showMessage(error instanceof ApiError ? error.message : '重新提交失败', 'error')
    }
  }
}

async function resubmit(item: Registration) {
  try {
    await registrationApi.resubmit(item.id)
    showMessage(`「${item.team}」已重新提交，等待市州初审。`)
    await load()
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '重新提交失败', 'error')
  }
}

onMounted(load)
</script>

<template>
  <PageHeader title="我的报名" desc="查看报名审核状态与驳回原因，被驳回后可修改并重新提交" />

  <div v-if="rejected.length" class="reject-box">
    <h3>审核驳回提醒</h3>
    <div v-for="item in rejected" :key="item.id" class="reject-item">
      <div class="reject-info">
        <strong>{{ item.team }}</strong>
        <span>{{ item.tournamentName }}</span>
        <p>{{ item.rejectReason }}</p>
        <small>驳回单位：{{ item.rejectBy }} · {{ item.rejectTime }}</small>
      </div>
      <button type="button" class="btn btn-primary" @click="resubmit(item)">修改并重新提交</button>
    </div>
  </div>

  <section v-if="items.length" class="progress-card">
    <div class="progress-title">
      <h3>审核进度</h3>
      <span>共 {{ items.length }} 份报名</span>
    </div>
    <div class="progress-list">
      <div v-for="item in items" :key="item.id" class="progress-item">
        <div class="progress-head">
          <strong>{{ item.tournamentName }}</strong>
          <span>{{ item.team }}</span>
          <small class="mini-status" :class="`status-${item.status}`">{{ item.status }}</small>
        </div>
        <ol class="mini-timeline">
          <li
            v-for="(node, index) in timelineOf(item.status)"
            :key="node.label"
            class="mini-node"
            :class="node.state"
          >
            <span class="mini-dot">
              {{ node.state === 'done' ? '✓' : node.state === 'error' ? '!' : index + 1 }}
            </span>
            <small>{{ node.label }}</small>
          </li>
        </ol>
      </div>
    </div>
  </section>

  <p v-if="message" class="notice" :class="messageType">{{ message }}</p>

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable :columns="columns" :rows="rows" :row-actions="rowActions" @action="onAction" />

  <p v-if="loading" class="loading-tip">正在加载报名数据…</p>
</template>

<style scoped>
.reject-box {
  background: #fff7ed;
  border: 1px solid #f2d3ac;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 16px;
}

.reject-box h3 {
  font-size: 14px;
  color: #9a4a12;
  margin-bottom: 10px;
}

.reject-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  border-top: 1px dashed #efd8bd;
}

.reject-item:first-of-type {
  border-top: none;
  padding-top: 0;
}

.reject-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.reject-info strong {
  color: var(--ink);
}

.reject-info p {
  color: #9a4a12;
}

.reject-info small {
  color: var(--muted);
}

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

.notice.error {
  background: #fff2f1;
  border: 1px solid #f0c4c0;
  color: #a3312a;
}

.progress-card {
  margin-bottom: 16px;
  padding: 16px 18px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(20, 60, 40, 0.05);
}

.progress-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.progress-title h3 {
  font-size: 15px;
  color: var(--green-dark);
}

.progress-title span {
  font-size: 12px;
  color: var(--muted);
}

.progress-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 12px;
  overflow-x: auto;
}

.progress-item {
  min-width: 520px;
  padding-top: 12px;
  border-top: 1px dashed #eef3ee;
}

.progress-item:first-child {
  padding-top: 0;
  border-top: none;
}

.progress-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.progress-head strong {
  font-size: 13px;
  color: var(--ink);
}

.progress-head span {
  font-size: 12px;
  color: var(--muted);
}

.mini-status {
  margin-left: auto;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.mini-status.status-待初审,
.mini-status.status-已提交省级 {
  background: #eaf2fb;
  color: #1f5d98;
}

.mini-status.status-已通过 {
  background: #eef8f0;
  color: #1e7a3f;
}

.mini-status.status-已驳回 {
  background: #fff2f1;
  color: #c0392b;
}

.mini-timeline {
  display: flex;
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
}

.mini-node {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--muted);
}

.mini-node::after {
  content: '';
  position: absolute;
  top: 8px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #e3ebe5;
  z-index: 0;
}

.mini-node:last-child::after {
  display: none;
}

.mini-node.done::after {
  background: var(--green);
}

.mini-dot {
  position: relative;
  z-index: 1;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #eef1ef;
  border: 2px solid #e3ebe5;
  color: #7d8a82;
  font-size: 9px;
  font-weight: 700;
}

.mini-node.done .mini-dot {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
}

.mini-node.current .mini-dot {
  background: #fff;
  border-color: var(--green);
  color: var(--green);
}

.mini-node.error .mini-dot {
  background: #c0392b;
  border-color: #c0392b;
  color: #fff;
}

.mini-node small {
  white-space: nowrap;
}

.loading-tip {
  margin-top: 10px;
  font-size: 12px;
  color: var(--muted);
}

@media (max-width: 760px) {
  /* 报名表格列较多，手机上保持表内横向滚动 */
  :deep(.data-table) {
    min-width: 900px;
  }
}
</style>
