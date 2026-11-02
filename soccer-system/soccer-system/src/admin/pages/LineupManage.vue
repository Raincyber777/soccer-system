<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataForm from '../../components/common/DataForm.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { FormField, SearchField, TableColumn } from '../../components/common/types'
import { errMsg } from '../../api/registration'
import {
  createBestLineup,
  deleteBestLineup,
  fetchBestLineups,
  updateBestLineup,
  type ApiBestLineup,
  type BestLineupPlayerInput,
} from '../../api/content'

// 最佳阵容管理：按场次/组别发布阵容，球员明细以「姓名,球队,位置」逐行录入。
// 明细数组随表单整体提交，发布状态可随时切换。

const GROUP_TO_API: Record<string, string> = {
  小学组: 'primary',
  中学组: 'middle',
  高中组: 'high',
  高校组: 'university',
}

interface LineupRow {
  id: number
  title: string
  group: string
  groupKey: string
  formation: string
  playerCount: number
  status: string
  players: { name: string; team_name: string; position: string }[]
  description: string
  matchId: number | null
}

const searchFields: SearchField[] = [
  { key: 'group', label: '赛事类别', type: 'select', options: ['全部', '小学组', '中学组', '高中组', '高校组'] },
  { key: 'keyword', label: '标题', placeholder: '按阵容标题搜索' },
]

const columns: TableColumn[] = [
  { key: 'title', label: '阵容标题' },
  { key: 'group', label: '赛事类别', width: '100px' },
  { key: 'formation', label: '阵型', width: '90px' },
  { key: 'playerCount', label: '入选人数', width: '90px' },
  { key: 'status', label: '状态', width: '90px' },
]

const rows = ref<LineupRow[]>([])

const filters = ref<Record<string, string>>({})
const displayRows = computed(() =>
  rows.value.filter((r) => {
    if (filters.value.group && filters.value.group !== '全部' && r.group !== filters.value.group) return false
    if (filters.value.keyword && !r.title.includes(filters.value.keyword.trim())) return false
    return true
  }),
)

const showForm = ref(false)
const editingId = ref<number | null>(null)
const formInitial = ref<Record<string, string>>({})
const formKey = ref(0)

const formFields: FormField[] = [
  { key: 'title', label: '阵容标题', placeholder: '如：中学组 第 3 轮最佳阵容' },
  { key: 'group', label: '赛事类别', type: 'select', options: ['小学组', '中学组', '高中组', '高校组'], placeholder: '请选择组别' },
  { key: 'formation', label: '阵型', placeholder: '如：4-3-3' },
  { key: 'desc', label: '阵容说明', type: 'textarea', placeholder: '展示在阵容下方的说明文字' },
  {
    key: 'players',
    label: '入选球员',
    type: 'textarea',
    placeholder: '每行一位球员：姓名,球队,位置\n如：王小磊,实验中学足球队,前锋',
  },
]

async function refresh() {
  const list = await fetchBestLineups()
  if (!list) return
  rows.value = list.map((l: ApiBestLineup) => ({
    id: l.id,
    title: l.title,
    group: l.group_type_display || '—',
    groupKey: l.group_type,
    formation: l.formation || '—',
    playerCount: l.players.length,
    status: l.is_published ? '已发布' : '未发布',
    players: l.players.map((p) => ({ name: p.name, team_name: p.team_name, position: p.position })),
    description: l.description,
    matchId: l.match,
  }))
}

onMounted(refresh)

function onSearch(f: Record<string, string>) {
  filters.value = f
}

/** 解析「姓名,球队,位置」逐行输入为明细数组 */
function parsePlayers(text: string): BestLineupPlayerInput[] | null {
  const list = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = '', team = '', position = ''] = line.split(/[,，]/).map((s) => s.trim())
      return { name, team_name: team, position }
    })
  if (list.some((p) => !p.name)) return null
  return list
}

async function onSubmit(data: Record<string, string>) {
  const title = data.title?.trim() ?? ''
  if (!title) {
    alert('请填写阵容标题')
    return
  }
  if (!data.group) {
    alert('请选择赛事类别')
    return
  }
  const players = parsePlayers(data.players ?? '')
  if (players === null) {
    alert('入选球员格式有误：每行「姓名,球队,位置」，姓名必填')
    return
  }
  const payload = {
    title,
    group_type: GROUP_TO_API[data.group] ?? 'primary',
    formation: data.formation?.trim() ?? '',
    description: data.desc?.trim() ?? '',
    ...(editingId.value ? (players.length ? { players } : {}) : { players }),
  }
  try {
    if (editingId.value) {
      await updateBestLineup(editingId.value, payload)
      alert('最佳阵容已更新')
    } else {
      await createBestLineup(payload)
      alert('最佳阵容已创建并发布')
    }
    showForm.value = false
    editingId.value = null
    formInitial.value = {}
    formKey.value++
    refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

function onStartCreate() {
  editingId.value = null
  formInitial.value = {}
  showForm.value = true
  formKey.value++
}

function onEdit(row: LineupRow) {
  editingId.value = row.id
  formInitial.value = {
    title: row.title,
    group: row.group === '—' ? '' : row.group,
    formation: row.formation === '—' ? '' : row.formation,
    desc: row.description,
    players: row.players.map((p) => [p.name, p.team_name, p.position].filter(Boolean).join(',')).join('\n'),
  }
  showForm.value = true
  formKey.value++
}

async function onToggle(row: LineupRow) {
  try {
    await updateBestLineup(row.id, { title: row.title, group_type: row.groupKey, is_published: row.status === '未发布' })
    refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onDelete(row: LineupRow) {
  if (!confirm(`确定删除最佳阵容「${row.title}」？`)) return
  try {
    await deleteBestLineup(row.id)
    refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

function onAction(action: string, row: Record<string, unknown>) {
  const r = row as unknown as LineupRow
  if (action === '查看') {
    const list = r.players.map((p) => `${p.name}（${p.team_name}${p.position ? ' · ' + p.position : ''}）`)
    alert(
      `「${r.title}」入选 ${r.playerCount} 人${r.description ? '\n说明：' + r.description : ''}` +
        (list.length ? '\n' + list.join('\n') : '\n（暂无球员明细）'),
    )
  } else if (action === '发布/下架') onToggle(r)
  else if (action === '修改') onEdit(r)
  else if (action === '删除') onDelete(r)
}

function onCancelEdit() {
  showForm.value = false
  editingId.value = null
  formInitial.value = {}
  formKey.value++
}
</script>

<template>
  <PageHeader title="最佳阵容管理" desc="按轮次发布每轮最佳阵容，可按赛事类别搜索" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <DataTable
    :columns="columns"
    :rows="displayRows"
    :actions="['查看', '发布/下架', '修改', '删除']"
    @action="onAction"
  />

  <div class="add-row">
    <button v-if="!showForm" type="button" class="btn btn-primary" @click="onStartCreate">＋ 新增最佳阵容</button>
  </div>

  <template v-if="showForm">
    <h3 class="section-title">{{ editingId ? '编辑最佳阵容' : '新增最佳阵容' }}</h3>
    <DataForm
      :key="formKey"
      :fields="formFields"
      :initial="formInitial"
      :submit-text="editingId ? '保存修改' : '创建并发布'"
      @submit="onSubmit"
    />
    <button type="button" class="btn btn-ghost" @click="onCancelEdit">取消</button>
  </template>
</template>

<style scoped>
.add-row {
  margin-top: 16px;
}
</style>
