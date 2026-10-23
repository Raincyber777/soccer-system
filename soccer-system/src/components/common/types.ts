// 公共组件的类型定义（DataTable / SearchBar / DataForm 共用）

export interface TableColumn {
  key: string
  label: string
  width?: string
}

export interface FormField {
  key: string
  label: string
  type?: 'text' | 'number' | 'date' | 'password' | 'select' | 'textarea' | 'custom'
  options?: string[]
  placeholder?: string
  /** type=date 时可选：可选日期范围（YYYY-MM-DD），如出生日期禁选未来 */
  min?: string
  max?: string
}

export interface SearchField {
  key: string
  label: string
  type?: 'text' | 'select'
  options?: string[]
  placeholder?: string
}
