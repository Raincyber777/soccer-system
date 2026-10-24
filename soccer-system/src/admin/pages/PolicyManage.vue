<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, TableColumn } from '../../components/common/types'
import { useAuth } from '../../stores/auth'
import {
  createPolicy,
  deletePolicy,
  errMsg,
  fetchAdminPolicies,
  updatePolicy,
  type PolicyPayload,
} from '../../api/manage'

// 赛事政策发布管理：列表/新增/编辑/下架重新发布/删除全部走后端，读失败回退演示数据
const auth = useAuth()

const formFields: FormField[] = [
  { key: 'title', label: '政策标题', placeholder: '如：省级青少年足球赛事参赛资格管理办法' },
  { key: 'org', label: '发文单位', placeholder: '如：四川省教育厅' },
  { key: 'content', label: '政策内容', type: 'textarea', placeholder: '政策全文（HTML），门户弹窗全文展示' },
]

const columns: TableColumn[] = [
  { key: 'title', label: '政策标题' },
  { key: 'org', label: '发文单位', width: '140px' },
  { key: 'publishTime', label: '发布时间', width: '160px' },
  { key: 'status', label: '状态', width: '90px' },
]

interface PolicyRow {
  id: number | null
  title: string
  org: string
  publishTime: string
  status: string
  content: string
}

const rows = ref<PolicyRow[]>([
  { id: null, title: '省级青少年足球赛事参赛资格管理办法（试行）', org: '省教育厅', publishTime: '2026-09-01 10:00', status: '已发布', content: '' },
  { id: null, title: '关于规范校园足球运动员学籍审核的通知', org: '省教育厅', publishTime: '2026-09-10 15:40', status: '已发布', content: '' },
])

const editingId = ref<number | null>(null)
const editingLabel = ref('')
const formInitial = ref<Record<string, string>>({})

function makeSummary(content: string): string {
  return content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 80)
}

async function refresh() {
  const list = await fetchAdminPolicies()
  if (!list) return // 后端不可用：保留演示数据
  rows.value = list.map((p) => ({
    id: p.id,
    title: p.title,
    org: p.issuing_org || '省教育厅',
    publishTime: (p.published_at || p.created_at).slice(0, 16),
    status: p.is_published ? '已发布' : '已下架',
    content: p.content,
  }))
}

onMounted(refresh)

async function onSubmit(data: Record<string, string>) {
  const title = data.title ?? ''
  const content = data.content ?? ''
  const org = data.org ?? ''
  if (!title.trim() || !content.trim()) {
    alert('请填写政策标题和内容')
    return
  }
  const payload: PolicyPayload = {
    title: title.trim(),
    summary: makeSummary(content),
    content,
    // 发文单位缺省用登录机构
    issuing_org: org.trim() || auth.state.staffLabel.split(' · ')[1] || '四川省教育厅',
    is_published: true,
  }
  try {
    if (editingId.value) {
      await updatePolicy(editingId.value, payload)
      editingId.value = null
      editingLabel.value = ''
      formInitial.value = {}
    } else {
      await createPolicy(payload)
    }
    await refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

function startEdit(row: PolicyRow) {
  if (row.id === null) {
    alert('当前为离线演示数据，无法编辑')
    return
  }
  editingId.value = row.id
  editingLabel.value = row.title
  formInitial.value = { title: row.title, org: row.org, content: row.content }
}

function cancelEdit() {
  editingId.value = null
  editingLabel.value = ''
  formInitial.value = {}
}

async function onAction(action: string, row: Record<string, unknown>) {
  const r = row as unknown as PolicyRow
  if (action === '查看') {
    alert(`${r.title}\n\n${r.content ? r.content.replace(/<[^>]+>/g, '').slice(0, 200) : '（离线演示数据，无正文）'}`)
    return
  }
  if (action === '修改') {
    startEdit(r)
    return
  }
  if (action === '下架/发布') {
    if (r.id === null) {
      alert('当前为离线演示数据，无法操作')
      return
    }
    try {
      await updatePolicy(r.id, { is_published: r.status !== '已发布' })
      await refresh()
    } catch (err) {
      alert(errMsg(err))
    }
    return
  }
  if (action === '删除') {
    if (r.id === null) {
      alert('当前为离线演示数据，无法操作')
      return
    }
    if (!confirm(`确认删除政策「${r.title}」？删除后不可恢复`)) return
    try {
      await deletePolicy(r.id)
      if (editingId.value === r.id) cancelEdit()
      await refresh()
    } catch (err) {
      alert(errMsg(err))
    }
  }
}
</script>

<template>
  <PageHeader title="赛事政策管理" desc="发布、修改、删除赛事相关政策文件（数据来自后端）" />

  <h3 class="section-title">{{ editingId ? `编辑政策：${editingLabel}` : '发布政策' }}</h3>
  <DataForm
    :fields="formFields"
    :submit-text="editingId ? '保存修改' : '发布政策'"
    :initial="formInitial"
    @submit="onSubmit"
  />
  <p v-if="editingId" class="edit-tip">
    正在编辑已有政策，<a href="#" @click.prevent="cancelEdit">取消编辑</a>
  </p>

  <h3 class="section-title">政策列表</h3>
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
