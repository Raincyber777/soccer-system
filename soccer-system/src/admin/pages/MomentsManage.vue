<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import AppSelect from '../../components/common/AppSelect.vue'
import type { TableColumn } from '../../components/common/types'
import {
  momentApi,
  liveMatchOptions,
  ApiError,
  type MatchMoment,
  type MomentCategory,
  type MomentStatus,
} from '../../api'

// 精彩瞬间管理：摄影师手动上传图片，管理员发布后门户比赛详情展示
// 图片内容存 IndexedDB，列表只保存元数据；上传后默认待发布
const matches = liveMatchOptions()
const matchOptions = ['全部比赛', ...matches.map((match) => match.name)]

const STATUS_OPTIONS = ['全部状态', '待发布', '已发布', '已下架']
const CATEGORY_OPTIONS: MomentCategory[] = ['精彩瞬间', '进球', '庆祝', '花絮']

const moments = ref<MatchMoment[]>([])
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const statusFilter = ref('全部状态')
const matchFilter = ref('全部比赛')

const form = reactive({
  matchName: matches[0]?.name ?? '',
  title: '',
  category: '精彩瞬间' as MomentCategory,
  photographer: '',
  description: '',
})
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const formError = ref('')

const thumbs = reactive<Record<string, string>>({})
const objectUrls = new Set<string>()

const columns: TableColumn[] = [
  { key: 'preview', label: '图片', width: '120px' },
  { key: 'title', label: '标题' },
  { key: 'matchName', label: '所属比赛', width: '200px' },
  { key: 'category', label: '类别', width: '90px' },
  { key: 'photographer', label: '摄影师', width: '110px' },
  { key: 'createdAt', label: '上传时间', width: '150px' },
  { key: 'status', label: '状态', width: '90px' },
]

const visible = computed(() => {
  const matchId = matches.find((match) => match.name === matchFilter.value)?.id ?? null
  return moments.value.filter((moment) => {
    if (statusFilter.value !== '全部状态' && moment.status !== statusFilter.value) return false
    if (matchId && moment.match_id !== matchId) return false
    return true
  })
})

const rows = computed<Record<string, unknown>[]>(() =>
  visible.value.map((moment) => ({
    id: moment.id,
    preview: thumbs[moment.id] ?? '',
    title: moment.title,
    matchName: moment.match_name,
    category: moment.category,
    photographer: moment.photographer,
    createdAt: moment.created_at,
    status: moment.status,
  })),
)

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
}

async function loadThumbs(list: MatchMoment[]) {
  for (const moment of list) {
    if (thumbs[moment.id]) continue
    try {
      const blob = await momentApi.image(moment.id)
      const url = URL.createObjectURL(blob)
      thumbs[moment.id] = url
      objectUrls.add(url)
    } catch {
      thumbs[moment.id] = ''
    }
  }
}

async function load() {
  loading.value = true
  try {
    moments.value = await momentApi.list()
    await loadThumbs(moments.value)
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '精彩瞬间加载失败', 'error')
  } finally {
    loading.value = false
  }
}

function onFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
  formError.value = ''
}

async function upload() {
  if (saving.value) return
  formError.value = ''
  const match = matches.find((item) => item.name === form.matchName)
  if (!match) {
    formError.value = '请选择所属比赛'
    return
  }
  if (!form.title.trim()) {
    formError.value = '请填写瞬间标题'
    return
  }
  if (!selectedFile.value) {
    formError.value = '请选择要上传的图片'
    return
  }
  saving.value = true
  try {
    const saved = await momentApi.upload(
      {
        match_id: match.id,
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        photographer: form.photographer.trim(),
      },
      selectedFile.value,
    )
    form.title = ''
    form.description = ''
    selectedFile.value = null
    if (fileInput.value) fileInput.value.value = ''
    showMessage(`「${saved.title}」已上传，当前为待发布，发布后将在门户比赛详情展示。`)
    await load()
  } catch (error) {
    formError.value = error instanceof ApiError ? error.message : '精彩瞬间上传失败'
  } finally {
    saving.value = false
  }
}

function rowActions(row: Record<string, unknown>) {
  if (row.status === '待发布') return ['发布', '删除']
  if (row.status === '已发布') return ['下架', '删除']
  return ['重新发布', '删除']
}

