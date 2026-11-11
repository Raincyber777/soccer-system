<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../../components/common/PageHeader.vue'
import StatCard from '../../components/common/StatCard.vue'
import DataTable from '../../components/common/DataTable.vue'
import AppIcon from '../../components/common/AppIcon.vue'
import {
  teamApi,
  registrationApi,
  identityApi,
  playerApi,
  teamCompleteness,
  ApiError,
  type PlayerMatchRecord,
  type RealNameRecord,
  type Registration,
  type Team,
} from '../../api'
import { useAuth, personaLabels, type UserPersona } from '../../stores/auth'

// 用户工作台：球队、报名、实名与比赛记录来自真实接口，待办与消息由数据派生
const router = useRouter()
const auth = useAuth()

const team = ref<Team | null>(null)
const registrations = ref<Registration[]>([])
const identity = ref<RealNameRecord | null>(null)
const records = ref<PlayerMatchRecord[]>([])
const loading = ref(true)
const error = ref('')

const persona = computed<UserPersona>(() => auth.state.persona ?? 'leader')
const personaLabel = computed(() => personaLabels[persona.value])
const completeness = computed(() => teamCompleteness(team.value))
const pending = computed(() =>
  registrations.value.filter((item) => item.status === '待初审' || item.status === '已提交省级'),
)
const rejected = computed(() => registrations.value.filter((item) => item.status === '已驳回'))
const latestRecord = computed(() =>
  records.value.slice().sort((a, b) => b.date.localeCompare(a.date))[0] ?? null,
)

const headerDesc = computed(
  () => `${personaLabel.value} · ${team.value?.name ?? '尚未创建球队'} · 汇总报名与赛程动态`,
)

const stats = computed(() => [
  {
    icon: 'shield',
    label: '我的球队',
    value: loading.value ? '—' : team.value ? '1 支' : '未创建',
    hint: team.value?.name ?? '前往球队信息创建',
  },
  {
    icon: 'clipboard-list',
    label: '报名进行中',
    value: loading.value ? '—' : `${pending.value.length} 份`,
    hint: pending.value[0]?.tournamentName ?? '暂无待审核报名',
  },
  {
    icon: 'trophy',
    label: '审核驳回',
    value: loading.value ? '—' : `${rejected.value.length} 份`,
    hint: rejected.value[0]?.rejectReason ?? '暂无驳回记录',
  },
  {
    icon: 'ball',
    label: '近期比赛',
    value: loading.value ? '—' : `${records.value.length} 场`,
    hint: latestRecord.value
      ? `${latestRecord.value.date} · vs ${latestRecord.value.opponent}`
      : '暂无比赛记录',
  },
])

interface TodoItem {
  icon: string
  title: string
  desc: string
  to: string
  level: 'required' | 'suggest'
}

const todos = computed<TodoItem[]>(() => {
  if (loading.value) return []
  const list: TodoItem[] = []
  if (!team.value) {
    list.push({
      icon: 'shield',
      title: '创建球队资料',
      desc: '报名前需先完成球队创建、队徽与球队简介',
      to: '/user/team-info',
      level: 'required',
    })
  } else if (!completeness.value.complete) {
    list.push({
      icon: 'shield',
      title: `完善球队信息（还差 ${completeness.value.missing.length} 项）`,
      desc: completeness.value.missing.join('、'),
      to: '/user/team-info',
      level: 'required',
    })
  }
  if (rejected.value.length) {
    list.push({
      icon: 'clipboard-list',
      title: `处理被驳回报名（${rejected.value.length} 份）`,
      desc: rejected.value[0]?.rejectReason ?? '请查看驳回原因并重新提交',
      to: '/user/registrations',
      level: 'required',
    })
  }
  if (persona.value !== 'leader' && identity.value?.status !== '已认证') {
    list.push({
      icon: 'user',
      title: '完成实名认证',
      desc: identity.value ? `当前状态：${identity.value.status}` : '尚未提交实名信息',
      to: '/user/identity',
      level: 'required',
    })
  }
  return list
})

interface QuickLink {
  icon: string
  title: string
  desc: string
  to: string
  personas?: UserPersona[]
}

interface QuickGroup {
  title: string
  links: QuickLink[]
}

