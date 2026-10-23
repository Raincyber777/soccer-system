<script setup lang="ts">
import PageHeader from '../../components/common/PageHeader.vue'
import GuideSteps from '../../components/common/GuideSteps.vue'
import DataTable from '../../components/common/DataTable.vue'
import type { TableColumn } from '../../components/common/types'

// 超级管理员端使用说明：省级审核 + 系统管理 + 统筹运营的完整流程
const steps = [
  {
    title: '登录数据总览',
    desc: '使用省级超级管理员账号登录，进入「全省数据总览」查看账户、报名与待办事项的总体情况。',
  },
  {
    title: '创建下发账户',
    desc: '「账户管理」创建市州 / 高校管理员账号并下发使用，同时可管理用户端各类参赛账户；管理员账号不开放注册。',
  },
  {
    title: '省级终审报名',
    desc: '「省级审核 → 报名信息审核」查询球队报名，执行通过 / 驳回（驳回需填写原因并推送给报送单位），可下载盖章件、报名表与学籍材料。',
  },
  {
    title: '管理报名数据',
    desc: '「报名信息管理」维护报名数据；「报名账号管理」管理各报送单位的报名账号并查看报名日志。',
  },
  {
    title: '赛事身份核验',
    desc: '「省级审核 → 赛事身份核验」对上场球员进行人脸核验，杜绝替赛与冒名顶替。',
  },
  {
    title: '统筹运营功能',
    desc: '超级管理员端继承管理员端全部功能：赛事门户、赛事直播、球员遴选、球员教练管理与操作日志。',
  },
  {
    title: '系统管理',
    desc: '「系统参数配置」控制全局开关与数据字典；「跨区数据权限」为各市州审核员分配可见数据范围。',
  },
]

const permColumns: TableColumn[] = [
  { key: 'func', label: '功能' },
  { key: 'admin', label: '普通管理员', width: '120px' },
  { key: 'super', label: '超级管理员', width: '120px' },
]

const permRows = [
  { func: '门户内容 / 赛事直播 / 遴选 / 球员教练 / 日志', admin: '可用', super: '可用' },
  { func: '报名审核（省级终审）', admin: '不可用', super: '可用' },
  { func: '创建 / 删除管理员账户', admin: '不可用', super: '可用' },
  { func: '创建 / 删除用户账户', admin: '不可用', super: '可用' },
  { func: '查看跨市州数据', admin: '不可用', super: '可用' },
  { func: '系统参数 / 跨区数据权限', admin: '不可用', super: '可用' },
]
</script>

<template>
  <PageHeader title="使用说明" desc="超级管理员端操作指引：省级审核、账户与系统管理流程" />

  <h3 class="section-title">操作流程</h3>
  <GuideSteps :steps="steps" />

  <h3 class="section-title">权限对照</h3>
  <DataTable :columns="permColumns" :rows="permRows" />

  <p class="page-tip">
    提示：超级管理员拥有全站最高权限，涉及审核与账户的操作会记入日志，请谨慎执行。
  </p>
</template>
