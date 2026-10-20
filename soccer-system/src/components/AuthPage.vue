<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth, type UserRole, type UserPersona } from '../stores/auth'
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

// 登录方式：账号 / 手机号
const loginMode = ref<'account' | 'phone'>('account')

// 登录后进入哪一端
const targetRole = ref<UserRole>('user')

// 用户端登录身份：决定用户端里"我的球队 / 运动员中心 / 教练员中心"菜单的可见性
const persona = ref<UserPersona>('leader')

const personaOptions: { value: UserPersona; label: string }[] = [
  { value: 'leader', label: '球队负责人' },
  { value: 'student', label: '学生运动员' },
  { value: 'coach', label: '教练员' },
]

const form = reactive({
  account: '',
  phone: '',
  password: '',
})

// v-model 不能直接绑定三元表达式，用计算属性按登录方式读写对应字段
const accountModel = computed<string>({
  get: () => (loginMode.value === 'phone' ? form.phone : form.account),
  set: (value) => {
    if (loginMode.value === 'phone') {
      form.phone = value
    } else {
      form.account = value
    }
  },
})

const registerForm = reactive({
  username: '',
  school: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const showPassword = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const registerMsg = ref('')

// 演示账号：点击直接填入表单，方便查看三个端与用户端的不同身份
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

function fillDemo(demo: (typeof demoAccounts)[number]) {
  activeTab.value = 'login'
  loginMode.value = 'account'
  targetRole.value = demo.role
  persona.value = demo.persona ?? 'leader'
  form.account = demo.account
  form.phone = ''
  form.password = demo.password
  errorMsg.value = ''
  registerMsg.value = ''
  successMsg.value = `已填入「${demo.label}」的演示账号，点击「登 录」即可进入`
}

const roleTexts: Record<UserRole, string> = {
  user: '用户端',
  admin: '管理员端',
  super: '超级管理员端',
}

function handleLogin() {
  errorMsg.value = ''
  successMsg.value = ''

  const account = loginMode.value === 'phone' ? form.phone : form.account
  if (!account.trim() || !form.password) {
    errorMsg.value = '请填写完整的账号和密码'
    return
  }

  // 目前没有后端，先模拟登录成功，接入接口时替换这里
  auth.loginAs(targetRole.value, account, targetRole.value === 'user' ? persona.value : undefined)
  successMsg.value = `登录成功，即将进入${roleTexts[targetRole.value]}…`
  const homePath =
    targetRole.value === 'super'
      ? '/super/dashboard'
      : targetRole.value === 'admin'
        ? '/admin/dashboard'
        : '/user/dashboard'
  setTimeout(() => {
    router.push(homePath)
  }, 1000)
}

function handleRegister() {
  registerMsg.value = ''

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

  // 模拟注册成功：切回登录页并带出用户名（演示数据不保存，接入后端时替换）
  form.account = registerForm.username
  form.phone = ''
  form.password = ''
  targetRole.value = 'user'
  activeTab.value = 'login'
  errorMsg.value = ''
  successMsg.value = '注册成功，请使用刚注册的账号登录'
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

      <!-- 演示账号区：三端各一个，点击直接填入 -->
      <div class="demo-box">
        <p class="demo-title">演示账号（点击快速填入）</p>
        <div class="demo-list">
          <button
            v-for="demo in demoAccounts"
            :key="demo.account"
            type="button"
            class="demo-item"
            @click="fillDemo(demo)"
          >
            <span class="demo-icon">
              <AppIcon :name="demo.icon" :size="15" />
            </span>
            <span class="demo-label">{{ demo.label }}</span>
            <span class="demo-account">{{ demo.account }} / {{ demo.password }}</span>
          </button>
        </div>
      </div>

      <!-- 登录表单 -->
      <template v-if="activeTab === 'login'">
        <div class="seg">
          <button
            type="button"
            :class="{ active: loginMode === 'account' }"
            @click="loginMode = 'account'"
          >
            账号登录
          </button>
          <button
            type="button"
            :class="{ active: loginMode === 'phone' }"
            @click="loginMode = 'phone'"
          >
            手机号登录
          </button>
        </div>

        <form class="auth-form" @submit.prevent="handleLogin">
          <label class="form-label" for="auth-account">
            {{ loginMode === 'phone' ? '手机号' : '账号' }}
          </label>
          <div class="input-wrap">
            <input
              id="auth-account"
              v-model="accountModel"
              class="form-input"
              type="text"
              :placeholder="loginMode === 'phone' ? '请输入手机号' : '用户名 / 邮箱'"
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

          <div class="role-row">
            <span class="role-label">进入</span>
            <label class="role-option">
              <input v-model="targetRole" type="radio" value="user" /> 用户端
            </label>
            <label class="role-option">
              <input v-model="targetRole" type="radio" value="admin" /> 管理员端
            </label>
            <label class="role-option">
              <input v-model="targetRole" type="radio" value="super" /> 超级管理员端
            </label>
          </div>

          <!-- 用户端区分登录身份：菜单按身份显示 -->
          <div v-if="targetRole === 'user'" class="role-row">
            <span class="role-label">身份</span>
            <label v-for="p in personaOptions" :key="p.value" class="role-option">
              <input v-model="persona" type="radio" :value="p.value" /> {{ p.label }}
            </label>
          </div>

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

      <!-- 注册表单 -->
      <template v-else>
        <form class="auth-form" @submit.prevent="handleRegister">
          <label class="form-label" for="reg-username">用户名</label>
          <input
            id="reg-username"
            v-model="registerForm.username"
            class="form-input plain"
            type="text"
            placeholder="给自己起个响亮的名字"
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

          <button type="submit" class="auth-submit">注 册</button>
        </form>

        <p class="register-tip">管理员与超级管理员账户不开放注册，由超级管理员在后台创建。</p>
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

/* 登录方式切换 */
.seg {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #f3f2ec;
  border-radius: 10px;
  padding: 4px;
  gap: 4px;
}

.seg button {
  border: none;
  background: transparent;
  border-radius: 8px;
  padding: 9px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.seg button.active {
  background: #fff;
  color: var(--ink);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
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