const guideRoutes: Record<UserPersona, string> = {
  leader: '/user/usage-guide',
  student: '/user/usage-guide-student',
  coach: '/user/usage-guide-coach',
}

const quickGroups = computed<QuickGroup[]>(() => {
  const groups: QuickGroup[] = [
    {
      title: '报名参赛',
      links: [
        { icon: 'trophy', title: '赛事列表', desc: '浏览赛事与报名条件', to: '/user/tournaments' },
        { icon: 'clipboard-list', title: '我的报名', desc: '审核进度与驳回原因', to: '/user/registrations' },
        { icon: 'circle-check', title: '报名审核信息', desc: '报名公示与审核结果', to: '/user/registration-review-info' },
      ],
    },
    {
      title: '我的球队',
      links: [
        { icon: 'shield', title: '球队信息', desc: '队旗队徽与球队资料', to: '/user/team-info', personas: ['leader'] },
        { icon: 'users', title: '队员列表', desc: '球员名单与照片', to: '/user/team-members', personas: ['leader'] },
        { icon: 'users', title: '教练组', desc: '教练资质与联系方式', to: '/user/team-coaches', personas: ['leader'] },
        { icon: 'trophy', title: '球队履历', desc: '历年参赛与荣誉墙', to: '/user/team-history', personas: ['leader'] },
      ],
    },
    {
      title: '我的数据',
      links: [
        { icon: 'ball', title: '我的参赛记录', desc: '进球、助攻与红黄牌', to: '/user/my-stats' },
        { icon: 'user', title: '运动员信息', desc: '注册信息与个人履历', to: '/user/athlete-profile', personas: ['student'] },
        { icon: 'medal', title: '教练员信息', desc: '个人信息与执教履历', to: '/user/coach-profile', personas: ['coach'] },
        { icon: 'circle-check', title: '实名认证', desc: '账号与队员一对一绑定', to: '/user/identity' },
      ],
    },
    {
      title: '账户服务',
      links: [
        { icon: 'user', title: '个人中心', desc: '基础信息与密码修改', to: '/user/profile' },
        { icon: 'info', title: '使用说明', desc: '当前身份的操作指引', to: guideRoutes[persona.value] },
        { icon: 'megaphone', title: '信息公示', desc: '运动员与教练员公示', to: '/user/publicity' },
      ],
    },
  ]

  return groups
    .map((group) => ({
      ...group,
      links: group.links.filter(
        (link) => !link.personas || link.personas.includes(persona.value),
      ),
    }))
    .filter((group) => group.links.length > 0)
})

const messageColumns = [
  { key: 'title', label: '消息标题' },
  { key: 'type', label: '类型', width: '110px' },
  { key: 'time', label: '时间', width: '170px' },
  { key: 'status', label: '状态', width: '100px' },
]

const messages = computed(() =>
  registrations.value.slice(0, 5).map((item) => ({
    id: item.id,
    title: `${item.tournamentName} · ${item.team}`,
    type: item.status === '已驳回' ? '材料提醒' : '审核通知',
    time: item.submitTime,
    status: item.status,
  })),
)

function onMessageAction() {
  router.push('/user/registrations')
}

async function load() {
  loading.value = true
  error.value = ''
  const [teamResult, registrationResult, identityResult, recordResult] = await Promise.allSettled([
    teamApi.getMine(),
    registrationApi.listMine(),
    identityApi.mine(),
    playerApi.myRecords(),
  ])

  if (teamResult.status === 'fulfilled') team.value = teamResult.value
  if (registrationResult.status === 'fulfilled') registrations.value = registrationResult.value
  if (identityResult.status === 'fulfilled') identity.value = identityResult.value
  if (recordResult.status === 'fulfilled') records.value = recordResult.value

  if ([teamResult, registrationResult, identityResult, recordResult].every((item) => item.status === 'rejected')) {
    error.value = '工作台数据加载失败，请稍后刷新重试。'
  }
  loading.value = false
}

onMounted(async () => {
  try {
    await load()
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '工作台数据加载失败'
    loading.value = false
  }
})
</script>

