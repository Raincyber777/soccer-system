<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import DataTable from './DataTable.vue'
import StatCard from './StatCard.vue'
import AppSelect from './AppSelect.vue'
import type { TableColumn } from './types'
import {
  statsApi,
  ApiError,
  type DataScopeLevel,
  type StatOptions,
  type StatResult,
  type StatRange,
} from '../../api'
import { useAuth } from '../../stores/auth'

// 数据统计面板：管理端按省 / 市 / 区 / 校切换范围，校级端固定本校
// 支持时间（全部 / 最近一周 / 最近一月）、球队、比赛三个筛选维度
const props = defineProps<{ mode: 'staff' | 'school' }>()

const auth = useAuth()
const isSuper = computed(() => auth.state.role === 'super')
const isSchoolMode = computed(() => props.mode === 'school')

const RANGE_OPTIONS = ['全部时间', '最近一周', '最近一个月']
const RANGE_VALUE: Record<string, StatRange> = {
  全部时间: 'all',
  最近一周: 'week',
  最近一个月: 'month',
}
const SCOPE_OPTIONS = isSuper.value
  ? ['省级', '市级', '区县级', '校级']
  : ['市级', '区县级', '校级']
const SCOPE_VALUE: Record<string, DataScopeLevel> = {
  省级: 'province',
  市级: 'city',
  区县级: 'district',
  校级: 'school',
}

const options = ref<StatOptions>({ cities: [], districts: [], schools: [], teams: [], matches: [] })
const result = ref<StatResult | null>(null)
const loading = ref(false)
const message = ref('')

const filter = reactive({
  rangeLabel: '全部时间',
  scopeLabel: isSuper.value ? '省级' : '市级',
  city: auth.state.city || '',
  district: '',
  schoolName: '',
  team: '全部球队',
  match: '全部比赛',
})

const scope = computed<DataScopeLevel>(() =>
  isSchoolMode.value ? 'school' : SCOPE_VALUE[filter.scopeLabel] ?? 'province',
)

const cityOptions = computed(() => ['全部市州', ...options.value.cities])
const districtOptions = computed(() => {
  const city = filter.city === '全部市州' ? '' : filter.city
  const districts = options.value.schools
    .filter((school) => !city || school.city === city)
    .map((school) => school.district)
    .filter(Boolean)
  return ['全部区县', ...new Set(districts)]
})
const schoolOptions = computed(() => ['全部学校', ...options.value.schools.map((school) => school.name)])
const teamOptions = computed(() => ['全部球队', ...options.value.teams])
const matchOptions = computed(() => ['全部比赛', ...options.value.matches])

const playerColumns: TableColumn[] = [
  { key: 'name', label: '球员', width: '90px' },
  { key: 'team', label: '球队' },
  { key: 'school', label: '学校', width: '150px' },
  { key: 'matches', label: '场次', width: '70px' },
  { key: 'goals', label: '进球', width: '70px' },
  { key: 'assists', label: '助攻', width: '70px' },
  { key: 'yellowCards', label: '黄牌', width: '70px' },
  { key: 'redCards', label: '红牌', width: '70px' },
]

const matchColumns: TableColumn[] = [
  { key: 'date', label: '日期', width: '110px' },
  { key: 'playerName', label: '球员', width: '90px' },
  { key: 'team', label: '球队' },
  { key: 'opponent', label: '对手', width: '140px' },
  { key: 'score', label: '比分', width: '70px' },
  { key: 'result', label: '结果', width: '60px' },
  { key: 'goals', label: '进球', width: '60px' },
  { key: 'assists', label: '助攻', width: '60px' },
  { key: 'yellowCards', label: '黄牌', width: '60px' },
  { key: 'redCards', label: '红牌', width: '60px' },
]

const statCards = computed(() => {
  const totals = result.value?.totals
  if (!totals) return []
  return [
    { icon: 'users', label: '比赛场次', value: totals.matches, hint: result.value?.rangeLabel ?? '' },
    { icon: 'ball', label: '进球', value: totals.goals, hint: '按比赛明细汇总' },
    { icon: 'star', label: '助攻', value: totals.assists, hint: '含补录事件' },
    { icon: 'info', label: '黄牌', value: totals.yellowCards, hint: '纪律数据' },
    { icon: 'shield', label: '红牌', value: totals.redCards, hint: '纪律数据' },
  ]
})

const playerRows = computed<Record<string, unknown>[]>(() =>
  (result.value?.players ?? []).map((row) => ({ ...row })),
)
const matchRows = computed<Record<string, unknown>[]>(() =>
  (result.value?.matches ?? []).map((row) => ({ ...row })),
)

function showMessage(text: string) {
  message.value = text
}

function currentSchool() {
  if (filter.schoolName === '全部学校') return null
  return options.value.schools.find((school) => school.name === filter.schoolName) ?? null
}

