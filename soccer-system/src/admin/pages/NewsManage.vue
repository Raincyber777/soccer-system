<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, TableColumn } from '../../components/common/types'
import { useAuth } from '../../stores/auth'
import {
  createNews,
  deleteNews,
  errMsg,
  fetchAdminNews,
  updateNews,
  type NewsPayload,
} from '../../api/manage'

// 赛事新闻发布管理：列表/新增/编辑/下架重新发布/删除全部走后端，读失败展示空态
const auth = useAuth()

const formFields: FormField[] = [
  { key: 'title', label: '新闻标题', placeholder: '如：秋季联赛第三轮战报' },
  { key: 'category', label: '新闻类别', type: 'select', options: ['赛事动态', '战报', '通知公告'] },
  { key: 'content', label: '新闻正文', type: 'textarea', placeholder: '支持图文混排（HTML），门户弹窗全文展示' },
]

const columns: TableColumn[] = [
  { key: 'title', label: '标题' },
  { key: 'category', label: '类别', width: '100px' },
  { key: 'source', label: '来源', width: '150px' },
  { key: 'publishTime', label: '发布时间', width: '160px' },
  { key: 'status', label: '状态', width: '90px' },
]

// 表单类别（中文）→ 后端 category 枚举
const CATEGORY_TO_API: Record<string, NewsPayload['category']> = {
  赛事动态: 'news',
  战报: 'report',
  通知公告: 'announcement',
}
const CATEGORY_FROM_API: Record<string, string> = {
  news: '赛事动态',
  report: '战报',
  announcement: '通知公告',
}

interface NewsRow {
  id: number | null
  title: string
  category: string
  source: string
  publishTime: string
  status: string
  content: string
}

const rows = ref<NewsRow[]>([])

const editingId = ref<number | null>(null)
const editingLabel = ref('')
const formInitial = ref<Record<string, string>>({})

/** 正文去 HTML 标签后截取作摘要（后端 summary 用于门户列表页） */
function makeSummary(content: string): string {
  return content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 80)
}

async function refresh() {
  const list = await fetchAdminNews()
  if (!list) return
  rows.value = list.map((n) => ({
    id: n.id,
    title: n.title,
    category: n.category_display,
    source: n.source || n.created_by_name || '—',
    publishTime: (n.published_at || n.created_at).slice(0, 16),
    status: n.is_published ? '已发布' : '已下架',
    content: n.content,
  }))
}

onMounted(refresh)

async function onSubmit(data: Record<string, string>) {
  const title = data.title ?? ''
  const content = data.content ?? ''
  if (!title.trim() || !content.trim()) {
    alert('请填写新闻标题和正文')
    return
  }
  // 来源取登录机构（顶栏身份「角色 · 单位」的第二段），门户新闻会展示
  const source = auth.state.staffLabel.split(' · ')[1] || '赛事组委会'
  const payload: NewsPayload = {
    title: title.trim(),
    summary: makeSummary(content),
    content,
    category: CATEGORY_TO_API[data.category ?? ''] ?? 'news',
    source,
    is_published: true,
  }
  try {
    if (editingId.value) {
      await updateNews(editingId.value, payload)
      editingId.value = null
      editingLabel.value = ''
      formInitial.value = {}
    } else {
      await createNews(payload)
    }
    await refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

function startEdit(row: NewsRow) {
  if (row.id === null) {
    alert('数据未加载，请刷新后重试')
    return
  }
  editingId.value = row.id
  editingLabel.value = row.title
  formInitial.value = { title: row.title, category: CATEGORY_FROM_API[row.category] ?? '赛事动态', content: row.content }
}

function cancelEdit() {
  editingId.value = null
  editingLabel.value = ''
  formInitial.value = {}
}

async function onAction(action: string, row: Record<string, unknown>) {
  const r = row as unknown as NewsRow
  if (action === '查看') {
    alert(`${r.title}\n\n${r.content ? r.content.replace(/<[^>]+>/g, '').slice(0, 200) : '（无正文）'}`)
    return
  }
  if (action === '修改') {
    startEdit(r)
    return
  }
  if (action === '下架/发布') {
    if (r.id === null) {
      alert('数据未加载，请刷新后重试')
      return
    }
    try {
      await updateNews(r.id, { is_published: r.status !== '已发布' })
      await refresh()
    } catch (err) {
      alert(errMsg(err))
    }
    return
  }
  if (action === '删除') {
    if (r.id === null) {
      alert('数据未加载，请刷新后重试')
      return
    }
    if (!confirm(`确认删除新闻「${r.title}」？删除后不可恢复`)) return
    try {
      await deleteNews(r.id)
      if (editingId.value === r.id) cancelEdit()
      await refresh()
    } catch (err) {
      alert(errMsg(err))
    }
  }
}
</script>

<template>
  <PageHeader title="赛事新闻管理" desc="发布、修改、下架赛事新闻，门户首页同步展示" />

  <h3 class="section-title">{{ editingId ? `编辑新闻：${editingLabel}` : '发布新闻' }}</h3>
  <DataForm
    :fields="formFields"
    :submit-text="editingId ? '保存修改' : '发布新闻'"
    :initial="formInitial"
    @submit="onSubmit"
  />
  <p v-if="editingId" class="edit-tip">
    正在编辑已有新闻，<a href="#" @click.prevent="cancelEdit">取消编辑</a>
  </p>

  <h3 class="section-title">新闻列表</h3>
  <DataTable :columns="columns" :rows="rows" :actions="['查看', '修改', '下架/发布', '删除']" @action="onAction" />
</template>

<style scoped>
.edit-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--muted);
}

.edit-tip a {
  color: var(--green-dark);
}
</style>
