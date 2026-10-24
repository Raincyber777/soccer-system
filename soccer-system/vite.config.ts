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
  server: {
    proxy: {
      // 开发环境把 /api 代理到队友的本地 Django（可用 .env 的 VITE_API_TARGET 覆盖）
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
