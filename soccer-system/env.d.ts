/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 后端 API 基地址（生产跨域时用，如 https://api.example.com）；留空走同源 / vite 代理 */
  readonly VITE_API_BASE?: string
  /** 开发代理目标：本地 Django 地址，默认 http://127.0.0.1:8000 */
  readonly VITE_API_TARGET?: string
}
