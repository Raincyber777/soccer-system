<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import DataTable from '../../components/common/DataTable.vue'
import DataForm from '../../components/common/DataForm.vue'
import AppModal from '../../components/common/AppModal.vue'
import type { FormField, TableColumn } from '../../components/common/types'
import { schoolTournamentApi, ApiError, type Tournament } from '../../api'
import { useAuth } from '../../stores/auth'

// 校级管理员 · 校级赛事：发布、下架本校的校级比赛并控制报名开关
// 只能管理本校发布的校级赛事，主办单位由当前学校自动带入
const auth = useAuth()

const tournaments = ref<Tournament[]>([])
const loading = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const createOpen = ref(false)
const createError = ref('')
const formVersion = ref(0)

const formFields: FormField[] = [
  { key: 'name', label: '赛事名称', placeholder: '如：2026 实验中学秋季校内联赛' },
  { key: 'group', label: '参赛组别', type: 'select', options: ['小学组', '中学组', '高中组', '高校组'] },
  { key: 'signStart', label: '报名开始', type: 'date' },
  { key: 'signEnd', label: '报名结束', type: 'date' },
]

const initialForm = computed<Record<string, string>>(() => ({
  name: '',
  group: '中学组',
  signStart: '2026-11-01',
  signEnd: '2026-11-20',
}))

const columns: TableColumn[] = [
  { key: 'name', label: '赛事名称' },
  { key: 'group', label: '组别', width: '90px' },
  { key: 'signTime', label: '报名时间', width: '210px' },
  { key: 'registrationText', label: '报名开关', width: '90px' },
  { key: 'status', label: '状态', width: '90px' },
]

const rows = computed<Record<string, unknown>[]>(() =>
  tournaments.value.map((tournament) => ({
    ...tournament,
    signTime: `${tournament.signStart} ~ ${tournament.signEnd}`,
    registrationText: tournament.registrationEnabled ? '开放' : '关闭',
  })),
)

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
}

function rowActions(row: Record<string, unknown>) {
  switch (row.status) {
    case '未发布':
      return ['发布']
    case '报名中':
      return ['关闭报名', '下架']
    case '已截止':
      return ['开放报名', '下架']
    case '已下架':
      return ['重新发布']
    default:
      return []
  }
}

async function load() {
  loading.value = true
  try {
    tournaments.value = await schoolTournamentApi.list()
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '校级赛事加载失败', 'error')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  createError.value = ''
  formVersion.value += 1
  createOpen.value = true
}

async function createTournament(data: Record<string, string>) {
  createError.value = ''
  try {
    await schoolTournamentApi.create({
      name: data.name ?? '',
      level: 'school',
      group: data.group ?? '',
      organizer: auth.state.schoolName || '',
      signStart: data.signStart ?? '',
      signEnd: data.signEnd ?? '',
    })
    createOpen.value = false
    showMessage('校级赛事已创建，请在列表中发布；发布后自动开放报名。')
    await load()
  } catch (error) {
    createError.value = error instanceof ApiError ? error.message : '赛事创建失败'
  }
}

async function handleAction(action: string, row: Record<string, unknown>) {
  const id = String(row.id ?? '')
  const name = String(row.name ?? '')
  try {
    if (action === '发布' || action === '重新发布') {
      await schoolTournamentApi.publish(id)
      showMessage(`「${name}」已发布，用户端可按校级赛事报名。`)
    } else if (action === '下架') {
      await schoolTournamentApi.offline(id)
      showMessage(`「${name}」已下架。`)
    } else if (action === '关闭报名') {
      await schoolTournamentApi.setRegistration(id, false)
      showMessage(`「${name}」报名已关闭。`)
    } else if (action === '开放报名') {
      await schoolTournamentApi.setRegistration(id, true)
      showMessage(`「${name}」报名已开放。`)
    } else {
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
  <div class="page-root">
  <PageHeader title="校级赛事" desc="发布本校的校级比赛，开放报名后可在用户端赛事列表报名" />

  <p v-if="message" class="page-tip" :class="messageType">{{ message }}</p>

  <p class="page-tip">
    校级赛事与市级、省级赛事相互独立。主办单位自动使用「{{ auth.state.schoolName || '本校' }}」，
    只能管理本校发布的校级赛事。
  </p>

  <div class="toolbar">
    <button type="button" class="btn btn-primary" @click="openCreate">＋ 发布校级赛事</button>
  </div>

  <DataTable
    :columns="columns"
    :rows="rows"
    :row-actions="rowActions"
    @action="handleAction"
  />
  <p v-if="!loading && !tournaments.length" class="empty-tip">暂无校级赛事，可点击上方按钮创建。</p>
  <p v-if="loading" class="page-tip">正在加载校级赛事…</p>

  <AppModal :open="createOpen" title="发布校级赛事" @close="createOpen = false">
    <DataForm
      :key="formVersion"
      :fields="formFields"
      :initial="initialForm"
      submit-text="创建赛事"
      @submit="createTournament"
    />
    <p v-if="createError" class="page-tip error">{{ createError }}</p>
  </AppModal>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.empty-tip {
  padding: 16px 0;
  font-size: 13px;
  color: var(--muted);
  text-align: center;
}
</style>
