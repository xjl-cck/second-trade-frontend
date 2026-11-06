import { computed, ref } from 'vue'

import type { UserProfile } from '@/types/api'
import { startRealtime, stopRealtime } from './realtime'

const token = ref(localStorage.getItem('auth-token') ?? '')
const user = ref<UserProfile | null>(loadUser())

function loadUser() {
  const raw = localStorage.getItem('auth-user')
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as UserProfile
  } catch {
    return null
  }
}

function persist() {
  if (token.value) {
    localStorage.setItem('auth-token', token.value)
  } else {
    localStorage.removeItem('auth-token')
  }

  if (user.value) {
    localStorage.setItem('auth-user', JSON.stringify(user.value))
  } else {
    localStorage.removeItem('auth-user')
  }
}

export function useSession() {
  const isLoggedIn = computed(() => Boolean(token.value))

  function setSession(nextToken: string, nextUser: UserProfile) {
    token.value = nextToken
    user.value = nextUser
    persist()
    startRealtime()
  }

  function clearSession() {
    token.value = ''
    user.value = null
    persist()
    stopRealtime()
  }

  return {
    token,
    user,
    isLoggedIn,
    setSession,
    clearSession,
  }
}
