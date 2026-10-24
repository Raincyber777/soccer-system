<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataForm from '../../components/common/DataForm.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { SearchField, TableColumn } from '../../components/common/types'
import { errMsg, fetchPlayers, reviewPerson, setPersonActive } from '../../api/person'
import { deletePlayer, updatePlayer, type ApiPlayer } from '../../api/team'

// 管理员球员管理：搜索、注册审核（通过/驳回）、公示切换、编辑、删除。
// 新报送球员为「待审核」，核验学籍后置为已生效才进入公示名单。

const searchFields: SearchField[] = [
  { key: 'name', label: '姓名', placeholder: '输入球员姓名' },
  { key: 'idCard', label: '身份证号', placeholder: '输入身份证号' },
]

const columns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '100px' },
  { key: 'idCard', label: '身份证号', width: '170px' },
  { key: 'team', label: '所属球队' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'status', label: '注册状态', width: '100px' },
  { key: 'public', label: '公示', width: '90px' },
]

interface PlayerRow {
  id: number | null
  name: string
  idCard: string
  team: string
  group: string
  status: string
  public: string
  gender: string
  birth: string
  position: string
  number: string
  grade: string
  isActive: boolean
}

const rows = ref<PlayerRow[]>([
  { id: null, name: '王小磊', idCard: '5101**********0011', team: '实验中学足球队', group: '中学组', status: '已生效', public: '已公示', gender: '男', birth: '2011-03-12', position: '前锋', number: '9', grade: '初二', isActive: true },
  { id: null, name: '陈昊', idCard: '5101**********0033', team: '实验中学足球队', group: '中学组', status: '待审核', public: '未公示', gender: '男', birth: '2010-11-08', position: '守门员', number: '1', grade: '初三', isActive: false },
])

async function refresh(params?: Record<string, string>) {
  const query: Record<string, unknown> = {}
  if (params?.name) query.name = params.name.trim()
  if (params?.idCard) query.id_card = params.idCard.trim()
  const list = await fetchPlayers(query)
  if (!list) return // 后端不可用：保留演示数据
  rows.value = list.map((p: ApiPlayer) => ({
    id: p.id,
    name: p.name,
    idCard: p.id_card,
    team: p.team_name,
    group: p.group_type_display,
    status: p.status_display,
    public: p.is_active ? '已公示' : '未公示',
    gender: p.gender || '男',
    birth: p.birth_date || '',
    position: p.position || '',
    number: p.jersey_number != null ? String(p.jersey_number) : '',
    grade: p.grade || '',
    isActive: !!p.is_active,
  }))
}

onMounted(() => refresh())

function onSearch(filters: Record<string, string>) {
  refresh(filters)
}

// ---------- 编辑回填 ----------

const formFields = [
  { key: 'name', label: '姓名' },
  { key: 'gender', label: '性别', type: 'select' as const, options: ['男', '女'] },
  { key: 'position', label: '场上位置', type: 'select' as const, options: ['前锋', '中场', '后卫', '守门员'] },
  { key: 'number', label: '球衣号码', type: 'number' as const },
  { key: 'grade', label: '年级' },
]

const editingId = ref<number | null>(null)
const editingLabel = ref('')
const formInitial = ref<Record<string, string>>({})

async function onSubmit(data: Record<string, string>) {
  if (editingId.value === null) return
  try {
    await updatePlayer(editingId.value, {
      name: (data.name ?? '').trim(),
      gender: data.gender ?? '男',
      position: data.position ?? '',
      jersey_number: (data.number ?? '').trim() ? Number(data.number) : undefined,
      grade: (data.grade ?? '').trim(),
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
  const r = row as unknown as PlayerRow
  if (r.id === null) {
    alert('当前为离线演示数据，无法操作')
    return
  }
  if (action === '编辑') {
    editingId.value = r.id
    editingLabel.value = r.name
    formInitial.value = { name: r.name, gender: r.gender, position: r.position || '前锋', number: r.number, grade: r.grade }
    return
  }
  if (action === '通过' || action === '驳回') {
    if (r.status !== '待审核') {
      alert(`该球员注册状态为「${r.status}」，无需审核`)
      return
    }
    if (action === '驳回' && !confirm(`确认驳回「${r.name}」的注册申请？驳回后球队可修改重新报送`)) return
    try {
      await reviewPerson('players', r.id, action === '通过' ? 'approve' : 'reject')
      await refresh()
    } catch (err) {
      alert(errMsg(err))
    }
    return
  }
  if (action === '公示/取消公示') {
    try {
      await setPersonActive('players', r.id, !r.isActive)
      await refresh()
    } catch (err) {
      alert(errMsg(err))
    }
    return
  }
  if (action === '删除') {
    if (!confirm(`确认删除球员「${r.name}」的资料？`)) return
    try {
      await deletePlayer(r.id)
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
  <PageHeader title="球员管理" desc="搜索球员信息，注册审核、公示/取消公示、编辑与删除（数据来自后端）" />

  <p class="page-tip">
    球队报送的球员默认「待审核」，核验学籍与注册信息后「通过」即生效并进入公示名单；「公示/取消公示」控制该球员是否对外可见。
  </p>

  <SearchBar :fields="searchFields" @search="onSearch" @reset="onSearch" />

  <h3 v-if="editingId" class="section-title">编辑球员：{{ editingLabel }}</h3>
  <DataForm v-if="editingId" :fields="formFields" submit-text="保存修改" :initial="formInitial" @submit="onSubmit" />

  <h3 class="section-title">球员名单</h3>
  <DataTable
    :columns="columns"
    :rows="rows"
    :actions="['通过', '驳回', '公示/取消公示', '编辑', '删除']"
    @action="onAction"
  />
</template>
