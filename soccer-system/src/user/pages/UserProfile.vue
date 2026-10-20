<script setup lang="ts">
import { useRouter } from 'vue-router'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import type { FormField } from '../../components/common/types'
import { useAuth } from '../../stores/auth'

// 个人中心（对应需求：用户基础信息、密码修改、退出登录）
const router = useRouter()
const auth = useAuth()

const baseFields: FormField[] = [
  { key: 'name', label: '姓名', placeholder: '请输入姓名' },
  { key: 'phone', label: '手机号', placeholder: '请输入手机号' },
  { key: 'email', label: '邮箱', placeholder: '请输入邮箱' },
  { key: 'unit', label: '所属学校 / 单位', placeholder: '如：实验中学' },
]

const passwordFields: FormField[] = [
  { key: 'oldPassword', label: '原密码', type: 'password', placeholder: '请输入原密码' },
  { key: 'newPassword', label: '新密码', type: 'password', placeholder: '至少 6 位' },
  { key: 'confirmPassword', label: '确认新密码', type: 'password', placeholder: '再输入一遍新密码' },
]

function onSubmitBase(data: Record<string, string>) {
  console.log('基础信息：', data)
  alert('【演示】保存基础信息：待接入后端')
}

function onSubmitPassword(data: Record<string, string>) {
  if (!data.newPassword || data.newPassword.length < 6) {
    alert('新密码长度不能少于 6 位')
    return
  }
  if (data.newPassword !== data.confirmPassword) {
    alert('两次输入的新密码不一致')
    return
  }
  alert('【演示】密码修改：待接入后端')
}

function handleLogout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <PageHeader title="个人中心" desc="维护账户基础信息、修改登录密码" />

  <h3 class="section-title">基础信息</h3>
  <DataForm :fields="baseFields" submit-text="保存" @submit="onSubmitBase" />

  <h3 class="section-title">密码修改</h3>
  <DataForm :fields="passwordFields" submit-text="修改密码" @submit="onSubmitPassword" />

  <div class="logout-row">
    <button type="button" class="btn btn-ghost" @click="handleLogout">退出登录</button>
  </div>
</template>

<style scoped>
.logout-row {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
