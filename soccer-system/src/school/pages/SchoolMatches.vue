<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../../components/common/PageHeader.vue'
import AppSelect from '../../components/common/AppSelect.vue'
import DataTable from '../../components/common/DataTable.vue'
import AppModal from '../../components/common/AppModal.vue'
import type { TableColumn } from '../../components/common/types'
import {
  schoolMatchApi,
  schoolTeamOptions,
  ApiError,
  type SchoolGroupType,
  type SchoolMatch,
  type SchoolMatchInput,
} from '../../api'
import { useAuth } from '../../stores/auth'

// 校级管理员 · 本校比赛：举办比赛、编辑未开始场次、开赛 / 结束、删除未开始场次
// 后端会再次校验本校归属，跨校返回 20004；前端仅做展示与预校验

const auth = useAuth()
const router = useRouter()
const GROUP_OPTIONS = ['高校组', '中学组', '小学组']
const GROUP_VALUE: Record<string, SchoolGroupType> = {
  高校组: 'university',
  中学组: 'middle_school',
  小学组: 'primary_school',
}
const GROUP_TEXT: Record<SchoolGroupType, string> = {
  university: '高校组',
  middle_school: '中学组',
  primary_school: '小学组',
}

const STATUS_FILTERS = ['全部状态', '未开始', '进行中', '已结束']
const statusFilter = ref('全部状态')

const columns: TableColumn[] = [
  { key: 'group', label: '组别', width: '90px' },
  { key: 'versus', label: '对阵' },
  { key: 'time', label: '比赛时间', width: '150px' },
  { key: 'venue', label: '场地' },
  { key: 'scoreText', label: '比分', width: '80px' },
  { key: 'statusText', label: '状态', width: '90px' },
]

const matches = ref<SchoolMatch[]>([])
const loading = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const teamOptions = schoolTeamOptions()
const ownTeams = computed(() => teamOptions.filter((t) => t.schoolCode === auth.state.schoolCode))
const otherTeams = computed(() => teamOptions.filter((t) => t.schoolCode !== auth.state.schoolCode))

const canCreate = computed(() => auth.state.permissions.includes('live:match:create'))
const canUpdate = computed(() => auth.state.permissions.includes('live:match:update'))
const canDelete = computed(() => auth.state.permissions.includes('live:match:delete'))

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
}

const filtered = computed(() =>
  statusFilter.value === '全部状态'
    ? matches.value
    : matches.value.filter((m) => m.status_display === statusFilter.value),
)

const rows = computed<Record<string, unknown>[]>(() =>
  filtered.value.map((m) => ({
    ...m,
    group: m.group_type_display,
    versus: `${m.home_team_name} vs ${m.away_team_name}`,
    scoreText: m.status === 'not_started' ? '—' : `${m.home_score} : ${m.away_score}`,
    statusText: m.status_display,
  })),
)

async function load() {
  loading.value = true
  try {
    matches.value = await schoolMatchApi.list()
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '本校比赛加载失败', 'error')
  } finally {
    loading.value = false
  }
}

function rowActions(row: Record<string, unknown>) {
  const status = String(row.status ?? '')
  // 比赛运营入口对所有状态开放：未开始维护阵容/裁判，进行中录事件，已结束只读
  const actions: string[] = ['比赛运营']
  if (status === 'not_started') {
    if (canUpdate.value) actions.push('编辑', '开赛')
    if (canDelete.value) actions.push('删除')
  } else if (status === 'live' && canUpdate.value) {
    actions.push('结束比赛')
  }
  return actions
}

function findMatch(row: Record<string, unknown>) {
  return matches.value.find((m) => m.id === Number(row.id))
}

function handleAction(action: string, row: Record<string, unknown>) {
  const target = findMatch(row)
  if (!target) return
  if (action === '比赛运营') {
    router.push(`/admin/school/matches/${target.id}`)
    return
  }
  if (action === '编辑') {
    openEdit(target)
    return
  }
  if (action === '开赛') askConfirm(target, 'start')
  if (action === '结束比赛') askConfirm(target, 'finish')
  if (action === '删除') askConfirm(target, 'remove')
}

// ===== 举办 / 编辑比赛 =====
const editOpen = ref(false)
const editing = ref<SchoolMatch | null>(null)
const saving = ref(false)
const formError = ref('')

const form = reactive({
  group: '中学组',
  ownTeam: '',
  ownSide: '主场' as '主场' | '客场',
  opponentTeam: '不指定（手动填写）',
  opponentName: '',
  matchTime: '',
  venue: '',
})

const ownTeamLabels = computed(() => ownTeams.value.map((t) => `${t.name}（${t.school}）`))
const opponentLabels = computed(() => [
  '不指定（手动填写）',
  ...otherTeams.value.map((t) => `${t.name}（${t.school}）`),
])

function teamLabelOf(id: string | null) {
  const team = teamOptions.find((t) => t.id === id)
  return team ? `${team.name}（${team.school}）` : ''
}

