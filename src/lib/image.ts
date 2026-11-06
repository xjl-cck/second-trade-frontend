import { API_BASE } from './http'

const OSS_PUBLIC_DOMAIN = (import.meta.env.VITE_OSS_PUBLIC_DOMAIN ?? '').replace(/\/+$/, '')

export function imageUrl(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  if (/^(https?:|data:|blob:)/i.test(value)) {
    return value
  }

  if (value.startsWith('/')) {
    return `${API_BASE}${value}`
  }

  return OSS_PUBLIC_DOMAIN ? `${OSS_PUBLIC_DOMAIN}/${value.replace(/^\/+/, '')}` : value
}