<template>
  <PageHeader title="工作台" :desc="headerDesc" />

  <p v-if="error" class="error-bar">{{ error }}</p>
  <div v-if="loading" class="loading-card">
    <span class="loading-line long"></span>
    <span class="loading-line"></span>
  </div>

  <div class="stat-grid">
    <StatCard v-for="item in stats" :key="item.label" v-bind="item" />
  </div>

  <section class="team-overview reveal">
    <div class="overview-main">
      <p class="overview-kicker">球队概览</p>
      <h3>{{ team?.name ?? '尚未创建球队' }}</h3>
      <p class="overview-meta">
        <template v-if="team">{{ team.group }} · {{ team.school }}</template>
        <template v-else>创建球队后即可报名赛事、维护球员与教练资料</template>
      </p>
    </div>

    <div class="overview-progress">
      <div class="progress-head">
        <span>资料完善度</span>
        <strong>{{ completeness.score }} / 100</strong>
      </div>
      <div class="progress-track">
        <span class="progress-fill" :style="{ width: `${completeness.score}%` }"></span>
      </div>
      <p class="progress-hint">
        {{ completeness.complete ? '资料已完善，可正常报名赛事' : `待完善：${completeness.missing.join('、')}` }}
      </p>
    </div>

    <div class="overview-actions">
      <router-link class="overview-btn primary" to="/user/team-info">
        {{ team ? '完善资料' : '去创建' }}
      </router-link>
      <router-link class="overview-btn ghost" to="/user/registrations">我的报名</router-link>
    </div>
  </section>

  <section class="panel reveal">
    <div class="panel-head">
      <h3>待办事项</h3>
      <span>{{ todos.length ? `${todos.length} 项待处理` : '全部处理完成' }}</span>
    </div>
    <div v-if="todos.length" class="todo-list">
      <router-link v-for="item in todos" :key="item.title" :to="item.to" class="todo-item" :class="item.level">
        <span class="todo-icon">
          <AppIcon :name="item.icon" :size="20" />
        </span>
        <span class="todo-body">
          <strong>{{ item.title }}</strong>
          <small>{{ item.desc }}</small>
        </span>
        <span class="todo-link">去处理 <i>→</i></span>
      </router-link>
    </div>
    <p v-else class="panel-empty">暂无待办，保持关注赛事动态</p>
  </section>

  <h3 class="section-title">快捷入口</h3>
  <div class="quick-groups">
    <section v-for="group in quickGroups" :key="group.title" class="quick-group">
      <h4 class="group-title">{{ group.title }}</h4>
      <div class="quick-grid">
        <router-link v-for="link in group.links" :key="link.title" :to="link.to" class="quick-card">
          <span class="quick-icon">
            <AppIcon :name="link.icon" :size="22" />
          </span>
          <p class="quick-title">{{ link.title }}</p>
          <p class="quick-desc">{{ link.desc }}</p>
        </router-link>
      </div>
    </section>
  </div>

  <h3 class="section-title">消息与审核动态</h3>
  <DataTable
    :columns="messageColumns"
    :rows="messages"
    :actions="['查看']"
    @action="onMessageAction"
  />
  <p v-if="!loading && !messages.length" class="panel-empty">
    暂无报名消息，去<router-link to="/user/tournaments" class="inline-link">赛事列表</router-link>看看
  </p>
</template>

<style scoped>
.error-bar {
  margin-bottom: 14px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #fff2f1;
  border: 1px solid #f0c4c0;
  color: #a3312a;
  font-size: 13px;
}

.loading-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
}

.loading-line {
  height: 12px;
  width: 40%;
  border-radius: 999px;
  background: linear-gradient(90deg, #eef3ee 25%, #f7faf7 37%, #eef3ee 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s infinite;
}

.loading-line.long {
  width: 68%;
}

.team-overview {
  display: grid;
  grid-template-columns: 1.1fr 1fr auto;
  align-items: center;
  gap: 28px;
  margin-top: 18px;
  padding: 22px 24px;
  border-radius: 18px;
  background: linear-gradient(120deg, #0f2f20, #1e5a38);
  color: #fff;
  box-shadow: 0 16px 32px rgba(15, 47, 32, 0.2);
}

.overview-kicker {
  font-size: 12px;
  letter-spacing: 0.22em;
  color: #9fd4b5;
}

.overview-main h3 {
  margin-top: 6px;
  font-size: 22px;
  font-weight: 800;
}

.overview-meta {
  margin-top: 6px;
  font-size: 13px;
  color: #d7e7dc;
}

.progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #d7e7dc;
}

.progress-head strong {
  color: #fff;
}

.progress-track {
  margin-top: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  overflow: hidden;
}

.progress-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #7ddba6, #2e9e52);
  transition: width 0.5s ease;
}

