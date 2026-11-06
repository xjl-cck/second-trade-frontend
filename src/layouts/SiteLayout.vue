<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { startRealtime, subscribeRealtime } from '@/lib/realtime'
import { useSession } from '@/lib/session'

const router = useRouter()
const session = useSession()
const isLoggedIn = computed(() => session.isLoggedIn.value)
const currentUser = computed(() => session.user.value)
const orderNotice = ref('')
let noticeTimer: ReturnType<typeof setTimeout> | null = null
let unsubscribeRealtime: (() => void) | null = null

const navItems = computed(() => [
  { label: '首页', to: '/' },
  { label: '商品', to: '/products' },
  { label: '发布', to: '/publish' },
  { label: '个人中心', to: '/profile' },
  { label: '地址', to: '/addresses' },
  { label: '收藏', to: '/favorites' },
  { label: '私聊', to: '/messages' },
  { label: '订单', to: '/orders' },
  { label: '举报', to: '/reports' },
  ...(currentUser.value?.role === 1 ? [{ label: '后台', to: '/admin' }] : []),
])

function logout() {
  session.clearSession()
  router.push('/')
}

function showOrderNotice(statusText: string, productTitle?: string) {
  orderNotice.value = productTitle ? `${productTitle}：${statusText}` : statusText
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    orderNotice.value = ''
    noticeTimer = null
  }, 5000)
}

onMounted(() => {
  startRealtime()
  unsubscribeRealtime = subscribeRealtime(payload => {
    if (payload.type === 'order-status' && payload.data) {
      showOrderNotice(payload.data.statusText || '订单状态已更新', payload.data.productTitle)
    }
  })
})

onBeforeUnmount(() => {
  unsubscribeRealtime?.()
  if (noticeTimer) clearTimeout(noticeTimer)
})
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <RouterLink to="/" class="brand">
        <span class="brand-mark">闲</span>
        <span class="brand-copy">
          <strong>校园闲置</strong>
          <small>让好物继续流转</small>
        </span>
      </RouterLink>

      <nav class="nav">
        <RouterLink v-for="item in navItems" :key="item.to" :to="item.to">
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="auth-box">
        <template v-if="isLoggedIn">
          <div class="user-chip">
            <span class="avatar">{{ currentUser?.nickname?.slice(0, 1) || 'U' }}</span>
            <div>
              <strong>{{ currentUser?.nickname || '已登录' }}</strong>
              <small>{{ currentUser?.role === 1 ? '平台管理员' : '校园用户' }}</small>
            </div>
          </div>
          <button type="button" class="icon-button" title="退出登录" @click="logout">↗</button>
        </template>
        <template v-else>
          <RouterLink class="login-link" to="/login">登录</RouterLink>
        </template>
      </div>
    </header>

    <main class="content">
      <RouterView />
    </main>

    <Transition name="notice">
      <aside v-if="orderNotice" class="order-notice" role="status">
        <span class="notice-icon">✓</span>
        <div>
          <strong>订单通知</strong>
          <p>{{ orderNotice }}</p>
        </div>
        <button type="button" aria-label="关闭通知" @click="orderNotice = ''">×</button>
      </aside>
    </Transition>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 220px 1fr auto;
  gap: 24px;
  align-items: center;
  padding: 14px max(24px, calc((100vw - 1320px) / 2));
  border-bottom: 1px solid rgba(32, 41, 54, 0.08);
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(18px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  color: #fff;
  background: var(--accent);
  font-weight: 800;
  box-shadow: 0 7px 18px rgba(13, 118, 109, 0.24);
}

.brand-copy {
  display: grid;
  gap: 0;
  color: var(--ink);
}

.brand-copy strong {
  font-size: 0.98rem;
  letter-spacing: 0;
}

.brand-copy small {
  color: var(--muted);
  font-size: 0.72rem;
}

.nav {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}

.nav a,
.link,
.login-link,
.icon-button {
  text-decoration: none;
}

.nav a {
  padding: 9px 12px;
  border-radius: 9px;
  color: var(--muted);
  font-size: 0.88rem;
  transition: color 160ms ease, background 160ms ease;
}

.nav a.router-link-exact-active {
  color: var(--accent-strong);
  background: var(--accent-soft);
}

.auth-box {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 8px 5px 5px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface);
}

.avatar {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-weight: 700;
}

.user-chip strong,
.user-chip small {
  display: block;
}

.user-chip strong {
  color: var(--ink);
}

.user-chip small {
  color: var(--muted);
}

.primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 15px;
  border: 1px solid var(--accent);
  border-radius: 9px;
  cursor: pointer;
}

.primary {
  color: #fff;
  background: var(--accent);
}

.login-link {
  color: var(--muted);
  font-size: 0.9rem;
}

.icon-button {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--line);
  border-radius: 9px;
  color: var(--muted);
  background: var(--surface);
  cursor: pointer;
}

.content {
  width: 100%;
  min-height: calc(100vh - 90px);
}

.order-notice {
  position: fixed;
  top: 84px;
  right: 24px;
  z-index: 60;
  display: flex;
  align-items: flex-start;
  gap: 11px;
  width: min(360px, calc(100vw - 28px));
  padding: 14px 14px 14px 12px;
  border: 1px solid #b9ded5;
  border-radius: 12px;
  color: var(--ink);
  background: #fff;
  box-shadow: 0 16px 36px rgba(32, 41, 54, 0.16);
}

.notice-icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: 50%;
  color: #fff;
  background: var(--accent);
  font-weight: 800;
}

.order-notice strong,
.order-notice p {
  display: block;
}

.order-notice strong {
  font-size: 0.88rem;
}

.order-notice p {
  margin-top: 3px;
  color: var(--muted);
  font-size: 0.82rem;
  line-height: 1.45;
}

.order-notice button {
  margin-left: auto;
  border: 0;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
}

.notice-enter-active,
.notice-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.notice-enter-from,
.notice-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 1080px) {
  .topbar {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .nav {
    justify-content: start;
  }

  .auth-box {
    flex-wrap: wrap;
  }
}

@media (max-width: 720px) {
  .topbar {
    padding: 12px 14px;
  }

  .order-notice {
    top: 14px;
    right: 14px;
  }
}
</style>