async function handleAction(action: string, row: Record<string, unknown>) {
  const target = moments.value.find((moment) => moment.id === String(row.id))
  if (!target) return
  try {
    if (action === '发布' || action === '重新发布') {
      await momentApi.setStatus(target.id, 'publish')
      showMessage(`「${target.title}」已发布，门户比赛详情已同步展示。`)
      await load()
      return
    }
    if (action === '下架') {
      await momentApi.setStatus(target.id, 'offline')
      showMessage(`「${target.title}」已下架。`)
      await load()
      return
    }
    if (action === '删除') {
      if (!window.confirm(`确认删除「${target.title}」？图片将一并删除。`)) return
      await momentApi.remove(target.id)
      if (thumbs[target.id]) {
        URL.revokeObjectURL(thumbs[target.id] as string)
        objectUrls.delete(thumbs[target.id] as string)
        delete thumbs[target.id]
      }
      showMessage('精彩瞬间已删除。')
      await load()
    }
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '操作失败', 'error')
  }
}

onBeforeUnmount(() => {
  for (const url of objectUrls) URL.revokeObjectURL(url)
  objectUrls.clear()
})

onMounted(load)
</script>

<template>
  <PageHeader title="精彩瞬间管理" desc="摄影师手动上传比赛图片，发布后在门户比赛详情自动展示" />

  <p class="page-tip">
    精彩瞬间不做自动抓取，由摄影师现场拍摄后手动上传。图片支持 jpg / jpeg / png / webp，单张不超过 5MB；
    上传后为待发布状态，发布后自动关联到对应比赛。
  </p>

  <p v-if="message" class="page-tip" :class="messageType">{{ message }}</p>

  <h3 class="section-title">上传精彩瞬间</h3>
  <form class="upload-form" @submit.prevent="upload">
    <div class="field wide">
      <label class="field-label">所属比赛</label>
      <AppSelect v-model="form.matchName" :options="matches.map((match) => match.name)" />
    </div>
    <div class="field">
      <label class="field-label">瞬间标题</label>
      <input v-model="form.title" class="field-input" type="text" maxlength="40" placeholder="如：第 63 分钟倒钩破门" />
    </div>
    <div class="field narrow">
      <label class="field-label">类别</label>
      <AppSelect v-model="form.category" :options="CATEGORY_OPTIONS" />
    </div>
    <div class="field">
      <label class="field-label">摄影师</label>
      <input v-model="form.photographer" class="field-input" type="text" maxlength="20" placeholder="如：摄影师小李" />
    </div>
    <div class="field wide">
      <label class="field-label">图片</label>
      <input
        ref="fileInput"
        class="field-input file-input"
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        @change="onFilePicked"
      />
    </div>
    <div class="field wide">
      <label class="field-label">文字说明</label>
      <textarea
        v-model="form.description"
        class="field-input"
        rows="2"
        maxlength="200"
        placeholder="展示在图片下方的说明文字"
      ></textarea>
    </div>
    <button type="submit" class="btn btn-primary" :disabled="saving">
      {{ saving ? '上传中…' : '上传瞬间' }}
    </button>
  </form>
  <p v-if="formError" class="page-tip error">{{ formError }}</p>

  <h3 class="section-title">瞬间列表</h3>
  <div class="filter-row">
    <AppSelect v-model="statusFilter" :options="STATUS_OPTIONS" compact />
    <AppSelect v-model="matchFilter" :options="matchOptions" compact />
  </div>

  <DataTable :columns="columns" :rows="rows" :row-actions="rowActions" @action="handleAction">
    <template #cell-preview="{ row }">
      <img v-if="row.preview" :src="String(row.preview)" class="thumb" alt="精彩瞬间预览" />
      <span v-else class="thumb-empty">无图</span>
    </template>
  </DataTable>
  <p v-if="!loading && !rows.length" class="empty-tip">暂无精彩瞬间，请上传第一张图片。</p>
  <p v-if="loading" class="page-tip">正在加载精彩瞬间…</p>
</template>

<style scoped>
.upload-form {
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

.field.narrow {
  flex: 0 0 140px;
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
  resize: vertical;
}

.file-input {
  padding: 7px 9px;
}

.filter-row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.thumb {
  width: 96px;
  height: 54px;
  object-fit: cover;
  border-radius: 6px;
  display: block;
}

.thumb-empty {
  font-size: 12px;
  color: var(--muted);
}

.empty-tip {
  padding: 16px 0;
  font-size: 13px;
  color: var(--muted);
  text-align: center;
}
</style>
