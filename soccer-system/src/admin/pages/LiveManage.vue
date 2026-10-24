<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, TableColumn } from '../../components/common/types'
import { fetchAdminMatches } from '../../api/manage'
import type { ApiMatch } from '../../api/types'
import {
  createLiveStream,
  deleteLiveStream,
  errMsg,
  fetchLiveStreams,
  updateLiveStream,
  type ApiLiveStream,
  type LiveStreamStatus,
} from '../../api/live'

// 直播链接管理：为场次配置直播链接（平台/地址/状态），支持新增、修改、删除。

const router = useRouter()

const STATUS_TO_API: Record<string, LiveStreamStatus> = { 未开始: 'pending', 直播中: 'live', 已结束: 'ended' }

const columns: TableColumn[] = [
  { key: 'match', label: '场次' },
  { key: 'platform', label: '平台', width: '90px' },
  { key: 'url', label: '直播链接' },
  { key: 'status', label: '状态', width: '90px' },
]

interface StreamRow {
  id: number
  matchId: number
  match: string
  platform: string
  url: string
  status: string
}

const matches = ref<ApiMatch[]>([])
const rows = ref<StreamRow[]>([])
const editingId = ref<number | null>(null)
const formInitial = ref<Record<string, string>>({})
const formKey = ref(0) // 重置 DataForm 输入

// 场次下拉：显示文案 ↔ 场次 id
const matchOptions = computed(() =>
  matches.value.map((m) => `${m.group_type_display} ${m.round_name}：${m.home_team_name} vs ${m.away_team_name}`),
)
const matchIdByOption = computed(() => {
  const map = new Map<string, number>()
  matches.value.forEach((m, i) => map.set(matchOptions.value[i] ?? '', m.id))
  return map
})

const formFields = computed<FormField[]>(() => [
  { key: 'match', label: '关联场次', type: 'select', options: matchOptions.value, placeholder: '请选择场次' },
  { key: 'platform', label: '直播平台', type: 'select', options: ['抖音', '视频号', 'B站', '其他'] },
  { key: 'url', label: '直播链接', placeholder: '粘贴直播间地址' },
  { key: 'status', label: '直播状态', type: 'select', options: ['未开始', '直播中', '已结束'] },
])

async function refresh() {
  const matchList = await fetchAdminMatches()
  if (matchList) matches.value = matchList
  const list = await fetchLiveStreams()
  if (!list) return // 后端不可用：保留演示数据
  rows.value = list.map((s: ApiLiveStream) => ({
    id: s.id,
    matchId: s.match,
    match: s.match_display,
    platform: s.platform || '—',
    url: s.url,
    status: s.status_display,
  }))
}

onMounted(refresh)

async function onSubmit(data: Record<string, string>) {
  const matchId = matchIdByOption.value.get(data.match ?? '')
  if (!matchId) {
    alert('请选择关联场次')
    return
  }
  const url = (data.url ?? '').trim()
  if (!url) {
    alert('请填写直播链接')
    return
  }
  const payload = {
    match: matchId,
    platform: data.platform ?? '',
    url,
    status: STATUS_TO_API[data.status ?? '未开始'] ?? 'pending',
  }
  try {
    if (editingId.value !== null) {
      await updateLiveStream(editingId.value, payload)
      editingId.value = null
      formInitial.value = {}
    } else {
      await createLiveStream(payload)
    }
    formKey.value++
    await refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onAction(action: string, row: Record<string, unknown>) {
  const r = row as unknown as StreamRow
  if (action === '图文直播') {
    await router.push('/admin/live-text')
    return
  }
  if (action === '修改') {
    editingId.value = r.id
    // 回填：按 matchId 找到下拉选项文案（match_display 与前端文案生成规则可能不同）
    const idx = matches.value.findIndex((m) => m.id === r.matchId)
    formInitial.value = {
      match: idx >= 0 ? (matchOptions.value[idx] ?? '') : '',
      platform: r.platform === '—' ? '其他' : r.platform,
      url: r.url,
      status: r.status,
    }
    formKey.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  if (action === '删除') {
    if (!confirm(`确认删除「${r.match}」的直播链接？`)) return
    try {
      await deleteLiveStream(r.id)
      if (editingId.value === r.id) {
        editingId.value = null
        formInitial.value = {}
      }
      await refresh()
    } catch (err) {
      alert(errMsg(err))
    }
  }
}
</script>

<template>
  <PageHeader title="直播链接管理" desc="为各场次配置直播链接与状态，直播间图文播报请前往「赛事图文直播」" />

  <h3 v-if="editingId" class="section-title">修改直播链接</h3>
  <h3 v-else class="section-title">新增直播链接</h3>
  <DataForm :key="formKey" :fields="formFields" :submit-text="editingId ? '保存修改' : '保存直播链接'" :initial="formInitial" @submit="onSubmit" />

  <h3 class="section-title">已配置的直播</h3>
  <DataTable :columns="columns" :rows="rows" :actions="['修改', '删除', '图文直播']" @action="onAction" />
</template>
