<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { fetchChatMessages, fetchChatSessions, markChatRead } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { sendRealtimeMessage, socketState, startRealtime, subscribeRealtime } from '@/lib/realtime'
import { useSession } from '@/lib/session'
import type { RealtimePayload } from '@/lib/realtime'
import type { ChatMessage, ChatSession } from '@/types/api'

const route = useRoute()
const session = useSession()
const sessions = ref<ChatSession[]>([])
const messages = ref<ChatMessage[]>([])
const activeSessionId = ref(Number(route.query.sessionId) || 0)
const draft = ref('')
const loading = ref(true)
const error = ref('')
let unsubscribeRealtime: (() => void) | null = null
let refreshTimer: ReturnType<typeof setInterval> | null = null

const activeSession = computed(() => sessions.value.find(item => item.id === activeSessionId.value) ?? null)
const unreadTotal = computed(() => sessions.value.reduce((total, item) => total + (item.unreadCount ?? 0), 0))

async function loadSessions() {
  loading.value = true
  try {
    sessions.value = (await fetchChatSessions()).records
    if (activeSessionId.value) await selectSession(activeSessionId.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '会话加载失败'
  } finally {
    loading.value = false
  }
}

async function selectSession(id: number) {
  activeSessionId.value = id
  try {
    messages.value = (await fetchChatMessages(id)).records.reverse()
    await markChatRead(id)
    const item = sessions.value.find(value => value.id === id)
    if (item) item.unreadCount = 0
    await nextTick()
    document.querySelector('.message-list')?.scrollTo({ top: 999999 })
  } catch (err) {
    error.value = err instanceof Error ? err.message : '消息加载失败'
  }
}

async function refreshActiveChat() {
  try {
    const sessionPage = await fetchChatSessions()
    sessions.value = sessionPage.records
    if (activeSessionId.value) {
      messages.value = (await fetchChatMessages(activeSessionId.value)).records.reverse()
      await markChatRead(activeSessionId.value)
      const item = sessions.value.find(value => value.id === activeSessionId.value)
      if (item) item.unreadCount = 0
      await scrollMessageList()
    }
  } catch {
    // 保持当前聊天内容，避免临时网络波动打断用户输入。
  }
}

async function handleRealtime(payload: RealtimePayload) {
  if (payload.type === 'message' && payload.data) {
    const appended = appendMessage(payload.data)
    const item = sessions.value.find(value => value.id === payload.data?.sessionId)
    if (item) {
      item.lastMessage = payload.data.content
      item.lastMessageTime = payload.data.sendTime
      if (payload.data.sessionId !== activeSessionId.value && payload.data.senderId !== session.user.value?.id) {
        item.unreadCount = (item.unreadCount ?? 0) + 1
      }
    } else {
      fetchChatSessions().then(page => { sessions.value = page.records }).catch(() => {})
    }
    if (appended) {
      await scrollMessageList()
      if (payload.data.senderId !== session.user.value?.id) {
        await markChatRead(payload.data.sessionId).catch(() => {})
        if (item) item.unreadCount = 0
      }
    }
  } else if (payload.type === 'message-replay' && payload.data) {
    payload.data.forEach(message => appendMessage(message))
    await scrollMessageList()
  } else if (payload.type === 'error') {
    error.value = payload.message || '消息发送失败'
  }
}

function appendMessage(message: ChatMessage) {
  if (message.sessionId !== activeSessionId.value || messages.value.some(item => item.id === message.id)) return false
  messages.value.push(message)
  return true
}

async function scrollMessageList() {
  await nextTick()
  document.querySelector('.message-list')?.scrollTo({ top: 999999 })
}

function send() {
  const content = draft.value.trim()
  if (!content || !activeSessionId.value) return
  if (!sendRealtimeMessage({ sessionId: activeSessionId.value, content, msgType: 0 })) {
    error.value = '聊天连接尚未建立，请稍后重试'
    return
  }
  draft.value = ''
}

onMounted(() => {
  unsubscribeRealtime = subscribeRealtime(handleRealtime)
  startRealtime()
  loadSessions()
  refreshTimer = setInterval(refreshActiveChat, 3000)
})
onBeforeUnmount(() => {
  unsubscribeRealtime?.()
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<template>
  <div class="page-shell messages-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">沟通中心</p>
        <h1>私聊</h1>
        <p class="lead">和交易对象保持联系，确认细节，让见面更顺利。</p>
      </div>
      <div class="message-stats">
        <span class="connection" :class="{ connected: socketState === '已连接' }"><i></i>{{ socketState }}</span>
        <span>{{ unreadTotal }} 条未读</span>
      </div>
    </header>

    <section class="chat-shell">
      <aside class="session-list">
        <div class="section-head">
          <strong>最近会话</strong>
          <span>{{ sessions.length }} 个联系人</span>
        </div>
        <p v-if="loading" class="hint">加载中...</p>
        <button
          v-for="item in sessions"
          :key="item.id"
          type="button"
          class="session"
          :class="{ active: item.id === activeSessionId }"
          @click="selectSession(item.id)"
        >
          <span class="avatar">{{ item.otherNickname?.slice(0, 1) || 'U' }}</span>
          <span class="session-copy">
            <strong>{{ item.otherNickname || '用户' }}</strong>
            <small>{{ item.productTitle || '商品会话' }}</small>
            <small>{{ item.lastMessage || '暂无消息' }}</small>
          </span>
          <b v-if="item.unreadCount">{{ item.unreadCount }}</b>
        </button>
        <p v-if="!loading && !sessions.length" class="hint">暂无会话，请从商品详情联系卖家。</p>
      </aside>

      <main class="conversation">
        <div v-if="activeSession" class="conversation-head">
          <div class="conversation-person">
            <span class="avatar">{{ activeSession.otherNickname?.slice(0, 1) || 'U' }}</span>
            <div>
              <strong>{{ activeSession.otherNickname || '用户' }}</strong>
              <small>{{ activeSession.productTitle || '商品会话' }}</small>
            </div>
          </div>
          <RouterLink :to="`/products/${activeSession.productId}`">查看商品 <span>↗</span></RouterLink>
        </div>
        <div v-if="activeSession" class="message-list" :aria-label="`与${activeSession.otherNickname || '用户'}的聊天记录`">
          <p v-if="!messages.length" class="empty-message">还没有消息，先打个招呼吧。</p>
          <div v-for="item in messages" :key="item.id" class="message" :class="{ mine: item.senderId === session.user.value?.id }">
            <p>{{ item.content }}</p>
            <small>{{ formatDateTime(item.sendTime) }}</small>
          </div>
        </div>
        <div v-else class="empty">选择一个会话开始聊天</div>
        <form v-if="activeSession" class="composer" @submit.prevent="send">
          <input v-model="draft" maxlength="2000" placeholder="输入消息..." />
          <button type="submit">发送</button>
        </form>
        <p v-if="error" class="hint error">{{ error }}</p>
      </main>
    </section>
  </div>
</template>

<style scoped>
.messages-page { display:flex; flex-direction:column; width:100%; max-width:1180px; height:calc(100vh - 68px); margin:0 auto; padding:28px 24px; color:var(--ink); }
.page-heading { flex:none; display:flex; justify-content:space-between; align-items:end; gap:24px; margin-bottom:18px; }
.eyebrow { margin:0 0 12px; color:var(--accent); font-size:13px; font-weight:800; }
h1,p { margin:0; }
h1 { color:#101811; font-family:Georgia,'Times New Roman',serif; font-size:clamp(2.6rem,5vw,4.8rem); line-height:.95; }
.lead { margin-top:14px; color:var(--muted); }
.message-stats { display:flex; align-items:center; gap:10px; color:var(--muted); font-size:.82rem; }
.message-stats > span { padding:9px 12px; border:1px solid var(--line); border-radius:999px; background:#fff; }
.connection { display:flex; align-items:center; gap:8px; }
.connection i { width:7px; height:7px; border-radius:50%; background:#a9b2b0; }
.connection.connected { color:var(--accent-strong); }
.connection.connected i { background:var(--accent); }
.chat-shell { flex:1; display:grid; grid-template-columns:320px minmax(0,1fr); min-height:0; overflow:hidden; border:1px solid var(--line); border-radius:16px; background:#fff; box-shadow:0 16px 38px rgba(32,41,54,.07); }
.session-list { min-height:0; overflow:auto; padding:22px 18px; border-right:1px solid var(--line); background:#fbfcfb; }
.section-head { padding:0 4px 14px; border-bottom:1px solid var(--line); }
.section-head strong,.section-head span { display:block; }
.section-head span { margin-top:4px; color:var(--muted); font-size:.78rem; }
.hint { padding:24px 4px; color:var(--muted); }
.session { display:grid; grid-template-columns:42px minmax(0,1fr) auto; gap:10px; width:100%; padding:14px 4px; border:0; border-bottom:1px solid #edf0ef; background:transparent; color:var(--ink); text-align:left; cursor:pointer; }
.session.active { margin:0 -4px; padding-inline:8px; border-radius:8px; background:var(--accent-soft); }
.session-copy { display:grid; gap:3px; min-width:0; }
.session-copy strong,.session-copy small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.session-copy small { color:var(--muted); font-size:.78rem; }
.session b { align-self:start; padding:2px 6px; border-radius:999px; color:#fff; background:var(--accent); font-size:.7rem; }
.avatar { display:grid; place-items:center; width:40px; height:40px; border-radius:50%; color:var(--accent-strong); background:var(--accent-soft); font-weight:800; }
.conversation { display:grid; grid-template-rows:auto minmax(0,1fr) auto auto; min-width:0; min-height:0; overflow:hidden; background:#fff; }
.conversation-head { display:flex; justify-content:space-between; align-items:center; gap:14px; padding:18px 22px; border-bottom:1px solid var(--line); }
.conversation-person { display:flex; align-items:center; gap:11px; }
.conversation-head strong,.conversation-head small { display:block; }
.conversation-head small { margin-top:2px; color:var(--muted); font-size:.8rem; }
.conversation-head a { color:var(--accent-strong); text-decoration:none; font-size:.84rem; font-weight:700; }
.conversation-head a span { font-size:1rem; }
.message-list { display:grid; align-content:start; gap:12px; min-height:0; overflow-y:auto; overflow-x:hidden; padding:24px; background:#f8faf9; scrollbar-color:var(--accent) #edf2f0; scrollbar-width:thin; }
.message-list::-webkit-scrollbar { width:8px; }
.message-list::-webkit-scrollbar-track { background:#edf2f0; }
.message-list::-webkit-scrollbar-thumb { border:2px solid #edf2f0; border-radius:999px; background:var(--accent); }
.message { max-width:min(70%,520px); justify-self:start; }
.message.mine { justify-self:end; text-align:right; }
.message p { margin:0; padding:11px 14px; border-radius:4px 14px 14px 14px; color:var(--ink); background:#fff; box-shadow:0 4px 12px rgba(32,41,54,.06); white-space:pre-wrap; text-align:left; }
.message.mine p { border-radius:14px 4px 14px 14px; color:#fff; background:var(--accent); }
.message small { display:block; margin-top:4px; color:var(--muted); font-size:.72rem; }
.empty { display:grid; place-items:center; color:var(--muted); }
.empty-message { grid-column:1/-1; padding:34px; color:var(--muted); text-align:center; }
.composer { position:sticky; bottom:0; z-index:1; display:flex; flex:none; gap:10px; padding:16px 22px; border-top:1px solid var(--line); background:#fff; }
input,button { min-height:44px; border:1px solid var(--line); border-radius:8px; background:#fff; color:var(--ink); padding:0 12px; font:inherit; }
input { flex:1; }
.composer input:focus { border-color:var(--accent); outline:2px solid rgba(13,118,109,.12); }
.composer button { border-color:var(--accent); background:var(--accent); color:#fff; cursor:pointer; font-weight:700; }
.error { padding:0 22px 14px; color:var(--danger); }
@media (max-width:760px) {
  .messages-page { height:auto; min-height:calc(100vh - 68px); padding:20px 14px 28px; }
  .page-heading { display:grid; align-items:start; }
  .message-stats { flex-wrap:wrap; }
  .chat-shell { flex:none; grid-template-columns:1fr; min-height:0; }
  .session-list { max-height:280px; overflow:auto; border-right:0; border-bottom:1px solid var(--line); }
  .conversation { height:560px; min-height:500px; }
}
</style>
