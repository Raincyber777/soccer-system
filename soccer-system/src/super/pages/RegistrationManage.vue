<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import SearchBar from '../../components/common/SearchBar.vue'
import DataForm from '../../components/common/DataForm.vue'
import DataTable from '../../components/common/DataTable.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import type { FormField, SearchField, TableColumn } from '../../components/common/types'
import {
  createPlayer,
  fetchCoaches,
  fetchPlayers,
  updateCoach,
  updatePlayer,
} from '../../api/person'
import { fetchTeams, type ApiCoach, type ApiPlayer, type ApiTeam } from '../../api/team'
import { uploadCommonFile } from '../../api/registration'
import { errMsg } from '../../api/manage'

// 报名信息管理：教练员/球员身份信息维护（搜索走后端 name/id_card 参数），
// 报名统计由球队+球员数据按市州/高校聚合，导出为前端生成 CSV。

const searchFields: SearchField[] = [
  { key: 'name', label: '姓名', placeholder: '输入姓名' },
  { key: 'idCard', label: '身份证号', placeholder: '输入身份证号' },
]

// ---------- 教练员 ----------

const coachColumns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '110px' },
  { key: 'idCard', label: '身份证号', width: '180px' },
  { key: 'unit', label: '所属单位' },
  { key: 'phone', label: '联系电话', width: '140px' },
  { key: 'status', label: '状态', width: '100px' },
]

type CoachRow = {
  id: number
  name: string
  idCard: string
  unit: string
  phone: string
  status: string
}

const coachRows = ref<CoachRow[]>([
  { id: -1, name: '张建国', idCard: '5101**********1011', unit: '实验中学', phone: '—', status: '已生效' },
  { id: -2, name: '刘洋', idCard: '5101**********1022', unit: '第一实验小学', phone: '—', status: '已生效' },
])

const coachEditingId = ref<number | null>(null)
const coachInitial = ref<Record<string, string>>({})
const coachFormKey = ref(0)
const coachFields: FormField[] = [
  { key: 'name', label: '姓名' },
  { key: 'id_card', label: '身份证号' },
  { key: 'phone', label: '联系电话' },
  { key: 'unit_name', label: '所属单位' },
]

// ---------- 球员 ----------

const playerColumns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '110px' },
  { key: 'idCard', label: '身份证号', width: '180px' },
  { key: 'team', label: '所属球队' },
  { key: 'avatar', label: '头像', width: '90px' },
  { key: 'status', label: '状态', width: '100px' },
]

type PlayerRow = {
  id: number
  team: number | null
  name: string
  idCard: string
  avatar: string
  status: string
}

const playerRows = ref<PlayerRow[]>([
  { id: -1, team: null, name: '王小磊', idCard: '5101**********0011', avatar: '已上传', status: '已生效' },
  { id: -2, team: null, name: '李泽宇', idCard: '5101**********0022', avatar: '未上传', status: '已生效' },
])

const rawPlayers = ref<ApiPlayer[]>([])
const teams = ref<ApiTeam[]>([])
const filters = ref<Record<string, string>>({})

// 球员表单：add 新增 / edit 修改（editingId），closed 不显示
const playerFormMode = ref<'closed' | 'add' | 'edit'>('closed')
const playerEditingId = ref<number | null>(null)
const playerInitial = ref<Record<string, string>>({})
const playerFormKey = ref(0)
const teamOptions = computed(() => teams.value.map((t) => t.name))
const teamIdByOption = computed(() => {
  const map = new Map<string, number>()
  teams.value.forEach((t) => map.set(t.name, t.id))
  return map
})
const playerFields = computed<FormField[]>(() => [
  { key: 'team', label: '所属球队', type: 'select', options: teamOptions.value, placeholder: '请选择球队' },
  { key: 'name', label: '姓名' },
  { key: 'gender', label: '性别', type: 'select', options: ['男', '女'] },
  { key: 'birth_date', label: '出生日期', type: 'date' },
  { key: 'id_card', label: '身份证号', placeholder: '18 位，唯一' },
  { key: 'grade', label: '年级', placeholder: '如初二' },
  { key: 'position', label: '场上位置', type: 'select', options: ['前锋', '中场', '后卫', '门将'] },
  { key: 'jersey', label: '球衣号码', type: 'number' },
  { key: 'phone', label: '联系电话' },
])

// ---------- 头像上传（先在列表选中球员） ----------

const pendingAvatar = ref<{ id: number; name: string } | null>(null)
const avatarUploading = ref(false)

async function onAvatarFile(file: File) {
  if (!pendingAvatar.value) {
    alert('请先在球员列表点击「上传头像」选择球员')
    return
  }
  avatarUploading.value = true
  try {
    const res = await uploadCommonFile(file, 'player-photos')
    await updatePlayer(pendingAvatar.value.id, { photo_url: res.url })
    alert(`已更新 ${pendingAvatar.value.name} 的头像`)
    pendingAvatar.value = null
    await refresh()
  } catch (err) {
    alert(errMsg(err))
  } finally {
    avatarUploading.value = false
  }
}

