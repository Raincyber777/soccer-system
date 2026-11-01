<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../../components/common/PageHeader.vue'
import DataForm from '../../components/common/DataForm.vue'
import type { FormField } from '../../components/common/types'
import { changePassword, errMsg, fetchMe, updateMe } from '../../api/account'
import { useAuth } from '../../stores/auth'
import { confirmDialog } from '../../components/common/dialog'

// 个人中心：基础资料 + 实名认证（PATCH /api/auth/me/，后端仅接受姓名/电话/邮箱/单位/身份证白名单，
// 身份证仅回显脱敏形式）与登录密码（PUT /api/auth/password/，旧密码校验）。

const router = useRouter()
const auth = useAuth()

const baseFields: FormField[] = [
  { key: 'name', label: '姓名 / 单位名' },
  { key: 'phone', label: '手机号' },
  { key: 'email', label: '邮箱' },
  { key: 'unit', label: '所属学校 / 单位' },
  { key: 'idCard', label: '身份证号（实名认证）', placeholder: '18 位；用于关联个人参赛数据，已认证则无需重复填写' },
]

const passwordFields: FormField[] = [
  { key: 'oldPassword', label: '原密码', type: 'password', placeholder: '请输入原密码' },
  { key: 'newPassword', label: '新密码', type: 'password', placeholder: '至少 6 位' },
  { key: 'confirmPassword', label: '确认新密码', type: 'password', placeholder: '再输入一遍新密码' },
]

const baseInitial = ref<Record<string, string>>({})
const idCardMasked = ref('')
const formKey = ref(0)

onMounted(async () => {
  const me = await fetchMe()
  if (!me) return // 后端不可用：表单留空手动填写
  baseInitial.value = {
    name: me.real_name,
    phone: me.phone,
    email: me.email,
    unit: me.unit_name,
  }
  idCardMasked.value = me.id_card_masked ?? ''
  formKey.value++
})

async function onSubmitBase(data: Record<string, string>) {
  const idCard = (data.idCard ?? '').trim()
  if (idCard && !/^\d{17}[\dXx]$/.test(idCard)) {
    alert('身份证号格式不正确（应为 18 位）')
    return
  }
  try {
    await updateMe({
      real_name: data.name?.trim() ?? '',
      phone: data.phone?.trim() ?? '',
      email: data.email?.trim() ?? '',
      unit_name: data.unit?.trim() ?? '',
      ...(idCard ? { id_card: idCard } : {}),
    })
    alert('基础信息已保存')
    const me = await fetchMe()
    idCardMasked.value = me?.id_card_masked ?? ''
  } catch (err) {
    alert(errMsg(err))
  }
}

async function onSubmitPassword(data: Record<string, string>) {
  const newPassword = data.newPassword ?? ''
  if (newPassword.length < 6) {
    alert('新密码长度不能少于 6 位')
    return
  }
  if (newPassword !== data.confirmPassword) {
    alert('两次输入的新密码不一致')
    return
  }
  try {
    await changePassword(data.oldPassword ?? '', newPassword)
    alert('密码修改成功，请牢记新密码')
  } catch (err) {
    alert(errMsg(err))
  }
}

async function handleLogout() {
  const ok = await confirmDialog({
    title: '退出登录',
    message: '确定要退出当前账户吗？退出后需重新登录才能继续操作。',
    confirmText: '确认退出',
    danger: true,
  })
  if (!ok) return
  auth.logout()
  router.push('/')
}
</script>

<template>
  <PageHeader title="个人中心" desc="维护账户基础信息、完成实名认证、修改登录密码" />

  <p class="page-tip">
    实名认证：{{ idCardMasked ? `已认证（${idCardMasked}）` : '未认证——填写身份证号保存后完成认证，认证后可在「我的参赛数据」查看个人技术统计' }}。
    身份证仅用于与注册球员信息匹配，系统只展示脱敏形式（保留前 6 位与后 4 位）。
  </p>

  <h3 class="section-title">基础信息</h3>
  <DataForm
    :key="formKey"
    :fields="baseFields"
    :initial="baseInitial"
    submit-text="保存"
    @submit="onSubmitBase"
  />

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
