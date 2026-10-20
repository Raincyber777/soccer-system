// 公共组件的类型定义（DataTable / SearchBar / DataForm 共用）

export interface TableColumn {
  key: string
  label: string
  width?: string
}

export interface FormField {
  key: string
  label: string
  type?: 'text' | 'number' | 'date' | 'password' | 'select' | 'textarea'
  options?: string[]
  placeholder?: string
}

export interface SearchField {
  key: string
  label: string
  type?: 'text' | 'select'
  options?: string[]
  placeholder?: string
}
