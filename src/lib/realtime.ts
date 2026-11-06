import { ref } from 'vue'

import { API_BASE } from './http'
import type { ChatMessage } from '@/types/api'

export interface OrderStatusEvent {
  orderId: number
  orderNo: string
  productId: number
  productTitle: string
  buyerId: number
  sellerId: number
  status: number
  statusText: string
  eventTime: string
}

export type RealtimePayload =
  | { type: 'message'; data: ChatMessage }
  | { type: 'message-replay'; data: ChatMessage[] }
  | { type: 'order-status'; data: OrderStatusEvent }
  | { type: 'error'; message?: string }

const socketState = ref('未连接')
let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let manuallyClosed = false
const listeners = new Set<(payload: RealtimePayload) => void>()

function connect() {
  const token = localStorage.getItem('auth-token') ?? ''
  if (!token || socket) return

  manuallyClosed = false
  socketState.value = '连接中'
  const url = API_BASE.replace(/^http/, 'ws') + `/ws/chat?token=${encodeURIComponent(token)}`
  socket = new WebSocket(url)
  socket.onopen = () => { socketState.value = '已连接' }
  socket.onmessage = event => {
    try {
      const payload = JSON.parse(event.data) as RealtimePayload
      listeners.forEach(listener => listener(payload))
    } catch {
      socketState.value = '消息格式错误'
    }
  }
  socket.onerror = () => { socketState.value = '连接失败' }
  socket.onclose = () => {
    socket = null
    socketState.value = '已断开'
    if (!manuallyClosed && localStorage.getItem('auth-token')) {
      reconnectTimer = setTimeout(connect, 2000)
    }
  }
}

function disconnect() {
  manuallyClosed = true
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  socket?.close()
  socket = null
  socketState.value = '未连接'
}

export function startRealtime() {
  connect()
}

export function stopRealtime() {
  disconnect()
}

export function subscribeRealtime(listener: (payload: RealtimePayload) => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function sendRealtimeMessage(payload: { sessionId: number; content: string; msgType: number }) {
  if (socket?.readyState !== WebSocket.OPEN) return false
  socket.send(JSON.stringify(payload))
  return true
}

export { socketState }
