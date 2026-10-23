import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
// base 可用环境变量覆盖：部署脚本用 DEPLOY_BASE=soccer-system 构建 GitHub Pages 版本
// （值不带斜杠：Windows Git Bash 会把以 / 开头的参数和 env 值误转换成本地路径）
export default defineConfig({
  base: process.env.DEPLOY_BASE ? `/${process.env.DEPLOY_BASE}/` : '/',
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