// ---------- 报名统计（前端聚合） ----------

type StatRow = { city: string; teams: number; players: number }

const cityStats = computed<StatRow[]>(() => aggregateStats(teams.value, false))
const collegeStats = computed<StatRow[]>(() => aggregateStats(teams.value, true))

function aggregateStats(teamList: ApiTeam[], universityOnly: boolean): StatRow[] {
  const pool = universityOnly ? teamList.filter((t) => t.group_type === 'university') : teamList
  const byCity = new Map<string, { teams: number; teamIds: Set<number>; players: number }>()
  pool.forEach((t) => {
    const key = universityOnly ? (t.school_name || '未挂靠高校') : (t.city_name || '未归属')
    const e = byCity.get(key) ?? { teams: 0, teamIds: new Set<number>(), players: 0 }
    e.teams++
    e.teamIds.add(t.id)
    byCity.set(key, e)
  })
  rawPlayers.value.forEach((p) => {
    const team = teamList.find((t) => t.id === p.team)
    if (!team) return
    const key = universityOnly ? (team.school_name || '未挂靠高校') : (team.city_name || '未归属')
    const e = byCity.get(key)
    if (e) e.players++
  })
  return [...byCity.entries()]
    .map(([city, e]) => ({ city, teams: e.teams, players: e.players }))
    .sort((a, b) => b.teams - a.teams)
}

const statColumns: TableColumn[] = [
  { key: 'city', label: '市州 / 高校' },
  { key: 'teams', label: '报名球队数', width: '120px' },
  { key: 'players', label: '报名球员数', width: '120px' },
]

