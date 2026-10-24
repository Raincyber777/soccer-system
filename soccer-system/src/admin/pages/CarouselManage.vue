<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, TableColumn } from '../../components/common/types'
import { uploadCommonFile, errMsg } from '../../api/registration'
import {
  createBanner,
  deleteBanner,
  fetchBanners,
  updateBanner,
  type ApiBanner,
} from '../../api/content'

// 轮播图管理：图片先经通用上传拿 URL，再随表单写入 banners。
// 支持发布/下架切换、修改、删除；后端按 sort 排序展示。

interface BannerRow {
  id: number
  title: string
  link: string
  sort: number
  status: string
  image: string
}

const columns: TableColumn[] = [
  { key: 'title', label: '图片标题' },
  { key: 'link', label: '跳转链接' },
  { key: 'sort', label: '排序', width: '80px' },
  { key: 'status', label: '状态', width: '90px' },
]

const rows = ref<BannerRow[]>([
  { id: 0, title: '秋季联赛开幕图', link: 'https://portal.example.com/news/101', sort: 1, status: '已发布', image: '' },
  { id: 0, title: '最佳阵容第一期', link: 'https://portal.example.com/news/102', sort: 2, status: '已发布', image: '' },
  { id: 0, title: '联赛赞助商联合海报', link: '', sort: 3, status: '已下架', image: '' },
])

const editingId = ref<number | null>(null)
const formInitial = ref<Record<string, string>>({})
const formKey = ref(0) // 重置 DataForm 输入
const image = ref('') // 已上传图片 URL

const formFields: FormField[] = [
  { key: 'title', label: '图片标题', placeholder: '如：秋季联赛开幕图' },
  { key: 'link', label: '跳转链接', placeholder: 'https://...（可留空）' },
  { key: 'sort', label: '排序值', placeholder: '数字越小越靠前，默认 0' },
]

async function refresh() {
  const list = await fetchBanners()
  if (!list) return // 后端不可用：保留演示数据
  rows.value = list.map((b: ApiBanner) => ({
    id: b.id,
    title: b.title || '未命名轮播图',
    link: b.link_url || '—',
    sort: b.sort,
    status: b.is_active ? '已发布' : '已下架',
    image: b.image,
  }))
}

onMounted(refresh)

async function onUpload(file: File) {
  try {
    const r = await uploadCommonFile(file, 'banners')
    image.value = r.url
    alert(`图片已上传：${r.url}\n点击下方保存后关联到该轮播图`)
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onSubmit(data: Record<string, string>) {
  const title = data.title?.trim() ?? ''
  if (!title) {
    alert('请填写图片标题')
    return
  }
  const payload = {
    title,
    link_url: data.link?.trim() ?? '',
    sort: Number(data.sort) || 0,
    image: image.value,
  }
  try {
    if (editingId.value) {
      await updateBanner(editingId.value, payload)
      alert('轮播图已更新')
    } else {
      await createBanner(payload)
      alert('轮播图已发布')
    }
    onCancelEdit()
    refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

function onEdit(row: BannerRow) {
  editingId.value = row.id
  formInitial.value = {
    title: row.title === '未命名轮播图' ? '' : row.title,
    link: row.link === '—' ? '' : row.link,
    sort: String(row.sort),
  }
  image.value = row.image
  formKey.value++
}

function onCancelEdit() {
  editingId.value = null
  formInitial.value = {}
  image.value = ''
  formKey.value++
}

async function onToggle(row: BannerRow) {
  try {
    await updateBanner(row.id, { is_active: row.status === '已下架' })
    refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onDelete(row: BannerRow) {
  if (!confirm(`确定删除轮播图「${row.title}」？`)) return
  try {
    await deleteBanner(row.id)
    refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

function onAction(action: string, row: Record<string, unknown>) {
  const r = row as unknown as BannerRow
  if (action === '修改') onEdit(r)
  else if (action === '发布/下架') onToggle(r)
  else if (action === '删除') onDelete(r)
}
</script>

<template>
  <PageHeader title="轮播图管理" desc="管理门户首页轮播图与新闻跳转链接图片" />

  <h3 class="section-title">{{ editingId ? '编辑轮播图' : '上传轮播图' }}</h3>
  <div class="banner-top">
    <DataForm
      :key="formKey"
      :fields="formFields"
      :initial="formInitial"
      :submit-text="editingId ? '保存修改' : '发布轮播图'"
      @submit="onSubmit"
    />
    <div>
      <UploadBlock
        title="上传轮播图片"
        desc="建议尺寸 1920×500，JPG/PNG"
        accept=".jpg,.jpeg,.png"
        @select="onUpload"
      />
      <p v-if="image" class="image-hint">已选图片：{{ image }}</p>
      <button v-if="editingId" type="button" class="btn btn-ghost cancel-btn" @click="onCancelEdit">取消编辑</button>
    </div>
  </div>

  <h3 class="section-title">轮播图列表</h3>
  <DataTable :columns="columns" :rows="rows" :actions="['发布/下架', '修改', '删除']" @action="onAction" />
</template>

<style scoped>
.banner-top {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 16px;
  align-items: stretch;
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
  .banner-top {
    grid-template-columns: 1fr;
  }
}
</style>
