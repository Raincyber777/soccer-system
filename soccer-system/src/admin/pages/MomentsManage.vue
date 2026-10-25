<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, TableColumn } from '../../components/common/types'
import { fetchAdminMatches } from '../../api/manage'
import type { ApiMatch } from '../../api/types'
import { uploadCommonFile, errMsg } from '../../api/registration'
import {
  createHighlight,
  deleteHighlight,
  fetchHighlights,
  updateHighlight,
  type ApiHighlight,
} from '../../api/content'

// 精彩瞬间管理：发布比赛瞬间的图片/视频链接与说明，关联到具体场次。
// 图片先经通用上传拿 URL，再随表单写入 highlights。

interface HighlightRow {
  id: number
  title: string
  match: string
  image: string
  publishTime: string
  status: string
}

const columns: TableColumn[] = [
  { key: 'title', label: '标题' },
  { key: 'match', label: '所属比赛' },
  { key: 'image', label: '图片', width: '80px' },
  { key: 'publishTime', label: '发布时间', width: '160px' },
  { key: 'status', label: '状态', width: '90px' },
]

const rows = ref<HighlightRow[]>([])

const matches = ref<ApiMatch[]>([])
const rawList = ref<ApiHighlight[]>([]) // 原始数据：编辑回填用
const editingId = ref<number | null>(null)
const formInitial = ref<Record<string, string>>({})
const formKey = ref(0)
const image = ref('') // 已上传图片 URL

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
  { key: 'title', label: '瞬间标题', placeholder: '如：第 3 轮王小磊倒钩破门' },
  { key: 'match', label: '所属比赛', type: 'select', options: matchOptions.value, placeholder: '请选择场次' },
  { key: 'video', label: '视频链接', placeholder: '可留空；如发布视频瞬间填直播/回放地址' },
  { key: 'desc', label: '文字说明', type: 'textarea', placeholder: '展示在图片下方的说明文字' },
])

async function refresh() {
  const matchList = await fetchAdminMatches()
  if (matchList) matches.value = matchList
  const list = await fetchHighlights()
  if (!list) return
  rawList.value = list
  rows.value = list.map((h: ApiHighlight) => ({
    id: h.id,
    title: h.title,
    match: h.match_display || '—',
    image: h.image ? '有' : '无',
    publishTime: (h.published_at || h.created_at || '').slice(0, 16).replace('T', ' '),
    status: h.is_published ? '已发布' : '已下架',
  }))
}

onMounted(refresh)

async function onUpload(file: File) {
  try {
    const r = await uploadCommonFile(file, 'highlights')
    image.value = r.url
    alert(`图片已上传：${r.url}\n点击下方发布后关联到该瞬间`)
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onSubmit(data: Record<string, string>) {
  const title = data.title?.trim() ?? ''
  if (!title) {
    alert('请填写瞬间标题')
    return
  }
  const matchId = data.match ? matchIdByOption.value.get(data.match) : undefined
  if (data.match && !matchId) {
    alert('请从下拉中选择所属比赛')
    return
  }
  const payload = {
    title,
    match: matchId ?? null,
    video_url: data.video?.trim() ?? '',
    description: data.desc?.trim() ?? '',
    image: image.value,
  }
  try {
    if (editingId.value) {
      await updateHighlight(editingId.value, payload)
      alert('精彩瞬间已更新')
    } else {
      await createHighlight(payload)
      alert('精彩瞬间已发布')
    }
    onCancelEdit()
    refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

function onEdit(row: HighlightRow) {
  const src = rawList.value.find((h) => h.id === row.id)
  if (!src) return
  editingId.value = row.id
  const matchOpt = src.match ? matches.value.find((m) => m.id === src.match) : undefined
  formInitial.value = {
    title: src.title,
    ...(matchOpt
      ? { match: `${matchOpt.group_type_display} ${matchOpt.round_name}：${matchOpt.home_team_name} vs ${matchOpt.away_team_name}` }
      : {}),
    video: src.video_url,
    desc: src.description,
  }
  image.value = src.image
  formKey.value++
}

function onCancelEdit() {
  editingId.value = null
  formInitial.value = {}
  image.value = ''
  formKey.value++
}

async function onToggle(row: HighlightRow) {
  try {
    await updateHighlight(row.id, { is_published: row.status === '已下架' })
    refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onDelete(row: HighlightRow) {
  if (!confirm(`确定删除精彩瞬间「${row.title}」？`)) return
  try {
    await deleteHighlight(row.id)
    refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

function onAction(action: string, row: Record<string, unknown>) {
  const r = row as unknown as HighlightRow
  if (action === '修改') onEdit(r)
  else if (action === '发布/下架') onToggle(r)
  else if (action === '删除') onDelete(r)
}
</script>

<template>
  <PageHeader title="精彩瞬间管理" desc="发布比赛精彩瞬间图片与说明，门户首页展示" />

  <h3 class="section-title">{{ editingId ? '编辑精彩瞬间' : '发布精彩瞬间' }}</h3>
  <div class="moment-top">
    <DataForm
      :key="formKey"
      :fields="formFields"
      :initial="formInitial"
      :submit-text="editingId ? '保存修改' : '发布'"
      @submit="onSubmit"
    />
    <div>
      <UploadBlock
        title="上传瞬间图片"
        desc="JPG/PNG，单张不超过 10MB；视频瞬间可另填视频链接"
        accept=".jpg,.jpeg,.png"
        @select="onUpload"
      />
      <p v-if="image" class="image-hint">已选图片：{{ image }}</p>
      <button v-if="editingId" type="button" class="btn btn-ghost cancel-btn" @click="onCancelEdit">取消编辑</button>
    </div>
  </div>

  <h3 class="section-title">已发布的精彩瞬间</h3>
  <DataTable :columns="columns" :rows="rows" :actions="['发布/下架', '修改', '删除']" @action="onAction" />
</template>

<style scoped>
.moment-top {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 16px;
  align-items: start;
}

.image-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--muted);
  word-break: break-all;
}

.cancel-btn {
  margin-top: 8px;
}

@media (max-width: 900px) {
  .moment-top {
    grid-template-columns: 1fr;
  }
}
</style>
