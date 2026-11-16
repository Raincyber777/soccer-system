// 公共组件的类型定义（DataTable / SearchBar / DataForm 共用）

export interface TableColumn {
  key: string
  label: string
  width?: string
}

/** 下拉选项：字符串 = 值即文案；对象 = 值与展示分离（如按 id 提交） */
export type SelectOptions = (string | { label: string; value: string })[]

export interface FormField {
  key: string
  label: string
  type?: 'text' | 'number' | 'date' | 'password' | 'select' | 'textarea' | 'custom'
  options?: SelectOptions
  placeholder?: string
  /** type=date 时可选：可选日期范围（YYYY-MM-DD），如出生日期禁选未来 */
  min?: string
  max?: string
}

export interface SearchField {
  key: string
  label: string
  type?: 'text' | 'select'
  options?: SelectOptions
  placeholder?: string
}
