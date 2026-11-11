<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import DataForm from '../../components/common/DataForm.vue'
import UploadBlock from '../../components/common/UploadBlock.vue'
import AppModal from '../../components/common/AppModal.vue'
import type { FormField, TableColumn } from '../../components/common/types'
import {
  tournamentApi,
  ApiError,
  type Tournament,
  type TournamentLevel,
  type TournamentMaterial,
} from '../../api'
import { useAuth } from '../../stores/auth'

// 赛事发布管理：校级 / 市级 / 省级三类独立
// 市州管理员可发布校级、市级赛事；省级赛事仅超级管理员可发布
const auth = useAuth()
const isSuper = computed(() => auth.state.role === 'super')

const LEVEL_LABEL: Record<TournamentLevel, string> = {
  school: '校级比赛',
  city: '市级比赛',
  province: '省级比赛',
}
const LEVEL_BY_LABEL: Record<string, TournamentLevel> = {
  校级比赛: 'school',
  市级比赛: 'city',
  省级比赛: 'province',
}

const tabs: { value: 'all' | TournamentLevel; label: string }[] = [
  { value: 'all', label: '全部赛事' },
  { value: 'school', label: '校级比赛' },
  { value: 'city', label: '市级比赛' },
  { value: 'province', label: '省级比赛' },
]

const activeLevel = ref<'all' | TournamentLevel>('all')
const keyword = ref('')
const tournaments = ref<Tournament[]>([])
const loading = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const createOpen = ref(false)
const formVersion = ref(0)
const createError = ref('')

// 校级赛事资料手动上传：赛程、成绩、名单三类文件，按赛事单独保存
const materials = ref<Record<string, TournamentMaterial>>({})
const materialOpen = ref(false)
const materialTarget = ref<Tournament | null>(null)
const materialError = ref('')
const materialUploads = reactive({ schedule: false, results: false, roster: false })

const formFields = computed<FormField[]>(() => [
  {
    key: 'level',
    label: '赛事类别',
    type: 'select',
    options: isSuper.value ? ['校级比赛', '市级比赛', '省级比赛'] : ['校级比赛', '市级比赛'],
  },
  { key: 'name', label: '赛事名称', placeholder: '如：2026 实验中学秋季校内联赛' },
  {
    key: 'group',
    label: '参赛组别',
    type: 'select',
    options: ['小学组', '中学组', '高中组', '高校组'],
  },
  { key: 'organizer', label: '主办单位', placeholder: '如：实验中学 / 成都市教育局' },
  { key: 'signStart', label: '报名开始', type: 'date' },
  { key: 'signEnd', label: '报名结束', type: 'date' },
])

const initialForm = computed<Record<string, string>>(() => ({
  level: '校级比赛',
  group: '中学组',
  signStart: '2026-11-01',
  signEnd: '2026-11-20',
}))

const filtered = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  return tournaments.value.filter((t) => {
    if (activeLevel.value !== 'all' && t.level !== activeLevel.value) return false
    if (!key) return true
    return (
      t.name.toLowerCase().includes(key) ||
      t.organizer.toLowerCase().includes(key) ||
      t.group.toLowerCase().includes(key)
    )
  })
})

const rows = computed<Record<string, unknown>[]>(() =>
  filtered.value.map((t) => ({
    ...t,
    levelLabel: LEVEL_LABEL[t.level],
    signTime: `${t.signStart} ~ ${t.signEnd}`,
    registrationText: t.registrationEnabled ? '开放' : '关闭',
    materialText:
      t.level === 'school'
        ? materials.value[t.id]
          ? '已上传'
          : '未上传'
        : '—',
  })),
)

const columns: TableColumn[] = [
  { key: 'name', label: '赛事名称' },
  { key: 'levelLabel', label: '赛事类别', width: '100px' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'organizer', label: '主办单位', width: '130px' },
  { key: 'signTime', label: '报名时间', width: '210px' },
  { key: 'registrationText', label: '报名开关', width: '90px' },
  { key: 'materialText', label: '赛事资料', width: '90px' },
  { key: 'status', label: '状态', width: '90px' },
]

