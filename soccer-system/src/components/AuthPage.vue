<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth, personaLabels, type UserPersona, type UserRole } from '../stores/auth'
import { authApi, ApiError, type DemoAccount, type LoginEntry, type LoginResult } from '../api'
import AppIcon from './common/AppIcon.vue'
import SchoolSelect from './common/SchoolSelect.vue'
import type { SchoolInfo } from '../data/sichuan-schools'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

// 两入口登录：同一个组件按路由 meta.entry 渲染「用户端」或「管理员入口」
// 管理员入口由普通管理员和超级管理员共用，登录后按角色进入各自的工作台
const entry = computed<LoginEntry>(() => (route.meta.entry as LoginEntry | undefined) ?? 'user')
const isUserEntry = computed(() => entry.value === 'user')

const entryMeta: Record<LoginEntry, { tag: string; title: string; desc: string; hint: string }> = {
  user: {
    tag: '用户端',
    title: '参赛用户登录',
    desc: '球队负责人 / 学生运动员 / 教练员',
    hint: '请使用报名时注册的账号登录；账号与所属学校绑定，如忘记密码请联系所在学校赛事负责人。',
  },
  admin: {
    tag: '管理员入口',
    title: '管理员登录',
    desc: '校级管理员 / 普通管理员 / 超级管理员共用入口',
    hint: '校级、普通与超级管理员共用本入口，登录后按账号身份进入对应工作台；账号由省级系统统一分配，不开放注册。',
  },
}
const meta = computed(() => entryMeta[entry.value])

// 登录 / 注册标签页只出现在用户端；管理员入口只有登录
type Tab = 'login' | 'register'
const activeTab = ref<Tab>(route.path === '/register' ? 'register' : 'login')
watch(
  () => route.path,
  (p) => {
    activeTab.value = p === '/register' ? 'register' : 'login'
  },
)

// 当前入口可用的演示账号（管理员入口同时返回普通管理员与超级管理员）
const demoAccounts = computed(() => authApi.listDemoAccounts(entry.value))

const form = reactive({ account: '', password: '' })
const showPassword = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const loading = ref(false)

const registerPersona = ref<UserPersona>('leader')
const personaOptions: { value: UserPersona; label: string }[] = [
  { value: 'leader', label: '球队负责人' },
  { value: 'student', label: '学生运动员' },
  { value: 'coach', label: '教练员' },
]

const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
})
const registerSchool = ref<SchoolInfo | null>(null)
const registerMsg = ref('')
const registerSuccess = ref('')
const registering = ref(false)

const DASHBOARD_PATH: Record<UserRole, string> = {
  user: '/user/dashboard',
  admin: '/admin/dashboard',
  super: '/super/dashboard',
  school: '/admin/school/dashboard',
}

// 门户首页等入口可带 redirect 回跳：只接受站内路径，避免被用来跳转外站
const redirectTarget = computed(() => {
  const raw = route.query.redirect
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return ''
  return raw
})

function nextPath(role: UserRole) {
  return role === 'user' && redirectTarget.value ? redirectTarget.value : DASHBOARD_PATH[role]
}

function finishLogin(result: LoginResult) {
  auth.loginWith(result)
  successMsg.value = `登录成功：${result.label}，即将进入系统…`
  setTimeout(() => {
    router.push(nextPath(result.role))
  }, 500)
}