function openCreate() {
  editing.value = null
  form.group = '中学组'
  form.ownTeam = ownTeamLabels.value[0] ?? ''
  form.ownSide = '主场'
  form.opponentTeam = '不指定（手动填写）'
  form.opponentName = ''
  form.matchTime = ''
  form.venue = auth.state.schoolName ? `${auth.state.schoolName}足球场` : ''
  formError.value = ''
  editOpen.value = true
}

function openEdit(match: SchoolMatch) {
  editing.value = match
  form.group = GROUP_TEXT[match.group_type]
  const homeIsOwn = teamOptions.find((t) => t.id === match.home_team_id)?.schoolCode === auth.state.schoolCode
  const ownId = homeIsOwn ? match.home_team_id : match.away_team_id
  const opponentId = homeIsOwn ? match.away_team_id : match.home_team_id
  form.ownTeam = teamLabelOf(ownId) || ownTeamLabels.value[0] || ''
  form.ownSide = homeIsOwn ? '主场' : '客场'
  form.opponentTeam = teamLabelOf(opponentId) || '不指定（手动填写）'
  form.opponentName = opponentId ? '' : homeIsOwn ? match.away_team_name : match.home_team_name
  form.matchTime = match.match_time.replace(' ', 'T').slice(0, 16)
  form.venue = match.venue
  formError.value = ''
  editOpen.value = true
}

function submit() {
  if (saving.value) return
  const own = ownTeams.value.find((t) => `${t.name}（${t.school}）` === form.ownTeam)
  if (!own) {
    formError.value = '请选择本校参赛球队'
    return
  }
  const opponent = otherTeams.value.find((t) => `${t.name}（${t.school}）` === form.opponentTeam)
  const opponentName = opponent ? opponent.name : form.opponentName.trim()
  if (!opponentName) {
    formError.value = '请选择或填写对手球队'
    return
  }
  if (!form.matchTime) {
    formError.value = '请选择比赛时间'
    return
  }

  const isHome = form.ownSide === '主场'
  const input: SchoolMatchInput = {
    group_type: GROUP_VALUE[form.group] ?? 'middle_school',
    home_team_id: isHome ? own.id : opponent?.id ?? null,
    away_team_id: isHome ? opponent?.id ?? null : own.id,
    home_team_name: isHome ? own.name : opponentName,
    away_team_name: isHome ? opponentName : own.name,
    match_time: form.matchTime,
    venue: form.venue.trim(),
  }

  saving.value = true
  formError.value = ''
  const target = editing.value
  const request = target
    ? schoolMatchApi.update(target.id, input, target.version)
    : schoolMatchApi.create(input)
  request
    .then(async () => {
      editOpen.value = false
      showMessage(target ? '比赛信息已更新。' : '比赛已创建，可在门户赛程中查看。')
      await load()
    })
    .catch((error: unknown) => {
      formError.value = error instanceof ApiError ? error.message : '比赛保存失败'
    })
    .finally(() => {
      saving.value = false
    })
}

// ===== 开赛 / 结束 / 删除 二次确认 =====
const confirmOpen = ref(false)
const confirmKind = ref<'start' | 'finish' | 'remove'>('start')
const confirmTarget = ref<SchoolMatch | null>(null)
const confirming = ref(false)

const confirmTitle = computed(() => {
  if (confirmKind.value === 'start') return '确认开赛'
  if (confirmKind.value === 'finish') return '确认结束比赛'
  return '删除比赛'
})

const confirmTip = computed(() => {
  if (confirmKind.value === 'start') return '开赛后比赛进入进行中状态，将不能编辑或删除。'
  if (confirmKind.value === 'finish') return '结束后比分与进球记录将锁定，比赛不可再修改。'
  return '删除后不可恢复，仅未开始的比赛允许删除。'
})

function askConfirm(match: SchoolMatch, kind: 'start' | 'finish' | 'remove') {
  confirmTarget.value = match
  confirmKind.value = kind
  confirmOpen.value = true
}

