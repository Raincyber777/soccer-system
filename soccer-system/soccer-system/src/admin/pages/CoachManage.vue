<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataForm from '../../components/common/DataForm.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'
import { errMsg, fetchCoaches, reviewPerson } from '../../api/person'
import { deleteCoach, updateCoach, type ApiCoach } from '../../api/team'

// 管理员教练员管理：搜索、注册审核（通过/驳回）、编辑、删除。
// 教练审核通过即进入公示名单（后端教练公示名单 = status 已生效），故无单独公示开关。

const CATEGORY_OPTIONS = ['专职教练员', '体育教师兼任', '社会足球从业者']

const searchFields: SearchField[] = [
  { key: 'name', label: '姓名', placeholder: '输入教练员姓名' },
  { key: 'category', label: '类别', type: 'select', options: CATEGORY_OPTIONS },
  { key: 'status', label: '审核状态', type: 'select', options: ['待审核', '已生效', '已驳回'] },
]

const columns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '100px' },
  { key: 'idCard', label: '身份证号', width: '170px' },
  { key: 'unit', label: '所属单位' },
  { key: 'category', label: '类别', width: '120px' },
  { key: 'certLevel', label: '等级', width: '110px' },
  { key: 'status', label: '状态', width: '100px' },
]

interface CoachRow {
  id: number | null
  name: string
  idCard: string
  unit: string
  category: string
  certLevel: string
  status: string
  gender: string
  phone: string
  years: string
}

const rows = ref<CoachRow[]>([])

async function refresh(params?: Record<string, string>) {
  const list = await fetchCoaches(params?.name ? { name: params.name.trim() } : undefined)
  if (!list) return
  let mapped: CoachRow[] = list.map((c: ApiCoach) => ({
    id: c.id,
    name: c.name,
    idCard: c.id_card,
    unit: c.team_name || c.unit_name || '—',
    category: c.category || '—',
    certLevel: c.cert_level || '—',
    status: c.status_display,
    gender: c.gender || '男',
    phone: c.phone || '',
    years: c.years != null ? String(c.years) : '',
  }))
  // 类别/状态为前端过滤（后端列表仅支持姓名检索）
  if (params?.category) mapped = mapped.filter((r) => r.category === params.category)
  if (params?.status) mapped = mapped.filter((r) => r.status === params.status)
  rows.value = mapped
}

onMounted(() => refresh())

function onSearch(filters: Record<string, string>) {
  refresh(filters)
}

// ---------- 编辑回填 ----------

const formFields = [
  { key: 'name', label: '姓名' },
  { key: 'gender', label: '性别', type: 'select' as const, options: ['男', '女'] },
  { key: 'phone', label: '联系电话' },
  { key: 'unit', label: '所属单位' },
  { key: 'category', label: '人员类别', type: 'select' as const, options: CATEGORY_OPTIONS },
  { key: 'certLevel', label: '教练员等级', placeholder: '如：亚足联C级' },
  { key: 'years', label: '执教年限', type: 'number' as const },
]

const editingId = ref<number | null>(null)
const editingLabel = ref('')
const formInitial = ref<Record<string, string>>({})

async function onSubmit(data: Record<string, string>) {
  if (editingId.value === null) return
  try {
    await updateCoach(editingId.value, {
      name: (data.name ?? '').trim(),
      gender: data.gender ?? '男',
      phone: (data.phone ?? '').trim(),
      unit_name: (data.unit ?? '').trim(),
      category: data.category ?? '',
      cert_level: (data.certLevel ?? '').trim(),
      years: (data.years ?? '').trim() ? Number(data.years) : null,
    })
    editingId.value = null
    editingLabel.value = ''
    formInitial.value = {}
    await refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onAction(action: string, row: Record<string, unknown>) {
  const r = row as unknown as CoachRow
  if (r.id === null) {
    alert('数据未加载，请刷新后重试')
    return
  }
  if (action === '编辑') {
    editingId.value = r.id
    editingLabel.value = r.name
    formInitial.value = { name: r.name, gender: r.gender, phone: r.phone, unit: r.unit, category: r.category, certLevel: r.certLevel, years: r.years }
    return
  }
  if (action === '通过' || action === '驳回') {
    if (r.status !== '待审核') {
      alert(`该教练员状态为「${r.status}」，无需审核`)
      return
    }
    if (action === '驳回' && !confirm(`确认驳回「${r.name}」的注册申请？`)) return
    try {
      await reviewPerson('coaches', r.id, action === '通过' ? 'approve' : 'reject')
      await refresh()
    } catch (err) {
      alert(errMsg(err))
    }
    return
  }
  if (action === '删除') {
    if (!confirm(`确认删除教练员「${r.name}」的资料？`)) return
    try {
      await deleteCoach(r.id)
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
  <PageHeader title="教练员管理" desc="搜索教练员信息，注册审核、编辑与删除；审核通过即进入公示名单" />

  <p class="page-tip">
    教练员由球队/单位报送，默认「待审核」；「通过」后即生效并出现在信息公示名单，无需单独公示开关。
  </p>

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <h3 v-if="editingId" class="section-title">编辑教练员：{{ editingLabel }}</h3>
  <DataForm v-if="editingId" :fields="formFields" submit-text="保存修改" :initial="formInitial" @submit="onSubmit" />

  <h3 class="section-title">教练员名单</h3>
  <DataTable :columns="columns" :rows="rows" :actions="['通过', '驳回', '编辑', '删除']" @action="onAction" />
</template>
