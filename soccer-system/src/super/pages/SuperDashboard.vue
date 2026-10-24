<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../../components/common/PageHeader.vue'
import StatCard from '../../components/common/StatCard.vue'
import DataTable from '../../components/common/DataTable.vue'
import AppIcon from '../../components/common/AppIcon.vue'
import { fetchUsers } from '../../api/account'
import { fetchTeams } from '../../api/team'
import { fetchRegistrations, type RegistrationList } from '../../api/registration'

// 超级管理员控制台：统计卡读真实数据（账户/球队/待终审报名），待办取自待省级终审报名单

const router = useRouter()

const ADMIN_ROLES = ['admin', 'city', 'province']
const USER_ROLES = ['school', 'athlete', 'coach', 'personal']

const stats = ref([
  { icon: 'crown', label: '管理员账户', value: '—', hint: '' },
  { icon: 'users', label: '用户账户', value: '—', hint: '' },
  { icon: 'shield', label: '报名球队', value: '—', hint: '' },
  { icon: 'clipboard-list', label: '待审核报名', value: '—', hint: '' },
])

const quickLinks = [
  { icon: 'shield', title: '管理员账户管理', desc: '创建/删除管理员账户（超级管理员专属）', to: '/super/admin-accounts' },
  { icon: 'users', title: '用户账户管理', desc: '创建/删除用户端账户（超级管理员专属）', to: '/super/user-accounts' },
  { icon: 'circle-check', title: '报名信息审核', desc: '省级报名资格终审、驳回并填写原因', to: '/super/registration-review' },
  { icon: 'star', title: '赛事身份核验', desc: '球员人脸核验识别', to: '/super/identity-verify' },
  { icon: 'video', title: '赛事信息录入', desc: '录入对阵、进球、判罚与裁判信息', to: '/super/match-entry' },
  { icon: 'megaphone', title: '新闻发布', desc: '发布赛事新闻与政策文件', to: '/super/news-manage' },
  { icon: 'clipboard-list', title: '系统参数配置', desc: '全局开关与字典管理', to: '/super/system-config' },
  { icon: 'scroll-text', title: '操作日志', desc: '查看用户操作日志', to: '/super/operation-logs' },
  { icon: 'info', title: '使用说明', desc: '超管端操作流程与权限对照', to: '/super/usage-guide' },
]

const columns = [
  { key: 'todo', label: '待终审报名' },
  { key: 'team', label: '球队', width: '150px' },
  { key: 'time', label: '提交时间', width: '160px' },
  { key: 'status', label: '状态', width: '110px' },
]

type TodoRow = {
  id: number
  todo: string
  team: string
  time: string
  status: string
}

const todos = ref<TodoRow[]>([])

function onAction(action: string, row: Record<string, unknown>) {
  void action
  void row
  router.push('/super/registration-review')
}

onMounted(async () => {
  const [users, teams, regs] = await Promise.all([
    fetchUsers({ page_size: 100 }),
    fetchTeams(),
    fetchRegistrations({ page_size: 100 }),
  ])
  if (users) {
    const admins = users.filter((u) => ADMIN_ROLES.includes(u.role)).length
    const normal = users.filter((u) => USER_ROLES.includes(u.role)).length
    stats.value[0] = { icon: 'crown', label: '管理员账户', value: `${admins} 个`, hint: '含各市州审核员' }
    stats.value[1] = { icon: 'users', label: '用户账户', value: `${normal} 个`, hint: '球队/运动员/教练员等' }
  }
  if (teams) {
    stats.value[2] = { icon: 'shield', label: '报名球队', value: `${teams.length} 支`, hint: '全省注册球队' }
  }
  if (regs) {
    const pending = regs.filter((r) => r.status.startsWith('pending'))
    stats.value[3] = { icon: 'clipboard-list', label: '待审核报名', value: `${pending.length} 份`, hint: '含市州初审/省级终审' }
    // 超管待办聚焦省级终审环节
    todos.value = pending
      .filter((r) => r.status === 'pending_province_review')
      .slice(0, 6)
      .map((r: RegistrationList) => ({
        id: r.id,
        todo: `${r.tournament_name}（${r.group_type_display}）`,
        team: r.team_name,
        time: (r.submit_time || '').slice(0, 16).replace('T', ' '),
        status: r.status_display,
      }))
  }
})
</script>

<template>
  <PageHeader title="全省数据总览" desc="超级管理员：继承管理员端全部功能，另负责省级审核与系统管理" />

  <div class="stat-grid">
    <StatCard v-for="s in stats" :key="s.label" v-bind="s" />
  </div>

  <h3 class="section-title">快捷入口</h3>
  <div class="quick-grid">
    <router-link v-for="q in quickLinks" :key="q.title" :to="q.to" class="quick-card">
      <span class="quick-icon">
        <AppIcon :name="q.icon" :size="24" />
      </span>
      <p class="quick-title">{{ q.title }}</p>
      <p class="quick-desc">{{ q.desc }}</p>
    </router-link>
  </div>

  <h3 class="section-title">待办提醒</h3>
  <p v-if="!todos.length" class="page-tip">暂无待省级终审的报名，市州初审通过后将在此提醒。</p>
  <DataTable v-else :columns="columns" :rows="todos" :actions="['去处理']" @action="onAction" />
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
