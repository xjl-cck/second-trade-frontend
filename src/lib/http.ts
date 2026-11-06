import type { ApiResult } from '@/types/api'

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081'

export class HttpError extends Error {
  status: number

  constructor(message: string, status = 0) {
    super(message)
    this.status = status
  }
}

function getToken() {
  return localStorage.getItem('auth-token') ?? ''
}

export async function request<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  })

  const payload = (await response.json()) as ApiResult<T>
  if (!response.ok) {
    throw new HttpError(payload?.msg || response.statusText, response.status)
  }
  if (payload.code !== 200) {
    throw new HttpError(payload.msg || '请求失败', payload.code)
  }
  return payload.data as T
}