async function submitConfirm() {
  const target = confirmTarget.value
  if (!target || confirming.value) return
  confirming.value = true
  try {
    if (confirmKind.value === 'remove') {
      await schoolMatchApi.remove(target.id)
      showMessage('比赛已删除。')
    } else {
      const result = await schoolMatchApi.setStatus(target.id, confirmKind.value)
      showMessage(confirmKind.value === 'start' ? '比赛已开赛。' : `比赛已结束，最终比分 ${result.home_score} : ${result.away_score}。`)
    }
    confirmOpen.value = false
    await load()
  } catch (error) {
    confirmOpen.value = false
    showMessage(error instanceof ApiError ? error.message : '操作失败', 'error')
    await load()
  } finally {
    confirming.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page-root">
  <PageHeader title="本校比赛" desc="举办比赛并维护赛程；已结束比赛自动锁定，跨校操作会被服务端拒绝" />

  <div class="toolbar">
    <span class="toolbar-label">比赛状态</span>
    <AppSelect v-model="statusFilter" :options="STATUS_FILTERS" />
    <button v-if="canCreate" type="button" class="primary-btn" :disabled="!auth.state.schoolCode" @click="openCreate">
      举办比赛
    </button>
    <button type="button" class="refresh-btn" :disabled="loading" @click="load">
      {{ loading ? '加载中…' : '刷新' }}
    </button>
    <span class="toolbar-note">共 {{ matches.length }} 场 · 仅本校参与的比赛</span>
  </div>

  <p v-if="message" class="page-tip" :class="messageType">{{ message }}</p>
  <p v-if="!auth.state.schoolCode" class="page-tip error">当前账号未绑定学校，无法举办比赛。</p>

  <DataTable :columns="columns" :rows="rows" :row-actions="rowActions" @action="handleAction" />

  <p class="page-tip hint">
    举办比赛时至少一支球队属于本校；已开始比赛不可编辑或删除，跨校操作返回 20004，缺少球队或时间返回 10001。
  </p>

  <AppModal :open="editOpen" :title="editing ? '编辑比赛' : '举办比赛'" @close="editOpen = false">
    <div class="form">
      <label class="field">
        <span>组别</span>
        <AppSelect v-model="form.group" :options="GROUP_OPTIONS" />
      </label>

      <label class="field">
        <span>本校球队</span>
        <AppSelect v-model="form.ownTeam" :options="ownTeamLabels" />
      </label>

      <label class="field">
        <span>本校位置</span>
        <AppSelect v-model="form.ownSide" :options="['主场', '客场']" />
      </label>

      <label class="field">
        <span>对手球队</span>
        <AppSelect v-model="form.opponentTeam" :options="opponentLabels" />
      </label>

      <label v-if="form.opponentTeam === '不指定（手动填写）'" class="field">
        <span>对手名称</span>
        <input v-model="form.opponentName" type="text" maxlength="40" placeholder="如：师大附中" />
      </label>

      <label class="field">
        <span>比赛时间</span>
        <input v-model="form.matchTime" type="datetime-local" />
      </label>

      <label class="field">
        <span>比赛场地</span>
        <input v-model="form.venue" type="text" maxlength="60" placeholder="如：成都市实验中学足球场" />
      </label>

      <p v-if="formError" class="page-tip error">{{ formError }}</p>
    </div>

    <template #footer>
      <button type="button" class="modal-btn" :disabled="saving" @click="editOpen = false">取消</button>
      <button type="button" class="modal-btn primary" :disabled="saving" @click="submit">
        {{ saving ? '保存中…' : editing ? '保存修改' : '创建比赛' }}
      </button>
    </template>
  </AppModal>

  <AppModal :open="confirmOpen" :title="confirmTitle" @close="confirmOpen = false">
    <div v-if="confirmTarget" class="confirm-body">
      <p>{{ confirmTarget.home_team_name }} vs {{ confirmTarget.away_team_name }}</p>
      <p class="muted">{{ confirmTarget.match_time }} · {{ confirmTarget.venue || '场地待定' }}</p>
      <p class="confirm-tip">{{ confirmTip }}</p>
    </div>
    <template #footer>
      <button type="button" class="modal-btn" :disabled="confirming" @click="confirmOpen = false">取消</button>
      <button
        type="button"
        class="modal-btn primary"
        :class="{ danger: confirmKind === 'remove' }"
        :disabled="confirming"
        @click="submitConfirm"
      >
        {{ confirming ? '处理中…' : confirmKind === 'remove' ? '确认删除' : '确认' }}
      </button>
    </template>
  </AppModal>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.toolbar-label {
  font-size: 13px;
  color: var(--muted);
}

.toolbar :deep(.app-select) {
  width: 170px;
}

.primary-btn,
.refresh-btn {
  border: 1px solid #d9e6dc;
  background: #fff;
  color: var(--green-dark);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.primary-btn {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
}

.refresh-btn:hover:not(:disabled) {
  border-color: var(--green);
  background: var(--green-light);
}

.primary-btn:disabled,
.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-note {
  font-size: 12px;
  color: var(--muted);
}

.page-tip {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 12px;
}

.page-tip.success {
  color: var(--green-dark);
}

.page-tip.error {
  color: #a3312a;
}

.page-tip.hint {
  margin-top: 14px;
  line-height: 1.8;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
}

.field input {
  padding: 9px 12px;
  border: 1.5px solid #d8e2da;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: var(--ink);
}

.field input:focus-visible {
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(30, 122, 63, 0.12);
  outline: none;
}

.confirm-body p {
  font-size: 14px;
  margin-bottom: 8px;
}

.confirm-body .muted {
  font-size: 12px;
  color: var(--muted);
}

.confirm-tip {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff6e6;
  color: #8a5a12;
  font-size: 13px;
  line-height: 1.7;
}

.modal-btn {
  border: 1px solid #d9e6dc;
  background: #fff;
  color: var(--green-dark);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 18px;
  border-radius: 8px;
  cursor: pointer;
}

.modal-btn.primary {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
}

.modal-btn.danger {
  background: #a3312a;
  border-color: #a3312a;
}

.modal-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