function exportStats() {
  const lines = ['市州,报名球队数,报名球员数']
  cityStats.value.forEach((r) => lines.push(`${r.city},${r.teams},${r.players}`))
  lines.push('')
  lines.push('高校,报名球队数,报名球员数')
  collegeStats.value.forEach((r) => lines.push(`${r.city},${r.teams},${r.players}`))
  // ﻿ BOM 保证 Excel 打开中文不乱码
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = '报名情况统计.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

// ---------- 读取与动作 ----------

async function refresh(f = filters.value) {
  filters.value = f
  const params: Record<string, unknown> = { page_size: 100 }
  if (f.name?.trim()) params.name = f.name.trim()
  if (f.idCard?.trim()) params.id_card = f.idCard.trim()
  const [coaches, players, teamList] = await Promise.all([fetchCoaches(params), fetchPlayers(params), fetchTeams()])
  if (teamList) teams.value = teamList
  if (coaches) {
    coachRows.value = coaches.map((c: ApiCoach) => ({
      id: c.id,
      name: c.name,
      idCard: c.id_card,
      unit: c.unit_name || '—',
      phone: c.phone || '—',
      status: c.status_display,
    }))
  }
  if (players) {
    rawPlayers.value = players
    playerRows.value = players.map((p: ApiPlayer) => ({
      id: p.id,
      team: p.team,
      name: p.name,
      idCard: p.id_card,
      avatar: p.photo_url ? '已上传' : '未上传',
      status: p.status_display,
    }))
  }
}

onMounted(() => void refresh())

function onSearch(f: Record<string, string>) {
  void refresh(f)
}

async function onSubmitCoach(data: Record<string, string>) {
  if (coachEditingId.value === null) return
  if (!data.id_card?.trim()) {
    alert('身份证号不能为空')
    return
  }
  try {
    await updateCoach(coachEditingId.value, {
      name: (data.name ?? '').trim(),
      id_card: data.id_card.trim(),
      phone: (data.phone ?? '').trim(),
      unit_name: (data.unit_name ?? '').trim(),
    })
    coachEditingId.value = null
    coachInitial.value = {}
    coachFormKey.value++
    await refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onSubmitPlayer(data: Record<string, string>) {
  if (!data.name?.trim() || !data.id_card?.trim()) {
    alert('姓名与身份证号为必填项')
    return
  }
  const payload = {
    team: teamIdByOption.value.get(data.team ?? '') ?? null,
    name: data.name.trim(),
    gender: data.gender || '男',
    birth_date: data.birth_date || undefined,
    id_card: data.id_card.trim(),
    grade: (data.grade ?? '').trim(),
    position: data.position || '前锋',
    jersey_number: data.jersey ? Number(data.jersey) : null,
    phone: (data.phone ?? '').trim(),
  }
  try {
    if (playerFormMode.value === 'edit' && playerEditingId.value !== null) {
      await updatePlayer(playerEditingId.value, payload)
    } else {
      await createPlayer(payload)
    }
    playerFormMode.value = 'closed'
    playerEditingId.value = null
    playerInitial.value = {}
    playerFormKey.value++
    await refresh()
  } catch (err) {
    alert(errMsg(err))
  }
}

function onActionCoach(action: string, row: Record<string, unknown>) {
  if (action !== '修改身份信息') return
  const r = row as unknown as CoachRow
  coachEditingId.value = r.id
  coachInitial.value = { name: r.name, id_card: r.idCard, phone: r.phone === '—' ? '' : r.phone, unit_name: r.unit === '—' ? '' : r.unit }
  coachFormKey.value++
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function onActionPlayer(action: string, row: Record<string, unknown>) {
  const r = row as unknown as PlayerRow
  if (action === '修改身份信息') {
    const raw = rawPlayers.value.find((p) => p.id === r.id)
    const teamName = raw ? (teams.value.find((t) => t.id === raw.team)?.name ?? '') : ''
    playerFormMode.value = 'edit'
    playerEditingId.value = r.id
    playerInitial.value = raw
      ? {
          team: teamName,
          name: raw.name,
          gender: raw.gender || '男',
          birth_date: raw.birth_date || '',
          id_card: raw.id_card,
          grade: raw.grade || '',
          position: raw.position || '前锋',
          jersey: raw.jersey_number === null ? '' : String(raw.jersey_number),
          phone: raw.phone || '',
        }
      : {}
    playerFormKey.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  if (action === '上传头像') {
    pendingAvatar.value = { id: r.id, name: r.name }
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }
}

function onStartAddPlayer() {
  playerFormMode.value = 'add'
  playerEditingId.value = null
  playerInitial.value = {}
  playerFormKey.value++
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function onCancelPlayerForm() {
  playerFormMode.value = 'closed'
  playerEditingId.value = null
  playerFormKey.value++
}
</script>

<template>
  <PageHeader title="报名信息管理" desc="维护教练员与球员身份信息，查看市州/高校报名统计并导出" />

  <SearchBar :fields="searchFields" @search="onSearch" @reset="() => onSearch({})" />

  <h3 class="section-title">教练员身份信息</h3>
  <template v-if="coachEditingId !== null">
    <DataForm :key="`c${coachFormKey}`" :fields="coachFields" submit-text="保存修改" :initial="coachInitial" @submit="onSubmitCoach" />
  </template>
  <p v-else class="page-tip" style="margin-bottom: 10px">点击教练员行的「修改身份信息」编辑姓名、身份证号、联系电话与所属单位。</p>
  <DataTable :columns="coachColumns" :rows="coachRows" :actions="['修改身份信息']" @action="onActionCoach" />

  <h3 class="section-title">
    球员身份信息
    <button type="button" class="btn btn-ghost section-action" @click="onStartAddPlayer">增加身份信息</button>
  </h3>
  <template v-if="playerFormMode !== 'closed'">
    <h4 class="form-mode-title">{{ playerFormMode === 'add' ? '增加球员身份信息' : '修改球员身份信息' }}</h4>
    <DataForm :key="`p${playerFormKey}`" :fields="playerFields" submit-text="保存" :initial="playerInitial" @submit="onSubmitPlayer" />
    <p class="page-tip" style="margin: 6px 0 10px">
      <button type="button" class="btn btn-ghost" @click="onCancelPlayerForm">取消{{ playerFormMode === 'add' ? '新增' : '编辑' }}</button>
    </p>
  </template>
  <DataTable :columns="playerColumns" :rows="playerRows" :actions="['修改身份信息', '上传头像']" @action="onActionPlayer" />

  <h3 class="section-title">
    报名情况统计
    <button type="button" class="btn btn-ghost section-action" @click="exportStats">导出统计</button>
  </h3>
  <p class="page-tip" style="margin-bottom: 12px">统计口径：全省注册球队与球员按市州/高校聚合（列表前 100 条）。</p>
  <div class="stat-grid two-col">
    <div class="card">
      <p class="stat-block-title">市州报名情况统计</p>
      <DataTable :columns="statColumns" :rows="cityStats" />
    </div>
    <div class="card">
      <p class="stat-block-title">高校报名情况统计</p>
      <DataTable :columns="statColumns" :rows="collegeStats" />
    </div>
  </div>

  <h3 class="section-title">球员头像上传</h3>
  <p class="page-tip" style="margin-bottom: 12px">
    {{ pendingAvatar ? `正在为「${pendingAvatar.name}」上传头像，选择文件后自动保存。` : '请先在球员列表点击「上传头像」选择球员。' }}
  </p>
  <div class="upload-grid single">
    <UploadBlock title="球员头像" desc="支持 JPG / PNG 图片，不超过 20MB" accept="image/*" @select="onAvatarFile" />
  </div>
</template>

<style scoped>
.section-action {
  margin-left: 10px;
  padding: 4px 12px;
  font-size: 12px;
  vertical-align: middle;
}

.form-mode-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--green-dark);
  margin: 4px 0 10px;
}

.two-col {
  grid-template-columns: repeat(2, 1fr);
}

@media (max-width: 900px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}

.stat-block-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--green-dark);
  margin-bottom: 12px;
}

.upload-grid.single {
  max-width: 360px;
}
</style>