.progress-hint {
  margin-top: 8px;
  font-size: 11px;
  line-height: 1.6;
  color: #c9e7d4;
}

.overview-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.overview-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px 18px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.overview-btn.primary {
  background: #fff;
  color: #14532d;
}

.overview-btn.ghost {
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #e4f2e8;
}

.overview-btn.ghost:hover {
  background: rgba(255, 255, 255, 0.12);
}

.panel {
  margin-top: 18px;
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(20, 60, 40, 0.06);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.panel-head h3 {
  font-size: 16px;
  color: var(--green-dark);
}

.panel-head span {
  font-size: 12px;
  color: var(--muted);
}

.todo-list {
  display: flex;
  flex-direction: column;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 10px;
  border-radius: 10px;
  color: inherit;
  text-decoration: none;
  transition: background 0.2s;
}

.todo-item:hover {
  background: #fbfdfb;
}

.todo-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.todo-item.required .todo-icon {
  background: #fff7ed;
  color: #b26a00;
}

.todo-item.suggest .todo-icon {
  background: #eef8f0;
  color: #1e7a3f;
}

.todo-body {
  flex: 1;
  min-width: 0;
}

.todo-body strong {
  display: block;
  font-size: 14px;
  color: var(--ink);
}

.todo-body small {
  display: block;
  margin-top: 3px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--muted);
}

.todo-link {
  font-size: 12px;
  font-weight: 600;
  color: var(--green);
  white-space: nowrap;
}

.todo-link i {
  font-style: normal;
  display: inline-block;
  transition: transform 0.2s;
}

.todo-item:hover .todo-link i {
  transform: translateX(3px);
}

.panel-empty {
  padding: 16px 0 4px;
  font-size: 13px;
  color: var(--muted);
  text-align: center;
}

.inline-link {
  color: var(--green);
  font-weight: 600;
}

.quick-groups {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.section-title {
  margin: 30px 0 14px;
  font-size: 20px;
}

.section-title::before {
  height: 20px;
}

.group-title {
  position: relative;
  padding-left: 12px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.group-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 2px;
  bottom: 2px;
  width: 4px;
  border-radius: 999px;
  background: var(--green);
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px;
  margin-top: 10px;
}

.quick-card {
  background: #fff;
  border: 1px solid #eef2ee;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 14px rgba(20, 60, 40, 0.05);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.quick-card:hover {
  transform: translateY(-3px);
  border-color: #cfe6d6;
  box-shadow: 0 10px 22px rgba(20, 60, 40, 0.1);
}

.quick-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--green-light);
  color: var(--green);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.quick-title {
  margin-top: 10px;
  font-size: 14px;
  font-weight: 700;
  color: var(--green-dark);
}

.quick-desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--muted);
}

/* 工作台辅助文字统一上调，避免正文层级过细 */
.group-title {
  font-size: 14px;
}

.quick-title {
  font-size: 15px;
}

.quick-desc,
.todo-body small,
.panel-head span {
  font-size: 13px;
}

.overview-meta {
  font-size: 14px;
}

.progress-hint {
  font-size: 12px;
}

.reveal {
  animation: riseIn 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@keyframes riseIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}

@media (max-width: 900px) {
  .team-overview {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .overview-actions {
    flex-direction: row;
    flex-wrap: wrap;
  }
}

@media (max-width: 640px) {
  .stat-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  /* 消息表在手机上改为表内横向滚动，避免文字被挤成竖排 */
  :deep(.data-table) {
    min-width: 680px;
  }

  .team-overview {
    padding: 18px;
  }

  .overview-main h3 {
    font-size: 19px;
  }

  .quick-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .quick-card,
  .todo-link i,
  .progress-fill {
    transition: none;
  }

  .reveal,
  .loading-line {
    animation: none;
  }
}
</style>
