import type { UserRole } from '../../stores/auth'

// 登录共用的纯前端工具：按角色跳对应端的工作台

export function dashboardPath(role: UserRole) {
  return role === 'super' ? '/super/dashboard' : role === 'admin' ? '/admin/dashboard' : '/user/dashboard'
}

export const roleTexts: Record<UserRole, string> = {
  user: '用户端',
  admin: '管理员端',
  super: '超级管理员端',
}
