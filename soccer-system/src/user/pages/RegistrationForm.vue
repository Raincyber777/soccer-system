<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import type { FormField } from '../../components/common/types'
import { SICHUAN_CITY_OPTIONS } from '../../data/sichuan-schools'
import {
  tournamentApi,
  registrationApi,
  teamApi,
  identityApi,
  teamCompleteness,
  ApiError,
  USE_MOCK,
  type RealNameRecord,
  type Registration,
  type RegistrationStatus,
  type Team,
  type Tournament,
} from '../../api'
import { useAuth } from '../../stores/auth'

// 赛事报名表单（仅球队负责人）：报名前展示资格自查，提交后展示审核状态时间线
const route = useRoute()
const auth = useAuth()

const tournaments = ref<Tournament[]>([])
const team = ref<Team | null>(null)
const identity = ref<RealNameRecord | null>(null)
const ready = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const submitted = ref<Registration | null>(null)
const stampedForm = ref<File | null>(null)

function onStampChange(event: Event) {
  const target = event.target as HTMLInputElement
  stampedForm.value = target.files?.[0] ?? null
}

const completeness = computed(() => teamCompleteness(team.value))

function endOfDay(date: string) {
  const time = new Date(`${date}T23:59:59`).getTime()
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY
}

function deadlineLabel(date: string) {
  const end = endOfDay(date)
  if (!Number.isFinite(end)) return '以组委会通知为准'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${date}T00:00:00`).getTime()
  if (!Number.isFinite(target)) return '以组委会通知为准'
  const days = Math.round((target - today.getTime()) / 86400000)
  if (days < 0) return '已截止'
  if (days === 0) return '今天截止'
  return `剩余 ${days} 天`
}

const openTournaments = computed(() =>
  tournaments.value.filter(
    (item) =>
      item.status === '报名中' &&
      item.registrationEnabled &&
      endOfDay(item.signEnd) >= Date.now(),
  ),
)

const selectedTournament = computed(() => {
  const id = String(route.query.tournamentId ?? '')
  return openTournaments.value.find((item) => item.id === id)
})

const activeTournament = computed(() => selectedTournament.value ?? openTournaments.value[0] ?? null)

const LEVEL_LABEL: Record<string, string> = {
  school: '校级比赛',
  city: '市级比赛',
  province: '省级比赛',
}

const coachCount = computed(() => team.value?.coaches?.length ?? 0)
const playerCount = computed(() => team.value?.players?.length ?? 0)

const checkItems = computed(() => [
  {
    key: 'team',
    label: '球队资料完善',
    ok: completeness.value.complete,
    required: true,
    detail: completeness.value.complete
      ? `已完善，得分 ${completeness.value.score}`
      : team.value
        ? `还差：${completeness.value.missing.join('、')}`
        : '尚未创建球队',
    to: '/user/team-info',
  },
  {
    key: 'coach',
    label: '至少 1 名教练员',
    ok: coachCount.value >= 1,
    required: true,
    detail: coachCount.value ? `${coachCount.value} 名教练` : '尚未维护教练组',
    to: '/user/team-coaches',
  },
  {
    key: 'players',
    label: '至少 5 名球员',
    ok: playerCount.value >= 5,
    required: true,
    detail: playerCount.value ? `${playerCount.value} 名球员` : '尚未维护球员名单',
    to: '/user/team-members',
  },
  {
    key: 'identity',
    label: '队长实名认证',
    ok: identity.value?.status === '已认证',
    required: false,
    detail: identity.value ? `当前状态：${identity.value.status}` : '尚未提交实名信息',
    to: '/user/identity',
  },
])

const requiredReady = computed(() =>
  checkItems.value.filter((item) => item.required).every((item) => item.ok),
)
const readyCount = computed(() => checkItems.value.filter((item) => item.ok).length)

type TimelineState = 'done' | 'current' | 'wait' | 'error'

interface TimelineNode {
  label: string
  desc: string
  state: TimelineState
}

function timelineOf(status: RegistrationStatus): TimelineNode[] {
  const states: Record<RegistrationStatus, TimelineState[]> = {
    待初审: ['done', 'current', 'wait', 'wait'],
    已提交省级: ['done', 'done', 'current', 'wait'],
    已通过: ['done', 'done', 'done', 'done'],
    已驳回: ['done', 'error', 'error', 'wait'],
  }
  const [first = 'wait', second = 'wait', third = 'wait', fourth = 'wait'] = states[status]
  return [
    {
      label: '提交报名',
      desc: submitted.value?.submitTime ?? '报名信息已提交',
      state: first,
    },
    {
      label: '市州初审',
      desc:
        status === '待初审'
          ? '等待市州管理员审核'
          : status === '已驳回'
            ? '审核未通过，请查看驳回原因'
            : '市州初审已通过',
      state: second,
    },
    {
      label: '省级终审',
      desc:
        status === '已提交省级'
          ? '等待省级终审'
          : status === '已通过'
            ? '省级终审已通过'
            : status === '已驳回'
              ? '请查看驳回原因'
              : '市州初审通过后进入',
      state: third,
    },
    {
      label: '审核通过',
      desc: status === '已通过' ? '已获得参赛资格' : '终审通过后生效',
      state: fourth,
    },
  ]
}

const submittedTimeline = computed(() =>
  submitted.value ? timelineOf(submitted.value.status) : [],
)

const initial = computed<Record<string, string>>(() => {
  const tournament = activeTournament.value
  const isDemoLeader = auth.state.account === 'user001'
  return {
    tournament: tournament?.name ?? '',
    group: team.value?.group ?? tournament?.group ?? '中学组',
    teamName: team.value?.name ?? (isDemoLeader ? '实验中学足球队' : ''),
    school: team.value?.school ?? (isDemoLeader ? '实验中学' : ''),
    city: team.value?.city ?? '成都市',
    leader: team.value?.captain ?? (isDemoLeader ? '杨立科' : ''),
    phone: isDemoLeader ? '13800000000' : '',
    playerCount: String(team.value?.players?.length || 18),
    coach: team.value?.coaches?.[0]?.name ?? (isDemoLeader ? '李教练' : ''),
    remark: '',
  }
})

const formFields = computed<FormField[]>(() => [
  { key: 'tournament', label: '报名赛事', type: 'select', options: openTournaments.value.map((item) => item.name) },
  { key: 'group', label: '报名组别', type: 'select', options: ['小学组', '中学组', '高中组', '高校组'] },
  { key: 'teamName', label: '参赛球队名称', placeholder: '如：实验中学足球队' },
  { key: 'school', label: '所属学校', placeholder: '如：实验中学' },
  { key: 'city', label: '所属市州', type: 'select', options: SICHUAN_CITY_OPTIONS },
  { key: 'leader', label: '领队姓名' },
  { key: 'phone', label: '联系电话', placeholder: '用于审核通知' },
  { key: 'playerCount', label: '参赛队员数', type: 'number', placeholder: '含替补' },
  { key: 'coach', label: '带队教练员' },
  { key: 'remark', label: '备注', type: 'textarea', placeholder: '其他需要说明的情况' },
])

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
}

async function onSubmit(data: Record<string, string>) {
  message.value = ''

  if (!requiredReady.value) {
    showMessage('报名资格尚未满足，请先完善球队资料、教练与球员名单。', 'error')
    return
  }

  const tournament = openTournaments.value.find((item) => item.name === data.tournament)
  if (!tournament) {
    showMessage('所选赛事未开放报名，请返回赛事列表重新选择。', 'error')
    return
  }

  const players = Number(data.playerCount)
  const teamName = (data.teamName ?? '').trim()
  const school = (data.school ?? '').trim()
  if (!teamName || !school) {
    showMessage('请填写参赛球队名称和所属学校。', 'error')
    return
  }
  if (!Number.isFinite(players) || players <= 0) {
    showMessage('请填写正确的参赛队员数。', 'error')
    return
  }
  if (!USE_MOCK && !stampedForm.value) {
    showMessage('请先上传盖章报名表扫描件（PDF / JPG / PNG），再提交报名。', 'error')
    return
  }

  try {
    const result = await registrationApi.create(
      {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        teamId: team.value?.id,
        team: teamName,
        school,
        city: data.city ?? '',
        group: data.group ?? '',
        players,
        leader: data.leader,
        phone: data.phone,
        coach: data.coach,
        remark: data.remark,
      },
      stampedForm.value ?? undefined,
    )
    submitted.value = result
    showMessage('报名已提交，等待市州管理员初审。')
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '报名提交失败', 'error')
  }
}

async function load() {
  try {
    const [list, mine, identityRecord] = await Promise.all([
      tournamentApi.list({ publishedOnly: true }),
      teamApi.getMine(),
      identityApi.mine().catch(() => null),
    ])
    tournaments.value = list
    team.value = mine
    identity.value = identityRecord
  } catch (error) {
    showMessage(error instanceof ApiError ? error.message : '赛事加载失败', 'error')
  } finally {
    ready.value = true
  }
}

onMounted(load)
</script>

<template>
  <PageHeader title="赛事报名" desc="核对报名资格、填写报名信息并批量报送球员资料" />

  <p v-if="message" class="notice" :class="messageType">{{ message }}</p>

  <p v-if="ready && !openTournaments.length" class="page-tip">
    当前没有开放报名的赛事，请返回赛事列表查看，或等待管理员发布新赛事。
  </p>

  <template v-if="ready">
    <div v-if="submitted" class="success-card">
      <div class="success-head">
        <span class="success-icon">✓</span>
        <div>
          <h3>报名已提交</h3>
          <p>{{ submitted.tournamentName }} · {{ submitted.team }}</p>
          <small>提交时间：{{ submitted.submitTime }}</small>
        </div>
      </div>

      <ol class="timeline">
        <li
          v-for="(node, index) in submittedTimeline"
          :key="node.label"
          class="timeline-node"
          :class="node.state"
        >
          <span class="node-dot">
            {{ node.state === 'done' ? '✓' : node.state === 'error' ? '!' : index + 1 }}
          </span>
          <div class="node-body">
            <p>{{ node.label }}</p>
            <small>{{ node.desc }}</small>
          </div>
        </li>
      </ol>

      <p v-if="submitted.status === '已驳回'" class="reject-hint">
        审核未通过，请到「我的报名」查看驳回原因并重新提交。
      </p>

      <div class="success-actions">
        <router-link class="btn btn-primary" to="/user/registrations">查看我的报名</router-link>
        <router-link class="btn btn-ghost" to="/user/tournaments">继续浏览赛事</router-link>
      </div>
    </div>

    <template v-else>
      <div v-if="activeTournament" class="tournament-brief">
        <span class="brief-tag">{{ LEVEL_LABEL[activeTournament.level] }}</span>
        <span class="brief-name">{{ activeTournament.name }}</span>
        <span class="brief-meta">
          报名时间 {{ activeTournament.signStart }} ~ {{ activeTournament.signEnd }}
          · {{ deadlineLabel(activeTournament.signEnd) }}
        </span>
      </div>

      <div class="check-card">
        <div class="check-head">
          <div>
            <h3>报名资格自查</h3>
            <p>前三项为报名硬性条件，全部通过后才可提交报名</p>
          </div>
          <span class="check-count">{{ readyCount }} / {{ checkItems.length }} 项就绪</span>
        </div>
        <div class="check-grid">
          <div
            v-for="item in checkItems"
            :key="item.key"
            class="check-item"
            :class="item.ok ? 'ok' : item.required ? 'missing' : 'advisory'"
          >
            <span class="check-dot">
              {{ item.ok ? '✓' : item.required ? '!' : 'i' }}
            </span>
            <div class="check-body">
              <strong>{{ item.label }}</strong>
              <small>{{ item.detail }}</small>
            </div>
            <router-link v-if="!item.ok" :to="item.to" class="check-link">去完善 →</router-link>
            <span v-else class="check-pass">已就绪</span>
          </div>
        </div>
      </div>

      <div v-if="!requiredReady" class="gate-card">
        <p class="gate-title">报名前请先完成硬性条件</p>
        <p class="gate-desc">
          球队资料、教练组与球员名单需全部达标；实名认证为提示项，不影响球队报名。
        </p>
        <div class="gate-actions">
          <router-link class="btn btn-primary" to="/user/team-info">前往球队信息</router-link>
          <router-link class="btn btn-ghost" to="/user/team-coaches">维护教练组</router-link>
          <router-link class="btn btn-ghost" to="/user/team-members">维护球员名单</router-link>
        </div>
      </div>
      <template v-else-if="activeTournament">
        <div v-if="!USE_MOCK" class="stamp-upload">
          <div>
            <strong>盖章报名表扫描件</strong>
            <small>提交审核前必须上传，支持 PDF / JPG / PNG，单文件不超过 10MB</small>
          </div>
          <label class="stamp-picker">
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" @change="onStampChange" />
            <span>{{ stampedForm ? stampedForm.name : '选择文件' }}</span>
          </label>
        </div>
        <DataForm
          :key="initial.tournament"
          :fields="formFields"
          :initial="initial"
          submit-text="提交报名表"
          @submit="onSubmit"
        />
      </template>
    </template>
  </template>

  <template v-if="!submitted">
    <h3 class="section-title">球员信息报送</h3>
    <p class="page-tip">
      报名球员来自球队球员名单，请先在「球队成员」中维护；学校管理员也可在「本校人员」批量上传。
    </p>
    <div class="roster-links">
      <router-link class="btn btn-ghost" to="/user/team-members">维护球员名单</router-link>
      <router-link class="btn btn-ghost" to="/user/team-coaches">维护教练组</router-link>
    </div>
  </template>
</template>

<style scoped>
.notice {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 14px;
}

.notice.success {
  background: #eef8f0;
  border: 1px solid #bfe3c8;
  color: var(--green-dark);
}

.notice.error {
  background: #fff2f1;
  border: 1px solid #f0c4c0;
  color: #a3312a;
}

.stamp-upload {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 14px 16px;
  border: 1px dashed #b9d7c2;
  border-radius: 10px;
  background: #f7fbf8;
}

.stamp-upload strong {
  display: block;
  font-size: 14px;
  color: var(--green-dark);
}

.stamp-upload small {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}

.stamp-picker {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid var(--green);
  border-radius: 8px;
  background: #fff;
  color: var(--green-dark);
  font-size: 13px;
  cursor: pointer;
}

.stamp-picker input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.tournament-brief {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  margin-bottom: 14px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #f7fbf8;
  font-size: 13px;
}

.brief-tag {
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--green-light);
  color: var(--green-dark);
  font-size: 12px;
  font-weight: 600;
}

.brief-name {
  color: var(--ink);
  font-weight: 600;
}

.brief-meta {
  margin-left: auto;
  font-size: 12px;
  color: var(--muted);
}

.check-card {
  margin-bottom: 16px;
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(20, 60, 40, 0.05);
}

.check-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.check-head h3 {
  font-size: 16px;
  color: var(--green-dark);
}

.check-head p {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}

.check-count {
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--green-light);
  color: var(--green-dark);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.check-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: #fbfdfb;
}

.check-item.ok {
  background: #f7fbf8;
  border-color: #dcefe2;
}

.check-item.missing {
  background: #fffaf2;
  border-color: #f3e2c8;
}

.check-item.advisory {
  background: #f4f8fc;
  border-color: #d8e6f2;
}

.check-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  background: var(--green);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.check-item.missing .check-dot {
  background: #b26a00;
}

.check-item.advisory .check-dot {
  background: #1f5d98;
}

.check-body {
  flex: 1;
  min-width: 0;
}

.check-body strong {
  display: block;
  font-size: 13px;
  color: var(--ink);
}

.check-body small {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--muted);
}

.check-link {
  font-size: 12px;
  font-weight: 600;
  color: var(--green);
  white-space: nowrap;
  text-decoration: none;
}

.check-pass {
  font-size: 11px;
  color: var(--green);
  white-space: nowrap;
}

.gate-card {
  background: #fff;
  border: 1px solid #f3e2c8;
  border-radius: 12px;
  padding: 22px 24px;
  margin-bottom: 16px;
  box-shadow: 0 4px 14px rgba(20, 60, 40, 0.05);
}

.gate-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}

.gate-desc {
  margin-top: 8px;
  margin-bottom: 14px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--muted);
}

.gate-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.roster-links {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.success-card {
  margin-bottom: 18px;
  padding: 22px 24px;
  border: 1px solid #cfe6d6;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(20, 60, 40, 0.08);
}

.success-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.success-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--green);
  color: #fff;
  font-size: 20px;
  font-weight: 800;
  flex: none;
}

.success-head h3 {
  font-size: 18px;
  color: var(--green-dark);
}

.success-head p {
  margin-top: 3px;
  font-size: 13px;
  color: var(--ink);
}

.success-head small {
  display: block;
  margin-top: 3px;
  font-size: 12px;
  color: var(--muted);
}

.timeline {
  display: flex;
  list-style: none;
  margin: 24px 0 0;
  padding: 0;
}

.timeline-node {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 4px;
  text-align: center;
}

.timeline-node::after {
  content: '';
  position: absolute;
  top: 13px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #e3ebe5;
  z-index: 0;
}

.timeline-node:last-child::after {
  display: none;
}

.timeline-node.done::after {
  background: var(--green);
}

.node-dot {
  position: relative;
  z-index: 1;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #eef1ef;
  border: 2px solid #e3ebe5;
  color: #7d8a82;
  font-size: 12px;
  font-weight: 700;
}

.timeline-node.done .node-dot {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
}

.timeline-node.current .node-dot {
  background: #fff;
  border-color: var(--green);
  color: var(--green);
  animation: ringPulse 2s infinite;
}

.timeline-node.error .node-dot {
  background: #c0392b;
  border-color: #c0392b;
  color: #fff;
}

.node-body {
  margin-top: 8px;
}

.node-body p {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}

.node-body small {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--muted);
}

.reject-hint {
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff2f1;
  border: 1px solid #f0c4c0;
  color: #a3312a;
  font-size: 13px;
}

.success-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 20px;
}

@keyframes ringPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(30, 122, 63, 0.35);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(30, 122, 63, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(30, 122, 63, 0);
  }
}

@media (max-width: 760px) {
  .check-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .timeline {
    flex-direction: column;
    gap: 16px;
  }

  .timeline-node {
    flex-direction: row;
    align-items: flex-start;
    gap: 10px;
    text-align: left;
    padding: 0;
  }

  .timeline-node::after {
    top: 28px;
    left: 13px;
    width: 2px;
    height: calc(100% + 16px);
  }

  .node-body {
    margin-top: 1px;
  }

  .brief-meta {
    margin-left: 0;
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .timeline-node.current .node-dot {
    animation: none;
  }
}
</style>