// 普通管理员只能操作自己创建的校级/市级赛事，省级赛事只读
function canManage(row: Record<string, unknown>) {
  if (isSuper.value) return true
  if (row.level === 'province') return false
  return row.createdBy === auth.state.account
}

function rowActions(row: Record<string, unknown>) {
  const manageable = canManage(row)
  const schoolActions = manageable && row.level === 'school' ? ['上传赛事资料'] : []
  if (!manageable) return ['查看', ...schoolActions]
  switch (row.status) {
    case '未发布':
      return ['发布', ...schoolActions]
    case '报名中':
      return ['关闭报名', '下架', ...schoolActions]
    case '已截止':
      return ['开放报名', '下架', ...schoolActions]
    case '已下架':
      return ['重新发布', ...schoolActions]
    default:
      return ['查看', ...schoolActions]
  }
}

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
}

async function load() {
  loading.value = true
  try {
    tournaments.value = await tournamentApi.list()
    const schoolList = tournaments.value.filter((t) => t.level === 'school')
    const map: Record<string, TournamentMaterial> = {}
    await Promise.all(
      schoolList.map(async (t) => {
        const material = await tournamentApi.getMaterial(t.id)
        if (material) map[t.id] = material
      }),
    )
    materials.value = map
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '赛事加载失败', 'error')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  createError.value = ''
  formVersion.value += 1
  createOpen.value = true
}

async function handleCreate(data: Record<string, string>) {
  createError.value = ''
  const levelLabel = data.level ?? ''
  const level = LEVEL_BY_LABEL[levelLabel]
  if (!level) {
    createError.value = '请选择赛事类别'
    return
  }
  if (!isSuper.value && level === 'province') {
    createError.value = '省级赛事仅超级管理员可发布'
    return
  }

  try {
    await tournamentApi.create({
      name: data.name ?? '',
      level,
      group: data.group ?? '',
      organizer: data.organizer ?? '',
      signStart: data.signStart ?? '',
      signEnd: data.signEnd ?? '',
    })
    createOpen.value = false
    showMessage('赛事已创建，请在列表中发布；发布后自动开放报名。')
    await load()
  } catch (error) {
    createError.value = error instanceof ApiError ? error.message : '赛事创建失败'
  }
}

function openMaterial(row: Record<string, unknown>) {
  const target = tournaments.value.find((t) => t.id === String(row.id ?? '')) ?? null
  if (!target) {
    showMessage('赛事不存在或已被删除', 'error')
    return
  }
  materialTarget.value = target
  const existing = materials.value[target.id]
  materialUploads.schedule = existing?.schedule ?? false
  materialUploads.results = existing?.results ?? false
  materialUploads.roster = existing?.roster ?? false
  materialError.value = ''
  materialOpen.value = true
}

async function confirmMaterial() {
  const target = materialTarget.value
  if (!target) return
  materialError.value = ''
  try {
    await tournamentApi.saveMaterial(target.id, {
      schedule: materialUploads.schedule,
      results: materialUploads.results,
      roster: materialUploads.roster,
    })
    materialOpen.value = false
    showMessage(`「${target.name}」赛事资料已上传，市州管理员可在列表查看上传状态。`)
    await load()
  } catch (error) {
    materialError.value = error instanceof ApiError ? error.message : '资料上传失败'
  }
}

async function handleAction(action: string, row: Record<string, unknown>) {
  if (action === '查看') {
    showMessage(`「${String(row.name ?? '')}」当前为只读查看，普通管理员无法操作其他层级或他人创建的赛事。`)
    return
  }

  if (action === '上传赛事资料') {
    openMaterial(row)
    return
  }

  const id = String(row.id ?? '')
  if (!id) return

  try {
    if (action === '发布' || action === '重新发布') {
      await tournamentApi.publish(id)
      showMessage('赛事已发布并开放报名，用户端赛事列表可见。')
    } else if (action === '下架') {
      await tournamentApi.offline(id)
      showMessage('赛事已下架，用户端不再展示。')
    } else if (action === '关闭报名') {
      await tournamentApi.setRegistration(id, false)
      showMessage('报名已关闭。')
    } else if (action === '开放报名') {
      await tournamentApi.setRegistration(id, true)
      showMessage('报名已重新开放。')
    } else {
      showMessage('该操作暂未实现', 'error')
      return
    }
    await load()
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '操作失败', 'error')
  }
}

