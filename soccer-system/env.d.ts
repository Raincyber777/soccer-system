/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 是否使用本地 mock 服务，默认 true；设为 false 切换到真实后端接口 */
  readonly VITE_USE_MOCK?: string
  /** 真实接口的基地址，同域部署留空即可 */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
