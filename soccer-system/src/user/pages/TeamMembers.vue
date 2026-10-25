<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataForm from '../../components/common/DataForm.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'
import {
  createPlayer,
  deletePlayer,
  errMsg,
  fetchMyTeam,
  fetchPlayers,
  updatePlayer,
  type ApiPlayer,
} from '../../api/team'

// 球队成员管理：本队球员的报送/编辑/删除（后端校验只能操作本人球队），
// 新增球员注册状态为「待审核」，由市州管理员核验学籍后生效。

const searchFields: SearchField[] = [
  { key: 'name', label: '姓名', placeholder: '输入球员姓名' },
  { key: 'idCard', label: '身份证号', placeholder: '输入身份证号' },
]

const columns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '100px' },
  { key: 'idCard', label: '身份证号', width: '180px' },
  { key: 'birth', label: '出生日期', width: '120px' },
  { key: 'position', label: '场上位置', width: '100px' },
  { key: 'number', label: '球衣号', width: '80px' },
  { key: 'photo', label: '照片', width: '90px' },
  { key: 'status', label: '状态', width: '100px' },
]

interface MemberRow {
  id: number | null
  name: string
  idCard: string
  birth: string
  position: string
  number: string
  photo: string
  status: string
  gender: string
  grade: string
}

const rows = ref<MemberRow[]>([])

const teamReady = ref(false)
const teamId = ref<number | null>(null)

async function refresh() {
  const team = await fetchMyTeam()
  if (!team) {
    teamReady.value = true // 后端在线但没有球队：提示先建队
    return
  }
  teamId.value = team.id
  const list = await fetchPlayers({ team: team.id })
  if (list) {
    rows.value = list.map((p: ApiPlayer) => ({
      id: p.id,
      name: p.name,
      idCard: p.id_card,
      birth: p.birth_date || '—',
      position: p.position || '—',
      number: p.jersey_number != null ? String(p.jersey_number) : '—',
      photo: p.photo_url ? '已上传' : '未上传',
      status: p.status_display,
      gender: p.gender || '男',
      grade: p.grade || '',
    }))
  }
  teamReady.value = true
}

onMounted(refresh)

const filters = ref<Record<string, string>>({})
const filteredRows = computed(() =>
  rows.value.filter((r) => {
    if (filters.value.name && !r.name.includes(filters.value.name.trim())) return false
    if (filters.value.idCard && !r.idCard.includes(filters.value.idCard.trim())) return false
    return true
  }),
)

function onSearch(f: Record<string, string>) {
  filters.value = f
}

// ---------- 报送/编辑球员 ----------

const formFields = [
  { key: 'name', label: '姓名' },
  { key: 'gender', label: '性别', type: 'select' as const, options: ['男', '女'] },
  { key: 'birth', label: '出生日期', type: 'date' as const },
  { key: 'idCard', label: '身份证号', placeholder: '18 位，用于学籍核验' },
  { key: 'position', label: '场上位置', type: 'select' as const, options: ['前锋', '中场', '后卫', '守门员'] },
  { key: 'number', label: '球衣号码', type: 'number' as const, placeholder: '1-99，可留空' },
  { key: 'grade', label: '年级', placeholder: '如：初二' },
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
    alert('尚未创建球队：请先在「球队信息」页创建球队，再报送球员')
    return
  }
  const jersey = (data.number ?? '').trim()
  const payload = {
    team: teamId.value,
    name,
    gender: data.gender ?? '男',
    birth_date: (data.birth ?? '').trim() || undefined,
    id_card: idCard,
    grade: (data.grade ?? '').trim(),
    position: data.position ?? '',
    jersey_number: jersey ? Number(jersey) : undefined,
  }
  try {
    if (editingId.value) {
      await updatePlayer(editingId.value, payload)
      editingId.value = null
      editingLabel.value = ''
      formInitial.value = {}
    } else {
      await createPlayer(payload)
    }
    await refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

function startEdit(r: MemberRow) {
  if (r.id === null) {
    alert('数据未加载，请刷新后重试')
    return
  }
  editingId.value = r.id
  editingLabel.value = r.name
  formInitial.value = {
    name: r.name,
    gender: r.gender,
    birth: r.birth === '—' ? '' : r.birth,
    idCard: r.idCard,
    position: r.position === '—' ? '前锋' : r.position,
    number: r.number === '—' ? '' : r.number,
    grade: r.grade,
  }
}

function cancelEdit() {
  editingId.value = null
  editingLabel.value = ''
  formInitial.value = {}
}

async function onAction(action: string, row: Record<string, unknown>) {
  const r = row as unknown as MemberRow
  if (action === '编辑') {
    startEdit(r)
    return
  }
  if (action === '删除') {
    if (r.id === null) {
      alert('数据未加载，请刷新后重试')
      return
    }
    if (!confirm(`确认删除球员「${r.name}」的资料？`)) return
    try {
      await deletePlayer(r.id)
      if (editingId.value === r.id) cancelEdit()
      await refresh()
    } catch (err) {
      alert(errMsg(err))
    }
  }
}

function onUpload() {
  alert('球员照片批量上传将在后续批次接入（需后端文件上传接口）')
}
</script>

<template>
  <PageHeader title="球队成员" desc="添加、修改、删除球队成员信息，支持按姓名或身份证搜索（数据来自后端）" />

  <p v-if="teamReady && teamId === null" class="page-tip warn-tip">
    尚未创建球队：请先在「球队信息」页创建球队，再报送球员。
  </p>

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <h3 class="section-title">{{ editingId ? `编辑球员：${editingLabel}` : '报送球员' }}</h3>
  <DataForm
    :fields="formFields"
    :submit-text="editingId ? '保存修改' : '报送球员'"
    :initial="formInitial"
    @submit="onSubmit"
  />
  <p v-if="editingId" class="edit-tip">
    正在编辑球员资料，<a href="#" @click.prevent="cancelEdit">取消编辑</a>
  </p>

  <h3 class="section-title">球员名单</h3>
  <DataTable :columns="columns" :rows="filteredRows" :actions="['编辑', '删除']" @action="onAction" />

  <h3 class="section-title">球员照片批量上传</h3>
  <div class="upload-grid">
    <div class="card">
      <p class="upload-title">球员照片包（zip）</p>
      <p class="upload-desc">按「姓名+身份证号」命名后打包上传，用于参赛证件制作</p>
      <button type="button" class="btn btn-ghost" @click="onUpload">选择文件</button>
    </div>
  </div>
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

.upload-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--green-dark);
}

.upload-desc {
  font-size: 12px;
  color: var(--muted);
  margin: 6px 0 12px;
}
</style>