onMounted(load)
</script>

<template>
  <PageHeader
    title="赛事发布管理"
    desc="按校级 / 市级 / 省级三类发布赛事，控制报名开关；校级赛事由市州管理员发布"
  />

  <div class="toolbar">
    <div class="level-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        class="level-tab"
        :class="{ active: activeLevel === tab.value }"
        @click="activeLevel = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="toolbar-right">
      <input
        v-model="keyword"
        class="keyword-input"
        type="text"
        placeholder="搜索赛事名称 / 主办单位"
      />
      <button type="button" class="btn btn-primary" @click="openCreate">新建赛事</button>
    </div>
  </div>

  <p v-if="message" class="notice" :class="messageType">{{ message }}</p>

  <p class="page-tip">
    发布赛事后状态变为“报名中”，同时自动开放报名；关闭报名后状态为“已截止”，可随时重新开放。
    市州管理员可发布校级和市级赛事，省级赛事由超级管理员统一发布。
  </p>

  <DataTable :columns="columns" :rows="rows" :row-actions="rowActions" @action="handleAction" />

  <p v-if="loading" class="loading-tip">正在加载赛事数据…</p>

  <AppModal :open="createOpen" title="新建赛事" @close="createOpen = false">
    <p class="modal-tip">
      新建赛事默认状态为“未发布”，创建后需在列表点击“发布”，用户端才会显示并开放报名。
    </p>
    <p v-if="createError" class="form-error">{{ createError }}</p>
    <DataForm
      :key="formVersion"
      :fields="formFields"
      :initial="initialForm"
      submit-text="创建赛事"
      @submit="handleCreate"
    />
  </AppModal>

  <AppModal :open="materialOpen" title="校级赛事资料手动上传" @close="materialOpen = false">
    <p class="modal-tip">
      {{ materialTarget?.name ?? '' }} 为校级赛事，由学校线下组织。请手动上传赛程、成绩与参赛名单，
      上传后状态会同步到赛事列表，供市州管理员核验。
    </p>
    <p v-if="materialError" class="form-error">{{ materialError }}</p>
    <div class="upload-grid">
      <UploadBlock
        title="上传赛事赛程"
        desc="Excel 或 PDF，含轮次与开赛时间"
        :uploaded="materialUploads.schedule"
        @select="materialUploads.schedule = true"
      />
      <UploadBlock
        title="上传比赛成绩"
        desc="Excel，含比分与进球球员"
        :uploaded="materialUploads.results"
        @select="materialUploads.results = true"
      />
      <UploadBlock
        title="上传参赛名单"
        desc="Excel，含球员姓名、球衣号与学籍"
        :uploaded="materialUploads.roster"
        @select="materialUploads.roster = true"
      />
    </div>
    <div class="material-actions">
      <button type="button" class="btn btn-primary" @click="confirmMaterial">确认上传</button>
    </div>
  </AppModal>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  background: #fff;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 14px;
  box-shadow: var(--shadow-sm);
}

.level-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.level-tab {
  border: 1px solid #dfe9e1;
  background: #fff;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.15s;
}

.level-tab:hover {
  border-color: var(--green);
  color: var(--green-dark);
}

.level-tab.active {
  border-color: var(--green);
  background: var(--green-light);
  color: var(--green-dark);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.keyword-input {
  padding: 9px 12px;
  border: 1.5px solid #d8e2da;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  min-width: 220px;
}

.keyword-input:focus {
  border-color: var(--green);
}

.notice {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 12px;
}

.notice.success {
  background: #eef8f0;
  border: 1px solid #bfe3c8;
  color: var(--green-dark);
}

.notice.error,
.form-error {
  background: #fff2f1;
  border: 1px solid #f0c4c0;
  color: #a3312a;
}

.form-error {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 12px;
}

.modal-tip {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.7;
  margin-bottom: 12px;
}

.material-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.loading-tip {
  margin-top: 10px;
  font-size: 12px;
  color: var(--muted);
}
</style>
