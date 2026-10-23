import type { RouteRecordRaw } from 'vue-router'
import UserLayout from '../user/components/UserLayout.vue'

// 用户端路由：meta.group 是侧边栏分组名，meta.title 是菜单名
// meta.personas 限定可见身份（leader 球队负责人 / student 学生运动员 / coach 教练员），不填 = 所有身份可见
// 侧边栏菜单由 UserLayout 根据这份配置 + 当前登录身份自动生成
export const userRoutes: RouteRecordRaw[] = [
  {
    path: '/user',
    component: UserLayout,
    redirect: '/user/dashboard',
    children: [
      // 概览
      { path: 'dashboard', name: 'user-dashboard', component: () => import('../user/pages/UserDashboard.vue'), meta: { title: '工作台', group: '概览' } },
      // 赛事报名（浏览对所有参赛用户开放；报名表与报名资料是球队级操作，仅球队负责人）
      { path: 'tournaments', name: 'user-tournaments', component: () => import('../user/pages/TournamentList.vue'), meta: { title: '赛事列表', group: '赛事报名' } },
      { path: 'registration-form', name: 'user-registration-form', component: () => import('../user/pages/RegistrationForm.vue'), meta: { title: '赛事报名', group: '赛事报名', personas: ['leader'] } },
      { path: 'registrations', name: 'user-registrations', component: () => import('../user/pages/MyRegistrations.vue'), meta: { title: '我的报名', group: '赛事报名' } },
      { path: 'registration-review-info', name: 'user-registration-review-info', component: () => import('../user/pages/RegistrationReviewInfo.vue'), meta: { title: '报名审核信息', group: '赛事报名' } },
      { path: 'registration-docs', name: 'user-registration-docs', component: () => import('../user/pages/RegistrationDocs.vue'), meta: { title: '报名资料', group: '赛事报名', personas: ['leader'] } },
      // 我的球队（团队管理，仅球队负责人；不含个人自助功能）
      { path: 'team-info', name: 'user-team-info', component: () => import('../user/pages/TeamInfo.vue'), meta: { title: '球队信息', group: '我的球队', personas: ['leader'] } },
      { path: 'team-members', name: 'user-team-members', component: () => import('../user/pages/TeamMembers.vue'), meta: { title: '队员列表', group: '我的球队', personas: ['leader'] } },
      { path: 'team-coaches', name: 'user-team-coaches', component: () => import('../user/pages/TeamCoaches.vue'), meta: { title: '教练列表', group: '我的球队', personas: ['leader'] } },
      { path: 'team-history', name: 'user-team-history', component: () => import('../user/pages/TeamHistory.vue'), meta: { title: '球队履历', group: '我的球队', personas: ['leader'] } },
      // 运动员中心（学生本人自助：注册、学籍/证书/获奖等个人履历）
      { path: 'athlete-profile', name: 'user-athlete-profile', component: () => import('../user/pages/AthleteProfile.vue'), meta: { title: '注册与信息', group: '运动员中心', personas: ['student'] } },
      { path: 'athlete-resume', name: 'user-athlete-resume', component: () => import('../user/pages/AthleteResume.vue'), meta: { title: '运动员履历', group: '运动员中心', personas: ['student'] } },
      // 教练员中心（教练本人自助：执教资质、个人信息维护）
      { path: 'coach-profile', name: 'user-coach-profile', component: () => import('../user/pages/CoachProfile.vue'), meta: { title: '注册与信息', group: '教练员中心', personas: ['coach'] } },
      { path: 'coach-resume', name: 'user-coach-resume', component: () => import('../user/pages/CoachResume.vue'), meta: { title: '教练员履历', group: '教练员中心', personas: ['coach'] } },
      // 信息公示（所有用户可见，菜单与分组同名所以直接显示成单项）
      { path: 'publicity', name: 'user-publicity', component: () => import('../user/pages/PublicityView.vue'), meta: { title: '信息公示', group: '信息公示' } },
      // 个人中心
      { path: 'profile', name: 'user-profile', component: () => import('../user/pages/UserProfile.vue'), meta: { title: '个人中心', group: '个人中心' } },
      // 帮助（使用说明按身份拆成三份，meta.personas 限定每个人只看到自己那份）
      { path: 'usage-guide', name: 'user-usage-guide-leader', component: () => import('../user/pages/UsageGuide.vue'), meta: { title: '使用说明', group: '帮助', personas: ['leader'], persona: 'leader' } },
      { path: 'usage-guide-student', name: 'user-usage-guide-student', component: () => import('../user/pages/UsageGuide.vue'), meta: { title: '使用说明', group: '帮助', personas: ['student'], persona: 'student' } },
      { path: 'usage-guide-coach', name: 'user-usage-guide-coach', component: () => import('../user/pages/UsageGuide.vue'), meta: { title: '使用说明', group: '帮助', personas: ['coach'], persona: 'coach' } },
    ],
  },
]
