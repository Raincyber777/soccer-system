<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth, personaLabels, type UserRole, type UserPersona } from '../stores/auth'
import AppIcon from './common/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

// 登录/注册写在同一张卡片里，用标签页切换；/register 路径进来时默认显示注册页
type Tab = 'login' | 'register'
const activeTab = ref<Tab>(route.path === '/register' ? 'register' : 'login')
watch(
  () => route.path,
  (p) => {
    activeTab.value = p === '/register' ? 'register' : 'login'
  },
)

// 统一登录：一个表单，系统按账号自动识别角色（进哪一端）与身份（用户端菜单），无需手选
const form = reactive({ account: '', password: '' })
const showPassword = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

// 注册身份：注册只面向参赛人员；管理员/超管账号不开放注册，由超级管理员在后台创建
const registerPersona = ref<UserPersona>('leader')
const personaOptions: { value: UserPersona; label: string }[] = [
  { value: 'leader', label: '球队负责人' },
  { value: 'student', label: '学生运动员' },
  { value: 'coach', label: '教练员' },
]

const registerForm = reactive({
  username: '',
  school: '',
  email: '',
  password: '',
  confirmPassword: '',
})
const registerMsg = ref('')
const registerSuccess = ref('')

// 演示账号（内置"账号库"）：登录时按账号反查角色与身份
const demoAccounts: {
  role: UserRole
  persona?: UserPersona
  icon: string
  label: string
  account: string
  password: string
}[] = [
  { role: 'user', persona: 'leader', icon: 'user', label: '用户端 · 球队负责人', account: 'user001', password: '123456' },
  { role: 'user', persona: 'student', icon: 'user', label: '用户端 · 学生运动员', account: 'student001', password: '123456' },
  { role: 'user', persona: 'coach', icon: 'user', label: '用户端 · 教练员', account: 'coach001', password: '123456' },
  { role: 'admin', icon: 'shield', label: '管理员端 · 普通管理员', account: 'admin001', password: '123456' },
  { role: 'super', icon: 'crown', label: '超级管理员端 · 超级管理员', account: 'super001', password: '123456' },
]

// 已注册的参赛账号保存在 localStorage，模拟后端账号库；接入后端时替换这里
interface RegisteredUser {
  account: string
  password: string
  school: string
  email: string
  persona: UserPersona
}
const REGISTERED_KEY = 'soccer-registered-users'

function loadRegistered(): RegisteredUser[] {
  try {
    const raw = localStorage.getItem(REGISTERED_KEY)
    return raw ? (JSON.parse(raw) as RegisteredUser[]) : []
  } catch {
    return []
  }
}

function saveRegistered(list: RegisteredUser[]) {
  try {
    localStorage.setItem(REGISTERED_KEY, JSON.stringify(list))
  } catch {
    /* 忽略存储异常（如隐私模式） */
  }
}

// 账号解析：先查内置演示账号，再查本地已注册账号；都查不到说明账号不存在
function resolveAccount(
  account: string,
): { role: UserRole; persona: UserPersona; password: string; label: string } | null {
  const key = account.trim().toLowerCase()
  const demo = demoAccounts.find((d) => d.account.toLowerCase() === key)
  if (demo) {
    return { role: demo.role, persona: demo.persona ?? 'leader', password: demo.password, label: demo.label }
  }
  const registered = loadRegistered().find((u) => u.account.toLowerCase() === key)
  if (registered) {
    return {
      role: 'user',
      persona: registered.persona,
      password: registered.password,
      label: `用户端 · ${personaLabels[registered.persona]}`,
    }
  }
  return null
}

function dashboardPath(role: UserRole) {
  return role === 'super' ? '/super/dashboard' : role === 'admin' ? '/admin/dashboard' : '/user/dashboard'
}

const roleTexts: Record<UserRole, string> = {
  user: '用户端',
  admin: '管理员端',
  super: '超级管理员端',
}

function handleLogin() {
  errorMsg.value = ''
  successMsg.value = ''

  const account = form.account.trim()
  if (!account || !form.password) {
    errorMsg.value = '请填写账号和密码'
    return
  }

  // 目前没有后端，用本地账号表模拟"按账号识别角色"；接入接口时替换这里
  const found = resolveAccount(account)
  if (!found) {
    errorMsg.value = '账号不存在：可用下方演示账号一键进入，或在「注册」页创建参赛账号'
    return
  }
  if (found.password !== form.password) {
    errorMsg.value = '密码错误，请重新输入'
    return
  }

  auth.loginAs(found.role, account, found.role === 'user' ? found.persona : undefined)
  successMsg.value = `登录成功：${found.label}，即将进入${roleTexts[found.role]}…`
  setTimeout(() => {
    router.push(dashboardPath(found.role))
  }, 600)
}

