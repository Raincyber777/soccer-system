<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import StatCard from '../../components/common/StatCard.vue'
import DataTable from '../../components/common/DataTable.vue'
import AppIcon from '../../components/common/AppIcon.vue'

// 超级管理员控制台：比普通管理员多账户管理维度
const stats = [
  { icon: 'crown', label: '管理员账户', value: 8, hint: '含各市州审核员' },
  { icon: 'users', label: '用户账户', value: 132, hint: '球队/运动员/教练员等' },
  { icon: 'shield', label: '报名球队', value: 128, hint: '较上周 +6' },
  { icon: 'clipboard-list', label: '待审核报名', value: 23, hint: '需尽快处理' },
]

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
  { key: 'todo', label: '待办事项' },
  { key: 'level', label: '优先级', width: '100px' },
  { key: 'deadline', label: '截止时间', width: '160px' },
  { key: 'status', label: '状态', width: '100px' },
]

const todos = [
  { todo: '为绵阳市新设 2 个市级审核员账户', level: '高', deadline: '2026-10-23', status: '待审核' },
  { todo: '终审市州报送的中小学组报名 15 份', level: '高', deadline: '2026-10-24', status: '待审核' },
  { todo: '清理 90 天未登录的休眠账户', level: '低', deadline: '2026-10-31', status: '进行中' },
]

function onAction(action: string) {
  alert(`【演示】${action}：待接入后端`)
}
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
  <DataTable :columns="columns" :rows="todos" :actions="['去处理']" @action="onAction" />
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