function buildQuery() {
  const school = currentSchool()
  const city = filter.city === '全部市州' ? '' : filter.city
  const district = filter.district === '全部区县' ? '' : filter.district
  const query = {
    range: RANGE_VALUE[filter.rangeLabel] ?? 'all',
    scope: scope.value,
    city: '',
    district: '',
    schoolCode: '',
    team: filter.team === '全部球队' ? '' : filter.team,
    match: filter.match === '全部比赛' ? '' : filter.match,
  }
  if (scope.value === 'city') query.city = city
  if (scope.value === 'district') {
    query.city = city
    query.district = district
  }
  if (scope.value === 'school') {
    query.schoolCode = props.mode === 'school' ? auth.state.schoolCode : school?.code ?? ''
  }
  return query
}

async function run() {
  loading.value = true
  message.value = ''
  try {
    result.value = await statsApi.query(buildQuery())
  } catch (error) {
    message.value = error instanceof ApiError ? error.message : '统计数据加载失败'
  } finally {
    loading.value = false
  }
}

function reset() {
  filter.rangeLabel = '全部时间'
  filter.scopeLabel = isSuper.value ? '省级' : '市级'
  filter.city = auth.state.city || options.value.cities[0] || ''
  filter.district = ''
  filter.schoolName = options.value.schools[0]?.name ?? ''
  filter.team = '全部球队'
  filter.match = '全部比赛'
  run()
}

async function load() {
  try {
    options.value = await statsApi.options()
    const firstCity = auth.state.city || options.value.cities[0] || ''
    filter.city = firstCity
    filter.schoolName = options.value.schools[0]?.name ?? ''
    await run()
  } catch (error) {
    message.value = error instanceof ApiError ? error.message : '筛选选项加载失败'
  }
}

onMounted(load)
</script>

<template>
  <div class="stats-panel">
    <div class="filter-card">
      <div class="filter-row">
        <div class="field">
          <label class="field-label">时间范围</label>
          <AppSelect v-model="filter.rangeLabel" :options="RANGE_OPTIONS" compact />
        </div>

        <div v-if="!isSchoolMode" class="field">
          <label class="field-label">数据范围</label>
          <AppSelect v-model="filter.scopeLabel" :options="SCOPE_OPTIONS" compact />
        </div>

        <div v-if="!isSchoolMode && scope !== 'province' && scope !== 'school'" class="field">
          <label class="field-label">市州</label>
          <AppSelect v-model="filter.city" :options="cityOptions" compact />
        </div>

        <div v-if="!isSchoolMode && scope === 'district'" class="field">
          <label class="field-label">区县</label>
          <AppSelect v-model="filter.district" :options="districtOptions" compact />
        </div>

        <div v-if="!isSchoolMode && scope === 'school'" class="field wide">
          <label class="field-label">学校</label>
          <AppSelect v-model="filter.schoolName" :options="schoolOptions" compact />
        </div>

        <div class="field">
          <label class="field-label">球队</label>
          <AppSelect v-model="filter.team" :options="teamOptions" compact />
        </div>

        <div class="field">
          <label class="field-label">比赛（对手）</label>
          <AppSelect v-model="filter.match" :options="matchOptions" compact />
        </div>

        <div class="filter-actions">
          <button type="button" class="btn btn-primary" :disabled="loading" @click="run">
            {{ loading ? '查询中…' : '查询' }}
          </button>
          <button type="button" class="btn btn-ghost" :disabled="loading" @click="reset">重置</button>
        </div>
      </div>

      <p v-if="result" class="filter-note">
        当前范围：{{ result.scopeLabel }} · {{ result.rangeLabel }} · 生成时间 {{ result.generatedAt }}
      </p>
      <p v-if="message" class="page-tip error">{{ message }}</p>
    </div>

    <div v-if="result" class="stat-grid">
      <StatCard v-for="card in statCards" :key="card.label" v-bind="card" />
    </div>

    <h3 class="section-title">球员统计</h3>
    <DataTable :columns="playerColumns" :rows="playerRows" />
    <p v-if="result && !playerRows.length" class="empty-tip">当前筛选条件下暂无球员比赛数据。</p>

    <h3 class="section-title">比赛明细</h3>
    <DataTable :columns="matchColumns" :rows="matchRows" />
    <p v-if="result && !matchRows.length" class="empty-tip">当前筛选条件下暂无比赛明细。</p>
  </div>
</template>

<style scoped>
.filter-card {
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 140px;
}

.field.wide {
  min-width: 220px;
}

.field-label {
  font-size: 12px;
  color: var(--muted);
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.filter-note {
  margin-top: 12px;
  font-size: 12px;
  color: var(--muted);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 14px;
  margin-bottom: 8px;
}

.empty-tip {
  padding: 14px 0;
  font-size: 13px;
  color: var(--muted);
  text-align: center;
}
</style>