// 演示账号一键登录
function quickLogin(demo: (typeof demoAccounts)[number]) {
  errorMsg.value = ''
  successMsg.value = `正在以「${demo.label}」进入…`
  auth.loginAs(demo.role, demo.account, demo.role === 'user' ? (demo.persona ?? 'leader') : undefined)
  setTimeout(() => {
    router.push(dashboardPath(demo.role))
  }, 400)
}

function handleRegister() {
  registerMsg.value = ''
  registerSuccess.value = ''

  if (
    !registerForm.username.trim() ||
    !registerForm.school.trim() ||
    !registerForm.email.trim() ||
    !registerForm.password ||
    !registerForm.confirmPassword
  ) {
    registerMsg.value = '请填写完整的注册信息'
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
  const taken =
    demoAccounts.some((d) => d.account.toLowerCase() === account.toLowerCase()) ||
    loadRegistered().some((u) => u.account.toLowerCase() === account.toLowerCase())
  if (taken) {
    registerMsg.value = '该账号已被注册，请换一个用户名'
    return
  }

  // 模拟注册成功：写入本地"账号库"并直接登录进入用户端；接入后端时替换这里
  const list = loadRegistered()
  list.push({
    account,
    password: registerForm.password,
    school: registerForm.school.trim(),
    email: registerForm.email.trim(),
    persona: registerPersona.value,
  })
  saveRegistered(list)

  auth.loginAs('user', account, registerPersona.value)
  registerSuccess.value = `注册成功，正在以「${personaLabels[registerPersona.value]}」身份进入用户端…`
  setTimeout(() => {
    router.push('/user/dashboard')
  }, 800)
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <!-- 顶部：品牌 + 关闭按钮 -->
      <div class="auth-head">
        <router-link to="/" class="auth-brand">
          <AppIcon name="ball" :size="22" class="brand-ball" />
          绿茵汇
        </router-link>
        <router-link to="/" class="auth-close" title="返回首页" aria-label="返回首页">
          <AppIcon name="x" :size="16" />
        </router-link>
      </div>

      <!-- 登录 / 注册标签页 -->
      <div class="auth-tabs">
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

      <!-- 演示账号区：点击一键登录 -->
      <div class="demo-box">
        <p class="demo-title">演示账号（点击一键登录）</p>
        <div class="demo-list">
          <button
            v-for="demo in demoAccounts"
            :key="demo.account"
            type="button"
            class="demo-item"
            @click="quickLogin(demo)"
          >
            <span class="demo-icon">
              <AppIcon :name="demo.icon" :size="15" />
            </span>
            <span class="demo-label">{{ demo.label }}</span>
            <span class="demo-account">{{ demo.account }} / {{ demo.password }}</span>
          </button>
        </div>
      </div>

      <!-- 登录表单：账号密码即可，角色与身份由账号自动识别 -->
      <template v-if="activeTab === 'login'">
        <form class="auth-form" @submit.prevent="handleLogin">
          <label class="form-label" for="auth-account">账号</label>
          <div class="input-wrap">
            <input
              id="auth-account"
              v-model="form.account"
              class="form-input"
              type="text"
              placeholder="用户名 / 手机号"
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

          <p class="login-hint">统一登录入口：系统按账号自动进入对应端——参赛人员进用户端，管理人员进管理后台，菜单权限随身份加载。</p>

          <p v-if="errorMsg" class="form-error">{{ errorMsg }}</p>
          <p v-if="successMsg" class="form-success">{{ successMsg }}</p>

          <button type="submit" class="auth-submit">登 录</button>
        </form>

        <div class="or-divider"><span>或</span></div>

        <router-link to="/" class="guest-btn">
          <AppIcon name="user" :size="16" class="guest-icon" />
          游客一键浏览首页
        </router-link>
      </template>

      <!-- 注册表单：只面向参赛人员 -->
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

          <label class="form-label" for="reg-school">所属学校 / 单位</label>
          <input
            id="reg-school"
            v-model="registerForm.school"
            class="form-input plain"
            type="text"
            placeholder="球队或学校全称，如：实验中学"
            autocomplete="organization"
          />

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

          <button type="submit" class="auth-submit">注 册</button>
        </form>

        <p class="register-tip">
          参赛账号（球队负责人 / 学生运动员 / 教练员）注册后即可登录；<br />
          管理员与超级管理员账号不开放注册，由超级管理员在后台统一创建。
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

/* 背景装饰的大足球（线性图标） */
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
  padding: 32px 36px;
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

.auth-close {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #f1f4f1;
  color: var(--muted);
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}

.auth-close:hover {
  background: var(--green-light);
  color: var(--green-dark);
}

/* 标签页 */
.auth-tabs {
  display: flex;
  gap: 28px;
  margin-top: 20px;
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

.demo-item:hover {
  border-color: var(--green);
  box-shadow: 0 2px 8px rgba(30, 122, 63, 0.12);
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
}

.auth-submit:hover {
  background: var(--green-bright);
}

/* 或 分隔线 */
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
