<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const errorMsg = ref('')
const successMsg = ref('')

function handleRegister() {
  errorMsg.value = ''
  successMsg.value = ''

  if (!form.username.trim() || !form.email.trim() || !form.password || !form.confirmPassword) {
    errorMsg.value = '请填写完整的注册信息'
    return
  }

  const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailReg.test(form.email)) {
    errorMsg.value = '请输入正确的邮箱格式'
    return
  }

  if (form.password.length < 6) {
    errorMsg.value = '密码长度不能少于 6 位'
    return
  }

  if (form.password !== form.confirmPassword) {
    errorMsg.value = '两次输入的密码不一致'
    return
  }

  // 目前没有后端，先模拟注册成功，后续接入接口时替换这里
  successMsg.value = '注册成功，即将前往登录…'
  setTimeout(() => {
    router.push('/login')
  }, 1200)
}
</script>

<template>
  <div class="auth-page">
    <router-link to="/" class="auth-back">← 返回首页</router-link>

    <div class="auth-card">
      <router-link to="/" class="auth-brand">⚽ 绿茵汇</router-link>
      <h1 class="auth-title">创建账号</h1>
      <p class="auth-sub">加入绿茵汇，找到你的球队和球友</p>

      <form class="auth-form" @submit.prevent="handleRegister">
        <label class="form-label" for="register-username">用户名</label>
        <input
          id="register-username"
          v-model="form.username"
          class="form-input"
          type="text"
          placeholder="给自己起个响亮的名字"
          autocomplete="username"
        />

        <label class="form-label" for="register-email">邮箱</label>
        <input
          id="register-email"
          v-model="form.email"
          class="form-input"
          type="text"
          placeholder="用于登录和找回密码"
          autocomplete="email"
        />

        <label class="form-label" for="register-password">密码</label>
        <input
          id="register-password"
          v-model="form.password"
          class="form-input"
          type="password"
          placeholder="至少 6 位"
          autocomplete="new-password"
        />

        <label class="form-label" for="register-confirm">确认密码</label>
        <input
          id="register-confirm"
          v-model="form.confirmPassword"
          class="form-input"
          type="password"
          placeholder="再输入一遍密码"
          autocomplete="new-password"
        />

        <p v-if="errorMsg" class="form-error">{{ errorMsg }}</p>
        <p v-if="successMsg" class="form-success">{{ successMsg }}</p>

        <button type="submit" class="auth-submit">注 册</button>
      </form>

      <p class="auth-switch">
        已有账号？<router-link to="/login" class="auth-link">直接登录</router-link>
      </p>
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

/* 背景装饰的大足球 */
.auth-page::after {
  content: '⚽';
  position: absolute;
  left: -80px;
  bottom: -90px;
  font-size: 280px;
  opacity: 0.08;
  pointer-events: none;
}

.auth-back {
  position: absolute;
  top: 24px;
  left: 28px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  transition: color 0.2s;
}

.auth-back:hover {
  color: #fff;
}

.auth-card {
  width: min(420px, 100%);
  background: #fff;
  border-radius: 16px;
  padding: 40px 36px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  position: relative;
  z-index: 1;
}

.auth-brand {
  display: inline-block;
  font-size: 20px;
  font-weight: 800;
  color: var(--green-dark);
  letter-spacing: 2px;
}

.auth-title {
  margin-top: 18px;
  font-size: 26px;
  color: var(--ink);
}

.auth-sub {
  margin-top: 6px;
  font-size: 14px;
  color: var(--muted);
}

.auth-form {
  margin-top: 28px;
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 6px;
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

.form-input:focus {
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(30, 122, 63, 0.15);
}

.form-label + .form-input,
.form-error,
.form-success {
  margin-bottom: 16px;
}

.form-error {
  color: #c0392b;
  font-size: 13px;
  margin-top: -8px;
}

.form-success {
  color: var(--green);
  font-size: 13px;
  margin-top: -8px;
}

.auth-submit {
  margin-top: 6px;
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

.auth-switch {
  margin-top: 22px;
  text-align: center;
  font-size: 14px;
  color: var(--muted);
}

.auth-link {
  color: var(--green);
  font-weight: 600;
}

.auth-link:hover {
  text-decoration: underline;
}
</style>
