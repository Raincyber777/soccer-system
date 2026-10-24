<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../../components/common/PageHeader.vue'
import StatCard from '../../components/common/StatCard.vue'
import DataTable from '../../components/common/DataTable.vue'
import AppIcon from '../../components/common/AppIcon.vue'
import { useAuth, type UserPersona } from '../../stores/auth'
import { fetchMyTeam } from '../../api/team'
import { fetchRegistrations, fetchTournaments, type RegistrationList } from '../../api/registration'

const auth = useAuth()
const router = useRouter()

// 工作台：统计卡读真实数据（我的球队/赛事/我的报名），
// 消息区展示最新报名审核动态（暂无独立消息模型）。

const stats = ref([
  { icon: 'shield', label: '我的球队', value: '—', hint: '' },
  { icon: 'trophy', label: '赛事总数', value: '—', hint: '' },
  { icon: 'clipboard-list', label: '我的报名', value: '—', hint: '' },
  { icon: 'bell', label: '待审核报名', value: '—', hint: '' },
])

const regs = ref<RegistrationList[]>([])

const columns = [
  { key: 'title', label: '报名项目' },
  { key: 'type', label: '当前环节', width: '130px' },
  { key: 'time', label: '提交时间', width: '170px' },
  { key: 'status', label: '状态', width: '100px' },
]

type FeedRow = {
  id: number
  title: string
  type: string
  time: string
  status: string
}

/** 报名状态 → 审核环节文案 */
function stepOf(r: RegistrationList): string {
  if (r.status === 'pending_city_review') return '市州初审'
  if (r.status === 'pending_province_review') return '省级终审'
  return '已完成'
}

const feed = computed<FeedRow[]>(() =>
  regs.value.slice(0, 5).map((r) => ({
    id: r.id,
    title: `${r.tournament_name} · ${r.team_name}（${r.group_type_display}）`,
    type: stepOf(r),
    time: (r.submit_time || '').slice(0, 16).replace('T', ' '),
    status: r.status_display,
  })),
)

onMounted(async () => {
  const [team, tournaments, registrationList] = await Promise.all([
    fetchMyTeam(),
    fetchTournaments(),
    fetchRegistrations(),
  ])
  // fetchMyTeam 无法区分「后端不可用」与「暂无球队」：一律按 0 支提示
  stats.value[0] = { icon: 'shield', label: '我的球队', value: team ? '1 支' : '0 支', hint: team?.name ?? '可在「球队信息」创建' }
  if (tournaments) {
    const signing = tournaments.filter((t) => t.status_display.includes('报名')).length
    stats.value[1] = {
      icon: 'trophy',
      label: '赛事总数',
      value: `${tournaments.length} 项`,
      hint: signing ? `${signing} 项报名中` : '暂无报名中的赛事',
    }
  }
  if (registrationList) {
    regs.value = registrationList
    const pending = registrationList.filter((r) => r.status.startsWith('pending')).length
    stats.value[2] = { icon: 'clipboard-list', label: '我的报名', value: `${registrationList.length} 份`, hint: '' }
    stats.value[3] = { icon: 'bell', label: '待审核报名', value: `${pending} 份`, hint: pending ? '等待市州/省级审核' : '暂无待审核' }
  }
})

// 快捷入口按登录身份过滤：personas 不填 = 所有身份可见
const quickLinks: {
  icon: string
  title: string
  desc: string
  to: string
  personas?: UserPersona[]
}[] = [
  { icon: 'trophy', title: '赛事列表', desc: '浏览各项赛事与报名要求', to: '/user/tournaments' },
  { icon: 'clipboard-list', title: '赛事报名', desc: '填写报名表并报送球员信息', to: '/user/registration-form', personas: ['leader'] },
  { icon: 'file-text', title: '我的报名', desc: '查看审核状态、修改报名信息', to: '/user/registrations' },
  { icon: 'circle-check', title: '报名审核信息', desc: '查看审核进度与报名公示', to: '/user/registration-review-info' },
  { icon: 'shield', title: '球队信息', desc: '创建球队、维护队旗队徽资料', to: '/user/team-info', personas: ['leader'] },
  { icon: 'users', title: '队员列表', desc: '维护球队队员信息与照片', to: '/user/team-members', personas: ['leader'] },
  { icon: 'trophy', title: '球队履历', desc: '历年参赛记录与荣誉墙', to: '/user/team-history', personas: ['leader'] },
  { icon: 'user', title: '运动员信息', desc: '注册表单与个人信息确认', to: '/user/athlete-profile', personas: ['student'] },
  { icon: 'medal', title: '教练员信息', desc: '完善个人信息与执教履历', to: '/user/coach-profile', personas: ['coach'] },
  { icon: 'megaphone', title: '信息公示', desc: '运动员/教练员公示查询', to: '/user/publicity' },
  { icon: 'user', title: '个人中心', desc: '基础信息、密码修改与退出登录', to: '/user/profile' },
]

// 使用说明按身份各有一份，快捷入口指向当前身份对应的那份
const guideLinks: Record<UserPersona, { icon: string; title: string; desc: string; to: string }> = {
  leader: { icon: 'info', title: '使用说明', desc: '组队与报名分步指引', to: '/user/usage-guide' },
  student: { icon: 'info', title: '使用说明', desc: '学籍与履历上传指引', to: '/user/usage-guide-student' },
  coach: { icon: 'info', title: '使用说明', desc: '执教资质维护指引', to: '/user/usage-guide-coach' },
}

const visibleLinks = computed(() => {
  const links = quickLinks.filter((q) => !q.personas || (auth.state.persona !== null && q.personas.includes(auth.state.persona)))
  const persona = auth.state.persona ?? 'leader'
  return [...links, guideLinks[persona]]
})

function onAction(action: string, row: Record<string, unknown>) {
  const r = row as unknown as FeedRow
  if (action === '查看') {
    const reg = regs.value.find((x) => x.id === r.id)
    if (reg) {
      alert(
        `${reg.tournament_name}（${reg.group_type_display}）\n球队：${reg.team_name}\n状态：${reg.status_display}` +
          `\n提交时间：${(reg.submit_time || '').slice(0, 16).replace('T', ' ')}\n\n审核详情可在「我的报名」中查看`,
      )
      return
    }
  }
  router.push('/user/registrations')
}
</script>

<template>
  <PageHeader title="工作台" desc="汇总你的球队、报名与审核动态" />

  <div class="stat-grid">
    <StatCard v-for="s in stats" :key="s.label" v-bind="s" />
  </div>

  <h3 class="section-title">快捷入口</h3>
  <div class="quick-grid">
    <router-link v-for="q in visibleLinks" :key="q.title" :to="q.to" class="quick-card">
      <span class="quick-icon">
        <AppIcon :name="q.icon" :size="24" />
      </span>
      <p class="quick-title">{{ q.title }}</p>
      <p class="quick-desc">{{ q.desc }}</p>
    </router-link>
  </div>

  <h3 class="section-title">报名审核动态</h3>
  <DataTable :columns="columns" :rows="feed" :actions="['查看']" @action="onAction" />
</template>

<style scoped>
.quick-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 14px rgba(20, 60, 40, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}

.quick-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 22px rgba(20, 60, 40, 0.1);
}

.quick-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--green-light);
  color: var(--green);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.quick-title {
  margin-top: 10px;
  font-size: 15px;
  font-weight: 700;
  color: var(--green-dark);
}

.quick-desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}
</style>
