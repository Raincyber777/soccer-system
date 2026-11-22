<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth, personaLabels, type UserPersona } from '../../stores/auth'
import SchoolSelect from '../common/SchoolSelect.vue'
import type { SchoolInfo } from '../../data/sichuan-schools'
import { apiRegister, mapBackendUser, saveAuthSession, clearAuthSession } from '../../api/auth'
import { ApiError } from '../../api/client'

// 注册表单：只面向参赛人员；管理员/超管账号不开放注册，由超级管理员在后台创建
// 提交后端注册接口（注册即返回 JWT 直接进入登录态）
const router = useRouter()
const auth = useAuth()

// 注册身份：参赛三身份进入用户端；校级管理员是管理角色，注册后待市州审核激活
type RegisterPersona = UserPersona | 'schoolAdmin'
const registerPersona = ref<RegisterPersona>('leader')
const personaOptions: { value: RegisterPersona; label: string }[] = [
  { value: 'leader', label: '球队负责人' },
  { value: 'student', label: '学生运动员' },
  { value: 'coach', label: '教练员' },
  { value: 'schoolAdmin', label: '校级管理员' },
]

// 前端身份 → 后端注册角色
const personaToRole: Record<RegisterPersona, 'school' | 'athlete' | 'coach' | 'school_admin'> = {
  leader: 'school',
  student: 'athlete',
  coach: 'coach',
  schoolAdmin: 'school_admin',
}

const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
})
// 所属学校不开放自由填写，统一用学校选择器按「学校标识码」精准绑定
const registerSchool = ref<SchoolInfo | null>(null)
const registerMsg = ref('')
const registerSuccess = ref('')
const registering = ref(false)

async function handleRegister() {
  registerMsg.value = ''
  registerSuccess.value = ''

  if (
    !registerForm.username.trim() ||
    !registerSchool.value ||
    !registerForm.email.trim() ||
    !registerForm.password ||
    !registerForm.confirmPassword
  ) {
    registerMsg.value = '请填写完整的注册信息（所属学校需通过搜索选择）'
    return
  }

  const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailReg.test(registerForm.email)) {
    registerMsg.value = '请输入正确的邮箱格式'
    return
  }

  if (registerForm.password.length < 6) {
    registerMsg.value = '密码长度不能少于 6 位'
    return
  }

  if (registerForm.password !== registerForm.confirmPassword) {
    registerMsg.value = '两次输入的密码不一致'
    return
  }

  const account = registerForm.username.trim()
  registering.value = true
  try {
    // 真实注册：后端校验用户名唯一 + 学校标识码存在，成功即返回 JWT
    const session = await apiRegister({
      username: account,
      password: registerForm.password,
      role: personaToRole[registerPersona.value],
      school_code: registerSchool.value.code,
      email: registerForm.email.trim(),
    })
    const mapped = mapBackendUser(session.user)
    if (registerPersona.value === 'schoolAdmin') {
      // 校级管理员：注册即提交市州审核，审核通过前不能登录；不留任何登录态
      clearAuthSession()
      registerSuccess.value = '注册成功！校级管理员账号需经市州管理员审核激活后方可登录，请等待审核。'
      registerPersona.value = 'leader'
      return
    }
    saveAuthSession(session)
    auth.loginAs(mapped.role, account, mapped.persona ?? registerPersona.value, mapped.staffLabel)
    registerSuccess.value = `注册成功，正在以「${personaLabels[registerPersona.value]}」身份进入用户端…`
    setTimeout(() => {
      router.push('/user/dashboard')
    }, 800)
  } catch (err) {
    // 后端校验失败（用户名已存在/学校不存在等）展示后端原因；网络失败统一提示
    registerMsg.value = err instanceof ApiError ? err.message : '网络异常，注册失败，请稍后重试'
    return
  } finally {
    registering.value = false
  }
}
</script>

<template>
  <form class="auth-form" @submit.prevent="handleRegister">
    <label class="form-label" for="reg-username">用户名（登录账号）</label>
    <input
      id="reg-username"
      v-model="registerForm.username"
      class="form-input plain"
      type="text"
      placeholder="如：fc2026 或球队拼音缩写"
      autocomplete="username"
    />

    <label class="form-label">所属学校（按学校代码精准选择）</label>
    <div class="reg-school">
      <SchoolSelect v-model="registerSchool" />
    </div>

    <div class="role-row">
      <span class="role-label">注册身份</span>
      <label v-for="p in personaOptions" :key="p.value" class="role-option">
        <input v-model="registerPersona" type="radio" :value="p.value" /> {{ p.label }}
      </label>
    </div>

    <label class="form-label" for="reg-email">邮箱</label>
    <input
      id="reg-email"
      v-model="registerForm.email"
      class="form-input plain"
      type="text"
      placeholder="用于登录和找回密码"
      autocomplete="email"
    />

    <label class="form-label" for="reg-password">密码</label>
    <input
      id="reg-password"
      v-model="registerForm.password"
      class="form-input plain"
      type="password"
      placeholder="至少 6 位"
      autocomplete="new-password"
    />

    <label class="form-label" for="reg-confirm">确认密码</label>
    <input
      id="reg-confirm"
      v-model="registerForm.confirmPassword"
      class="form-input plain"
      type="password"
      placeholder="再输入一遍密码"
      autocomplete="new-password"
    />

    <p v-if="registerMsg" class="form-error">{{ registerMsg }}</p>
    <p v-if="registerSuccess" class="form-success">{{ registerSuccess }}</p>

    <button type="submit" class="auth-submit" :disabled="registering">{{ registering ? '注册中…' : '注 册' }}</button>
  </form>

    <p class="register-tip">所属学校通过学校标识码精准绑定；校级管理员注册后需经市州管理员审核激活。</p>
</template>

<style scoped src="./authForm.css"></style>

<style scoped>
.reg-school {
  margin-bottom: 14px;
}

.role-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 13px;
  margin: 2px 0 14px;
}

.role-label {
  color: var(--muted);
}

.role-option {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.role-option input {
  accent-color: var(--green);
}

.register-tip {
  margin-top: 14px;
  font-size: 12px;
  color: var(--muted);
  text-align: center;
  line-height: 1.7;
}
</style>
