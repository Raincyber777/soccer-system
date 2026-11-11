<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'
import {
  tournamentApi,
  registrationApi,
  ApiError,
  type Registration,
  type Tournament,
  type TournamentLevel,
} from '../../api'
import { useAuth } from '../../stores/auth'

// 赛事列表：浏览校级 / 市级 / 省级赛事，报名中的赛事展示截止倒计时与报名情况
const router = useRouter()
const auth = useAuth()

const LEVEL_LABEL: Record<TournamentLevel, string> = {
  school: '校级比赛',
  city: '市级比赛',
  province: '省级比赛',
}

const columns: TableColumn[] = [
  { key: 'name', label: '赛事名称' },
  { key: 'levelLabel', label: '赛事类别', width: '100px' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'condition', label: '报名条件', width: '190px' },
  { key: 'deadline', label: '截止时间', width: '180px' },
  { key: 'status', label: '状态', width: '90px' },
  { key: 'registration', label: '报名情况', width: '90px' },
]

const tournaments = ref<Tournament[]>([])
const mine = ref<Registration[]>([])
const loading = ref(false)
const message = ref('')

const LEVEL_TABS: { value: 'all' | TournamentLevel; label: string }[] = [
  { value: 'all', label: '全部赛事' },
  { value: 'school', label: '校级比赛' },
  { value: 'city', label: '市级比赛' },
  { value: 'province', label: '省级比赛' },
]
const activeLevel = ref<'all' | TournamentLevel>('all')

function endOfDay(date: string) {
  const time = new Date(`${date}T23:59:59`).getTime()
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY
}

function isOpen(tournament: Tournament) {
  return (
    tournament.status === '报名中' &&
    tournament.registrationEnabled &&
    endOfDay(tournament.signEnd) >= Date.now()
  )
}

