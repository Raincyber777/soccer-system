<script setup lang="ts">
import { computed } from 'vue'
import PageHeader from '../../components/common/PageHeader.vue'
import StatCard from '../../components/common/StatCard.vue'
import DataTable from '../../components/common/DataTable.vue'
import AppIcon from '../../components/common/AppIcon.vue'
import { useAuth, type UserPersona } from '../../stores/auth'

const auth = useAuth()

// 工作台：用户端首页概览
const stats = [
  { icon: 'shield', label: '我的球队', value: '1 支', hint: '实验中学足球队' },
  { icon: 'trophy', label: '进行中赛事', value: '3 项', hint: '可报名 1 项' },
  { icon: 'clipboard-list', label: '待处理报名', value: '1 份', hint: '等待审核' },
  { icon: 'bell', label: '未读系统消息', value: '2 条', hint: '点击查看' },
]

// 快捷入口按登录身份过滤：personas 不填 = 所有身份可见
const quickLinks: {
  icon: string
  title: string
  desc: string
  to: string
  personas?: UserPersona[]
}[] = [
  { icon: 'clipboard-list', title: '赛事报名', desc: '填写报名表并报送球员信息', to: '/user/registration-form' },
  { icon: 'file-text', title: '我的报名', desc: '查看审核状态、修改报名信息', to: '/user/registrations' },
  { icon: 'circle-check', title: '报名审核信息', desc: '查看审核进度与报名公示', to: '/user/registration-review-info' },
  { icon: 'shield', title: '球队信息', desc: '创建球队、维护队旗队徽资料', to: '/user/team-info', personas: ['leader'] },
  { icon: 'users', title: '队员列表', desc: '维护球队队员信息与照片', to: '/user/team-members', personas: ['leader'] },
  { icon: 'user', title: '运动员信息', desc: '注册表单与个人信息确认', to: '/user/athlete-profile', personas: ['student'] },
  { icon: 'medal', title: '教练员信息', desc: '完善个人信息与执教履历', to: '/user/coach-profile', personas: ['coach'] },
  { icon: 'megaphone', title: '信息公示', desc: '运动员/教练员公示查询', to: '/user/publicity' },
  { icon: 'user', title: '个人中心', desc: '基础信息、密码修改与退出登录', to: '/user/profile' },
]

const visibleLinks = computed(() =>
  quickLinks.filter((q) => !q.personas || (auth.state.persona !== null && q.personas.includes(auth.state.persona))),
)

const columns = [
  { key: 'title', label: '消息标题' },
  { key: 'type', label: '类型', width: '110px' },
  { key: 'time', label: '时间', width: '170px' },
  { key: 'status', label: '状态', width: '100px' },
]

const messages = [
  { title: '2026 年省级青少年足球联赛报名已开始', type: '赛事通知', time: '2026-10-15 09:00', status: '未开始' },
  { title: '你的球队报名表已通过市州审核', type: '审核通知', time: '2026-10-12 16:30', status: '已通过' },
  { title: '请补充上传球员学籍验证材料', type: '材料提醒', time: '2026-10-10 10:20', status: '进行中' },
]

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}
</script>

<template>
  <PageHeader title="工作台" desc="汇总你的球队、报名与消息动态" />

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

  <h3 class="section-title">系统消息</h3>
  <DataTable :columns="columns" :rows="messages" :actions="['查看']" @action="onAction" />
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
