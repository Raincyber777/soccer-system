<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, TableColumn } from '../../components/common/types'
import { uploadCommonFile, errMsg } from '../../api/registration'
import {
  createPartner,
  deletePartner,
  fetchPartners,
  updatePartner,
  type ApiPartner,
} from '../../api/content'

// 合作方管理：增加/修改/删除合作方与官网链接，Logo 先经通用上传拿 URL 再写入。

interface PartnerRow {
  id: number
  name: string
  link: string
  logo: string
  status: string
  logoUrl: string
}

const formFields: FormField[] = [
  { key: 'name', label: '合作方名称', placeholder: '如：省足球协会' },
  { key: 'link', label: '官网链接', placeholder: 'https://...' },
  { key: 'sort', label: '排序值', placeholder: '数字越小越靠前，默认 0' },
]

const columns: TableColumn[] = [
  { key: 'name', label: '合作方名称' },
  { key: 'link', label: '官网链接' },
  { key: 'logo', label: 'Logo', width: '90px' },
  { key: 'status', label: '状态', width: '90px' },
]

const rows = ref<PartnerRow[]>([
  { id: 0, name: '省足球协会', link: 'https://fa.example.gov.cn', logo: '已上传', status: '已发布', logoUrl: '' },
  { id: 0, name: '省学生体育协会', link: 'https://sfa.example.gov.cn', logo: '已上传', status: '已发布', logoUrl: '' },
  { id: 0, name: '运动饮料品牌 X', link: 'https://brandx.example.com', logo: '未上传', status: '已下架', logoUrl: '' },
])

const editingId = ref<number | null>(null)
const formInitial = ref<Record<string, string>>({})
const formKey = ref(0)
const logo = ref('') // 已上传 Logo URL

async function refresh() {
  const list = await fetchPartners()
  if (!list) return // 后端不可用：保留演示数据
  rows.value = list.map((p: ApiPartner) => ({
    id: p.id,
    name: p.name,
    link: p.website_url || '—',
    logo: p.logo ? '已上传' : '未上传',
    status: p.is_active ? '已发布' : '已下架',
    logoUrl: p.logo,
  }))
}

onMounted(refresh)

async function onUpload(file: File) {
  try {
    const r = await uploadCommonFile(file, 'partner-logos')
    logo.value = r.url
    alert(`Logo 已上传：${r.url}\n点击下方保存后关联到该合作方`)
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onSubmit(data: Record<string, string>) {
  const name = data.name?.trim() ?? ''
  if (!name) {
    alert('请填写合作方名称')
    return
  }
  const payload = {
    name,
    website_url: data.link?.trim() ?? '',
    sort: Number(data.sort) || 0,
    logo: logo.value,
  }
  try {
    if (editingId.value) {
      await updatePartner(editingId.value, payload)
      alert('合作方已更新')
    } else {
      await createPartner(payload)
      alert('合作方已保存')
    }
    onCancelEdit()
    refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

function onEdit(row: PartnerRow) {
  editingId.value = row.id
  formInitial.value = {
    name: row.name,
    link: row.link === '—' ? '' : row.link,
  }
  logo.value = row.logoUrl
  formKey.value++
}

function onCancelEdit() {
  editingId.value = null
  formInitial.value = {}
  logo.value = ''
  formKey.value++
}

async function onToggle(row: PartnerRow) {
  try {
    await updatePartner(row.id, { is_active: row.status === '已下架' })
    refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onDelete(row: PartnerRow) {
  if (!confirm(`确定删除合作方「${row.name}」？`)) return
  try {
    await deletePartner(row.id)
    refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

function onAction(action: string, row: Record<string, unknown>) {
  const r = row as unknown as PartnerRow
  if (action === '修改') onEdit(r)
  else if (action === '启用/停用') onToggle(r)
  else if (action === '删除') onDelete(r)
}
</script>

<template>
  <PageHeader title="合作方管理" desc="维护赛事合作方信息与官网链接，门户底部展示" />

  <div class="partner-top">
    <div>
      <h3 class="section-title">{{ editingId ? '编辑合作方' : '增加合作方' }}</h3>
      <DataForm
        :key="formKey"
        :fields="formFields"
        :initial="formInitial"
        :submit-text="editingId ? '保存修改' : '增加合作方'"
        @submit="onSubmit"
      />
      <button v-if="editingId" type="button" class="btn btn-ghost" @click="onCancelEdit">取消编辑</button>
    </div>
    <UploadBlock
      title="上传合作方 Logo"
      desc="透明底 PNG 优先"
      accept=".jpg,.jpeg,.png"
      @select="onUpload"
    />
  </div>

  <h3 class="section-title">合作方列表</h3>
  <DataTable :columns="columns" :rows="rows" :actions="['启用/停用', '修改', '删除']" @action="onAction" />
</template>

<style scoped>
.partner-top {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 16px;
  align-items: stretch;
}

@media (max-width: 900px) {
  .partner-top {
    grid-template-columns: 1fr;
  }
}
</style>
