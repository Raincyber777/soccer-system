<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../../components/common/PageHeader.vue'
import StatCard from '../../components/common/StatCard.vue'
import DataTable from '../../components/common/DataTable.vue'
import AppIcon from '../../components/common/AppIcon.vue'
import { fetchPlayers, fetchCoaches } from '../../api/person'
import { fetchTeams } from '../../api/team'
import { fetchRegistrations, type RegistrationList } from '../../api/registration'

// 管理控制台：统计卡读真实数据（球队/球员/教练员/待初审报名），待办取自待初审报名单

const router = useRouter()

const stats = ref([
  { icon: 'shield', label: '报名球队', value: '—', hint: '' },
  { icon: 'user', label: '注册球员', value: '—', hint: '' },
  { icon: 'medal', label: '注册教练员', value: '—', hint: '' },
  { icon: 'clipboard-list', label: '待初审报名', value: '—', hint: '' },
])

const quickLinks = [
  { icon: 'clipboard-list', title: '报名初审', desc: '本区域报名材料初审，通过后提交省级终审', to: '/admin/registration-first-review' },
  { icon: 'users', title: '用户账户', desc: '本区域账户日常管理：开户、重置密码、禁用/启用', to: '/admin/user-accounts' },
  { icon: 'shield', title: '管理员账户（只读）', desc: '查看同级管理员基本信息，不可操作', to: '/admin/admin-accounts' },
  { icon: 'video', title: '赛事图文直播', desc: '进入直播间发布图文赛况', to: '/admin/live-text' },
  { icon: 'circle-check', title: '赛事信息录入', desc: '录入对阵、进球、判罚与裁判信息', to: '/admin/match-entry' },
  { icon: 'megaphone', title: '新闻发布', desc: '发布赛事新闻与政策文件', to: '/admin/news-manage' },
  { icon: 'user', title: '球员管理', desc: '搜索、公示、重置球员账号', to: '/admin/player-manage' },
  { icon: 'star', title: '初选评分', desc: '足球遴选队员初选评分与汇总导出', to: '/admin/selection-manage' },
  { icon: 'scroll-text', title: '操作日志', desc: '查看用户操作日志', to: '/admin/operation-logs' },
  { icon: 'info', title: '使用说明', desc: '管理员端操作流程指引', to: '/admin/usage-guide' },
]

const columns = [
  { key: 'todo', label: '待初审报名' },
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
  router.push('/admin/registration-first-review')
}

onMounted(async () => {
  const [teams, players, coaches, regs] = await Promise.all([
    fetchTeams(),
    fetchPlayers(),
    fetchCoaches(),
    fetchRegistrations({ page_size: 100 }),
  ])
  if (teams) {
    stats.value[0] = { icon: 'shield', label: '报名球队', value: `${teams.length} 支`, hint: '全省注册球队' }
  }
  if (players) {
    const active = players.filter((p) => p.status === 'active').length
    stats.value[1] = { icon: 'user', label: '注册球员', value: `${players.length} 人`, hint: `已生效 ${active} 人` }
  }
  if (coaches) {
    const active = coaches.filter((c) => c.status === 'active').length
    stats.value[2] = { icon: 'medal', label: '注册教练员', value: `${coaches.length} 人`, hint: `已生效 ${active} 人` }
  }
  if (regs) {
    const pending = regs.filter((r) => r.status === 'pending_city_review')
    stats.value[3] = { icon: 'clipboard-list', label: '待初审报名', value: `${pending.length} 份`, hint: '本区域初审待办' }
    todos.value = pending.slice(0, 6).map((r: RegistrationList) => ({
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
  <PageHeader title="管理控制台" desc="赛事报名、门户内容与球员数据的总体情况" />

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
  <p v-if="!todos.length" class="page-tip">暂无待初审报名，有新报名提交后将在此提醒。</p>
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