async function handleLogin() {
  errorMsg.value = ''
  successMsg.value = ''
  const account = form.account.trim()
  if (!account || !form.password) {
    errorMsg.value = '请填写账号和密码'
    return
  }

  loading.value = true
  try {
    const result = await authApi.login({ account, password: form.password, entry: entry.value })
    finishLogin(result)
  } catch (error) {
    errorMsg.value = error instanceof ApiError ? error.message : '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

// 演示账号一键登录：同样走 mock 登录，保证账号归属与校验逻辑一致
async function quickLogin(demo: DemoAccount) {
  errorMsg.value = ''
  successMsg.value = `正在以「${demo.label}」进入…`
  loading.value = true
  try {
    const result = await authApi.login({
      account: demo.account,
      password: demo.password,
      entry: entry.value,
    })
    finishLogin(result)
  } catch (error) {
    errorMsg.value = error instanceof ApiError ? error.message : '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

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

  registering.value = true
  try {
    const result = await authApi.register({
      username: registerForm.username.trim(),
      password: registerForm.password,
      email: registerForm.email.trim(),
      school: registerSchool.value.name,
      schoolCode: registerSchool.value.code,
      persona: registerPersona.value,
    })
    auth.loginWith(result)
    registerSuccess.value = `注册成功，正在以「${personaLabels[registerPersona.value]}」身份进入用户端…`
    setTimeout(() => {
      router.push(nextPath(result.role))
    }, 700)
  } catch (error) {
    registerMsg.value = error instanceof ApiError ? error.message : '注册失败，请稍后重试'
  } finally {
    registering.value = false
  }
}
</script>

<template>
  <div class="auth-page" :class="`entry-${entry}`">
    <div class="auth-card">
      <!-- 顶部：品牌 + 入口标签 + 关闭按钮 -->
      <div class="auth-head">
        <router-link to="/" class="auth-brand">
          <AppIcon name="ball" :size="22" class="brand-ball" />
          绿茵汇
          <span class="portal-tag" :class="`tag-${entry}`">{{ meta.tag }}</span>
        </router-link>
        <router-link to="/" class="auth-close" title="返回首页" aria-label="返回首页">
          <AppIcon name="x" :size="16" />
        </router-link>
      </div>

      <div class="portal-title">
        <h2>{{ meta.title }}</h2>
        <p>{{ meta.desc }}</p>
      </div>

      <!-- 登录 / 注册标签页（仅用户端） -->
      <div v-if="isUserEntry" class="auth-tabs">
        <button
          type="button"
          class="auth-tab"
          :class="{ active: activeTab === 'login' }"
          @click="activeTab = 'login'"
        >
          登录
        </button>
        <button
          type="button"
          class="auth-tab"
          :class="{ active: activeTab === 'register' }"
          @click="activeTab = 'register'"
        >
          注册
        </button>
      </div>

      <!-- 演示账号区：只展示当前入口允许登录的账号 -->
      <div v-if="demoAccounts.length" class="demo-box">
        <p class="demo-title">当前入口演示账号（点击一键登录）</p>
        <div class="demo-list">
          <button
            v-for="demo in demoAccounts"
            :key="demo.account"
            type="button"
            class="demo-item"
            :disabled="loading"
            @click="quickLogin(demo)"
          >
            <span class="demo-icon">
              <AppIcon :name="demo.icon" :size="15" />
            </span>
            <span class="demo-label">{{ demo.label }}</span>
            <span class="demo-account">{{ demo.account }}</span>
          </button>
        </div>
      </div>

      <!-- 登录表单：登录角色由账号决定，不在这里手选 -->
      <template v-if="!isUserEntry || activeTab === 'login'">
        <form class="auth-form" @submit.prevent="handleLogin">
          <label class="form-label" for="auth-account">账号</label>
          <div class="input-wrap">
            <input
              id="auth-account"
              v-model="form.account"
              class="form-input"
              type="text"
              :placeholder="entry === 'user' ? '用户名 / 手机号' : '管理员账号'"
              autocomplete="username"
            />
          </div>

          <label class="form-label" for="auth-password">密码</label>
          <div class="input-wrap">
            <input
              id="auth-password"
              v-model="form.password"
              class="form-input"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              autocomplete="current-password"
            />
            <button
              type="button"
              class="eye-btn"
              :title="showPassword ? '隐藏密码' : '显示密码'"
              :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              @click="showPassword = !showPassword"
            >
              <AppIcon :name="showPassword ? 'eye-off' : 'eye'" :size="17" />
            </button>
          </div>

          <p class="login-hint">{{ meta.hint }}</p>

          <p v-if="errorMsg" class="form-error">{{ errorMsg }}</p>
          <p v-if="successMsg" class="form-success">{{ successMsg }}</p>

          <button type="submit" class="auth-submit" :disabled="loading">
            {{ loading ? '登录中…' : '登 录' }}
          </button>
        </form>

        <div class="or-divider"><span>或</span></div>

        <router-link to="/" class="guest-btn">
          <AppIcon name="user" :size="16" class="guest-icon" />
          游客一键浏览首页
        </router-link>
      </template>

      <!-- 注册表单：只在用户端 -->
      <template v-else>
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

          <button type="submit" class="auth-submit" :disabled="registering">
            {{ registering ? '注册中…' : '注 册' }}
          </button>
        </form>

        <p class="register-tip">
          所属学校通过学校标识码精准绑定，避免重名错填；参赛账号（球队负责人 / 学生运动员 / 教练员）注册成功即可登录报名系统。
        </p>
      </template>

    </div>

    <!-- 背景装饰的大足球（线性图标，低透明度） -->
    <div class="bg-ball" aria-hidden="true">
      <AppIcon name="ball" :size="420" :stroke-width="1.2" />
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100%;
  background: linear-gradient(135deg, var(--green-deeper), var(--green) 130%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  position: relative;
  overflow: hidden;
}

/* 管理员入口用更深的底色，与用户端明显区分 */
.entry-admin {
  background: linear-gradient(135deg, #0d2b1f, #1c5437 130%);
}

.bg-ball {
  position: absolute;
  right: -70px;
  bottom: -90px;
  color: #fff;
  opacity: 0.06;
  pointer-events: none;
  line-height: 0;
}

.auth-card {
  width: min(460px, 100%);
  background: #fff;
  border-radius: 16px;
  padding: 30px 36px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  position: relative;
  z-index: 1;
}

.auth-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.auth-brand {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 20px;
  font-weight: 800;
  color: var(--green-dark);
  letter-spacing: 2px;
}

.brand-ball {
  color: var(--green);
}

.portal-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 999px;
  letter-spacing: 1px;
}

.tag-user {
  background: var(--green-light);
  color: var(--green-dark);
}

.tag-admin {
  background: var(--green-deeper);
  color: #fff;
}

.tag-super {
  background: #f5c445;
  color: #5c4400;
}

.auth-close {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #f1f4f1;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}

.auth-close:hover {
  background: var(--green-light);
  color: var(--green-dark);
}

.portal-title {
  margin-top: 18px;
}

.portal-title h2 {
  font-size: 18px;
  color: var(--ink);
  font-weight: 700;
}

.portal-title p {
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
}

/* 标签页 */
.auth-tabs {
  display: flex;
  gap: 28px;
  margin-top: 16px;
  border-bottom: 1px solid var(--line);
}

.auth-tab {
  background: none;
  border: none;
  padding: 10px 2px;
  font-size: 16px;
  color: var(--muted);
  cursor: pointer;
  border-bottom: 3px solid transparent;
  margin-bottom: -1px;
  transition: color 0.2s, border-color 0.2s;
}

.auth-tab.active {
  color: var(--ink);
  font-weight: 700;
  border-bottom-color: var(--green-dark);
}

/* 演示账号 */
.demo-box {
  margin-top: 16px;
  background: var(--green-light);
  border-radius: 10px;
  padding: 12px 14px;
}

.demo-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--green-dark);
  letter-spacing: 1px;
}

.demo-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.demo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid #d9e6dc;
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  text-align: left;
}

.demo-item:hover:not(:disabled) {
  border-color: var(--green);
  box-shadow: 0 2px 8px rgba(30, 122, 63, 0.12);
}

.demo-item:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.demo-icon {
  display: inline-flex;
  align-items: center;
  color: var(--green-dark);
}

.demo-label {
  color: var(--ink);
  font-weight: 600;
  flex: 1;
}

.demo-account {
  color: var(--muted);
  font-family: Consolas, monospace;
}

/* 表单 */
.auth-form {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 6px;
}

.input-wrap {
  position: relative;
  margin-bottom: 14px;
}

.form-input {
  width: 100%;
  padding: 11px 14px;
  border: 1.5px solid #d8e2da;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-wrap .form-input {
  padding-right: 42px;
}

.form-input.plain {
  margin-bottom: 14px;
}

.reg-school {
  margin-bottom: 14px;
}

.form-input:focus {
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(30, 122, 63, 0.15);
}

.eye-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: none;
  color: var(--muted);
  cursor: pointer;
  padding: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.eye-btn:hover {
  color: var(--green);
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

.login-hint {
  font-size: 12px;
  color: var(--muted);
  background: #f6f5ef;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 12px;
  line-height: 1.6;
}

.form-error {
  color: #c0392b;
  font-size: 13px;
  margin-bottom: 10px;
}

.form-success {
  color: var(--green);
  font-size: 13px;
  margin-bottom: 10px;
}

.auth-submit {
  background: var(--green);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 4px;
  text-indent: 4px;
  transition: background 0.2s;
  cursor: pointer;
}

.auth-submit:hover:not(:disabled) {
  background: var(--green-bright);
}

.auth-submit:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.or-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--muted);
  font-size: 12px;
  margin: 18px 0 12px;
}

.or-divider::before,
.or-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--line);
}

.guest-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1.5px solid #d8e2da;
  border-radius: 8px;
  padding: 11px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  transition: border-color 0.2s, color 0.2s;
}

.guest-icon {
  color: var(--muted);
  transition: color 0.2s;
}

.guest-btn:hover .guest-icon {
  color: var(--green);
}

.guest-btn:hover {
  border-color: var(--green);
  color: var(--green);
}

.register-tip {
  margin-top: 14px;
  font-size: 12px;
  color: var(--muted);
  text-align: center;
  line-height: 1.7;
}

</style>
