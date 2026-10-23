<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../../stores/auth'
import AppIcon from '../common/AppIcon.vue'
import { dashboardPath, resolveAccount, roleTexts } from './accountStore'

// 登录表单：账号密码即可，角色与身份由账号自动识别
const router = useRouter()
const auth = useAuth()

const form = reactive({ account: '', password: '' })
const showPassword = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

function handleLogin() {
  errorMsg.value = ''
  successMsg.value = ''

  const account = form.account.trim()
  if (!account || !form.password) {
    errorMsg.value = '请填写账号和密码'
    return
  }

  const found = resolveAccount(account)
  if (!found) {
    errorMsg.value = '账号不存在：可用上方演示账号一键进入，或在「注册」页创建参赛账号'
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
</script>

<template>
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

<style scoped src="./authForm.css"></style>

<style scoped>
.login-hint {
  font-size: 12px;
  color: var(--muted);
  background: #f6f5ef;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 12px;
  line-height: 1.6;
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
</style>