function daysLeft(date: string) {
  const end = endOfDay(date)
  if (!Number.isFinite(end)) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${date}T00:00:00`).getTime()
  if (!Number.isFinite(target)) return null
  return Math.round((target - today.getTime()) / 86400000)
}

function deadlineText(tournament: Tournament) {
  const d = daysLeft(tournament.signEnd)
  if (d === null) return `${tournament.signEnd} 截止`
  if (d < 0) return `${tournament.signEnd} 已截止`
  if (d === 0) return `${tournament.signEnd} 今天截止`
  return `${tournament.signEnd} 截止（剩余 ${d} 天）`
}

function deadlineTone(tournament: Tournament) {
  const d = daysLeft(tournament.signEnd)
  if (d === null) return 'normal'
  if (d < 0) return 'expired'
  if (d === 0) return 'today'
  return d <= 3 ? 'soon' : 'normal'
}

function registeredOf(tournament: Tournament) {
  const records = mine.value.filter((item) => item.tournamentId === tournament.id)
  if (records.some((item) => item.status !== '已驳回')) return '已报名'
  if (records.length) return '已驳回'
  return '未报名'
}

const filtered = computed(() =>
  activeLevel.value === 'all'
    ? tournaments.value
    : tournaments.value.filter((item) => item.level === activeLevel.value),
)

function levelCount(level: 'all' | TournamentLevel) {
  return level === 'all'
    ? tournaments.value.length
    : tournaments.value.filter((item) => item.level === level).length
}

const rows = computed<Record<string, unknown>[]>(() =>
  filtered.value.map((tournament) => {
    const registration = registeredOf(tournament)
    return {
      ...tournament,
      levelLabel: LEVEL_LABEL[tournament.level],
      condition: '资料完善 · 教练≥1 · 球员≥5',
      deadline: deadlineText(tournament),
      deadlineTone: deadlineTone(tournament),
      registration,
      open: isOpen(tournament),
    }
  }),
)

function rowActions(row: Record<string, unknown>) {
  const canRegister =
    Boolean(row.open) &&
    auth.state.persona === 'leader' &&
    row.registration === '未报名'
  return canRegister ? ['查看详情', '报名'] : ['查看详情']
}

function openRegistration(row: Record<string, unknown>) {
  const registration = String(row.registration ?? '')
  if (registration === '已报名') {
    message.value = '该球队已报名此赛事，请在「我的报名」查看审核进度。'
    return
  }
  if (registration === '已驳回') {
    message.value = '该赛事的报名已被驳回，请到「我的报名」修改并重新提交。'
    return
  }
  if (auth.state.persona !== 'leader') {
    message.value = '仅球队负责人可以报名参赛，请使用球队负责人账号登录。'
    return
  }
  router.push({
    path: '/user/registration-form',
    query: { tournamentId: String(row.id ?? '') },
  })
}

function onAction(action: string, row: Record<string, unknown>) {
  if (action === '报名') {
    openRegistration(row)
    return
  }
  const deadline = String(row.deadline ?? '')
  message.value = `「${String(row.name ?? '')}」：${String(row.organizer ?? '')}主办，${deadline}。`
}

async function load() {
  loading.value = true
  try {
    const [list, records] = await Promise.all([
      tournamentApi.list({ publishedOnly: true }),
      auth.state.role === 'user' ? registrationApi.listMine().catch(() => []) : Promise.resolve([]),
    ])
    tournaments.value = list
    mine.value = records
  } catch (error) {
    message.value = error instanceof ApiError ? error.message : '赛事加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <PageHeader title="赛事列表" desc="浏览已发布的校级、市级、省级赛事，核对截止时间与报名条件后提交报名" />

  <p class="page-tip">
    报名前需完成球队资料、教练与球员名单；报名条件以赛事设置为准，截止时间过后不再接受提交。
  </p>

  <p v-if="message" class="page-tip">{{ message }}</p>

  <div class="level-tabs">
    <button
      v-for="tab in LEVEL_TABS"
      :key="tab.value"
      type="button"
      class="level-tab"
      :class="{ active: activeLevel === tab.value }"
      @click="activeLevel = tab.value"
    >
      {{ tab.label }}
      <span class="level-count">{{ levelCount(tab.value) }}</span>
    </button>
  </div>

  <DataTable :columns="columns" :rows="rows" :row-actions="rowActions" @action="onAction">
    <template #cell-deadline="{ row }">
      <span class="deadline-text" :class="`tone-${row.deadlineTone}`">{{ row.deadline }}</span>
    </template>
    <template #cell-registration="{ row }">
      <span class="reg-badge" :class="`reg-${row.registration}`">{{ row.registration }}</span>
    </template>
  </DataTable>

  <p v-if="loading" class="loading-tip">正在加载赛事…</p>
  <p v-else-if="!rows.length" class="page-tip">该类别暂无已发布赛事。</p>
</template>

<style scoped>
.level-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.level-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  color: var(--ink);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, color 0.2s;
}

.level-tab:hover {
  border-color: var(--green);
}

.level-tab.active {
  border-color: var(--green);
  background: var(--green);
  color: #fff;
}

.level-count {
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.08);
  font-size: 11px;
}

.level-tab.active .level-count {
  background: rgba(255, 255, 255, 0.22);
}

.deadline-text {
  font-size: 12px;
  font-weight: 600;
}

.deadline-text.tone-normal {
  color: var(--green);
}

.deadline-text.tone-soon {
  color: #b26a00;
}

.deadline-text.tone-today {
  color: #c0392b;
}

.deadline-text.tone-expired {
  color: var(--muted);
}

.reg-badge {
  display: inline-flex;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.reg-badge.reg-已报名 {
  background: #eef8f0;
  color: #1e7a3f;
}

.reg-badge.reg-已驳回 {
  background: #fff2f1;
  color: #c0392b;
}

.reg-badge.reg-未报名 {
  background: #f1f3f2;
  color: #6b7c72;
}

.loading-tip {
  margin-top: 10px;
  font-size: 12px;
  color: var(--muted);
}

@media (max-width: 760px) {
  /* 赛事表格列较多，手机上保持表内横向滚动，避免每列文字竖排 */
  :deep(.data-table) {
    min-width: 960px;
  }
}
</style>
