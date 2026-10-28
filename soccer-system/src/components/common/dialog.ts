import { reactive } from 'vue'

// 全局确认/输入弹窗服务：DialogHost 挂在 App.vue，页面以 Promise 方式调用，
// 替代浏览器原生 prompt/confirm（原生弹窗无法定制样式且不居中）。
//
// 用法：
//   const ok = await confirmDialog({ title: '删除', message: '确认删除？', danger: true })
//   const reason = await promptDialog({ title: '驳回', label: '驳回原因', multiline: true, required: true })
//   if (reason === null) return // 用户取消

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  /** 危险操作（如删除）时确认按钮显示红色 */
  danger?: boolean
}

export interface PromptOptions {
  title: string
  /** 弹窗内说明文字（可含 \n，展示时换行） */
  message?: string
  /** 输入框上方标签 */
  label?: string
  initial?: string
  placeholder?: string
  /** 多行输入（textarea） */
  multiline?: boolean
  /** 必填校验：提交为空时阻止并提示 requiredMsg */
  required?: boolean
  requiredMsg?: string
  confirmText?: string
  maxlength?: number
}

type DialogRequest =
  | ({ kind: 'confirm'; resolve: (ok: boolean) => void } & ConfirmOptions)
  | ({ kind: 'prompt'; resolve: (value: string | null) => void } & PromptOptions)

export const dialogState = reactive<{ current: DialogRequest | null }>({ current: null })

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    dialogState.current = { kind: 'confirm', resolve, ...opts }
  })
}

export function promptDialog(opts: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    dialogState.current = { kind: 'prompt', resolve, ...opts }
  })
}

/** 仅 DialogHost 调用：关闭弹窗并回传结果（非字符串一律视为取消） */
export function settleDialog(result: boolean | string | null) {
  const cur = dialogState.current
  if (!cur) return
  dialogState.current = null
  if (cur.kind === 'confirm') cur.resolve(result === true)
  else cur.resolve(typeof result === 'string' ? result : null)
}
