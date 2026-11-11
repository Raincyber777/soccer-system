// 业务失败 / 网络失败统一异常：页面只捕获 ApiError，mock 与真实接口行为一致
export class ApiError extends Error {
  constructor(
    public readonly code: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
