<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataForm from '../../components/common/DataForm.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'
import {
  createCoach,
  deleteCoach,
  errMsg,
  fetchCoaches,
  fetchMyTeam,
  updateCoach,
  type ApiCoach,
} from '../../api/team'

// 球队教练员管理：本队教练的报送/编辑/删除（后端校验只能操作本人球队），
// 新增教练注册状态为「待审核」，资质证书核验通过后生效。

const searchFields: SearchField[] = [
  { key: 'name', label: '姓名', placeholder: '输入教练姓名' },
  { key: 'status', label: '资质状态', type: 'select', options: ['已生效', '待审核', '已驳回'] },
]

const columns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '100px' },
  { key: 'gender', label: '性别', width: '70px' },
  { key: 'idCard', label: '身份证号', width: '180px' },
  { key: 'cert', label: '证书等级', width: '110px' },
  { key: 'phone', label: '联系电话', width: '140px' },
  { key: 'status', label: '状态', width: '100px' },
]

interface CoachRow {
  id: number | null
  name: string
  gender: string
  idCard: string
  cert: string
  phone: string
  status: string
}

const rows = ref<CoachRow[]>([])

const teamReady = ref(false)
const teamId = ref<number | null>(null)

async function refresh() {
  const team = await fetchMyTeam()
  if (!team) {
    teamReady.value = true
    return
  }
  teamId.value = team.id
  const list = await fetchCoaches({ team: team.id })
  if (list) {
    rows.value = list.map((c: ApiCoach) => ({
      id: c.id,
      name: c.name,
      gender: c.gender || '男',
      idCard: c.id_card,
      cert: c.cert_level || '—',
      phone: c.phone || '—',
      status: c.status_display,
    }))
  }
  teamReady.value = true
}

onMounted(refresh)

const filters = ref<Record<string, string>>({})
const filteredRows = computed(() =>
  rows.value.filter((r) => {
    if (filters.value.name && !r.name.includes(filters.value.name.trim())) return false
    if (filters.value.status && r.status !== filters.value.status) return false
    return true
  }),
)

function onSearch(f: Record<string, string>) {
  filters.value = f
}

// ---------- 报送/编辑教练 ----------

const formFields = [
  { key: 'name', label: '姓名' },
  { key: 'gender', label: '性别', type: 'select' as const, options: ['男', '女'] },
  { key: 'idCard', label: '身份证号', placeholder: '18 位' },
  { key: 'cert', label: '教练员证书等级', type: 'select' as const, options: ['亚足联A级', '亚足联B级', '亚足联C级', '亚足联D级', '中国足协E级', '其他'] },
  { key: 'phone', label: '联系电话' },
]

const editingId = ref<number | null>(null)
const editingLabel = ref('')
const formInitial = ref<Record<string, string>>({})

async function onSubmit(data: Record<string, string>) {
  const name = (data.name ?? '').trim()
  const idCard = (data.idCard ?? '').trim()
  if (!name || !idCard) {
    alert('请填写姓名和身份证号')
    return
  }
  if (!/^\d{17}[\dXx]$/.test(idCard)) {
    alert('身份证号应为 18 位（最后一位可为 X）')
    return
  }
  if (teamId.value === null) {
    alert('尚未创建球队：请先在「球队信息」页创建球队，再报送教练员')
    return
  }
  const payload = {
    team: teamId.value,
    name,
    gender: data.gender ?? '男',
    id_card: idCard,
    cert_level: data.cert ?? '',
    phone: (data.phone ?? '').trim(),
  }
  try {
    if (editingId.value) {
      await updateCoach(editingId.value, payload)
      editingId.value = null
      editingLabel.value = ''
      formInitial.value = {}
    } else {
      await createCoach(payload)
    }
    await refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

function startEdit(r: CoachRow) {
  if (r.id === null) {
    alert('数据未加载，请刷新后重试')
    return
  }
  editingId.value = r.id
  editingLabel.value = r.name
  formInitial.value = { name: r.name, gender: r.gender, idCard: r.idCard, cert: r.cert === '—' ? '其他' : r.cert, phone: r.phone === '—' ? '' : r.phone }
}

function cancelEdit() {
  editingId.value = null
  editingLabel.value = ''
  formInitial.value = {}
}

async function onAction(action: string, row: Record<string, unknown>) {
  const r = row as unknown as CoachRow
  if (action === '编辑') {
    startEdit(r)
    return
  }
  if (action === '删除') {
    if (r.id === null) {
      alert('数据未加载，请刷新后重试')
      return
    }
    if (!confirm(`确认删除教练员「${r.name}」的资料？`)) return
    try {
      await deleteCoach(r.id)
      if (editingId.value === r.id) cancelEdit()
      await refresh()
    } catch (err) {
      alert(errMsg(err))
    }
  }
}
</script>

<template>
  <PageHeader title="球队教练员" desc="查询、添加、编辑、删除球队教练员，可按姓名与资质状态筛选（数据来自后端）" />

  <p v-if="teamReady && teamId === null" class="page-tip warn-tip">
    尚未创建球队：请先在「球队信息」页创建球队，再报送教练员。
  </p>

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <h3 class="section-title">{{ editingId ? `编辑教练员：${editingLabel}` : '报送教练员' }}</h3>
  <DataForm
    :fields="formFields"
    :submit-text="editingId ? '保存修改' : '报送教练员'"
    :initial="formInitial"
    @submit="onSubmit"
  />
  <p v-if="editingId" class="edit-tip">
    正在编辑教练员资料，<a href="#" @click.prevent="cancelEdit">取消编辑</a>
  </p>

  <h3 class="section-title">教练员名单</h3>
  <DataTable :columns="columns" :rows="filteredRows" :actions="['编辑', '删除']" @action="onAction" />
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

.warn-tip {
  background: #fdf6ec;
  color: #8a6d3b;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
}
</style>
