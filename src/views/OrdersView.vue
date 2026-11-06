<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import {
  approveReturnRequest,
  cancelOrder,
  completeReturnRequest,
  confirmOrder,
  createReview,
  createAlipayPayment,
  createReturnRequest,
  fetchAlipayPaymentStatus,
  fetchOrders,
  finishOrder,
  rejectReturnRequest,
} from '@/lib/api'
import { formatDateTime, formatMoney, orderStatusLabel } from '@/lib/format'
import { imageUrl } from '@/lib/image'
import { startRealtime, subscribeRealtime } from '@/lib/realtime'
import { useSession } from '@/lib/session'
import type { Order } from '@/types/api'

const route = useRoute()
const session = useSession()
const orders = ref<Order[]>([])
const role = ref<'buyer' | 'seller' | ''>('')
const status = ref<number | ''>('')
const loading = ref(true)
const error = ref('')
const paymentNotice = ref('')
const launchingAlipayOrderId = ref<number | null>(null)
const pendingAlipayOrderId = ref<number | null>(null)
const reviewing = ref<number | null>(null)
const reviewRating = ref(5)
const reviewContent = ref('')
const reviewedOrderIds = ref<Set<number>>(loadReviewedOrderIds())
const returnSubmitting = ref<number | null>(null)
const returnDialog = ref<{ order: Order; mode: 'apply' | 'approve' | 'reject' | 'complete' } | null>(null)
const returnReason = ref('')
const returnDescription = ref('')
const returnRemark = ref('')
let unsubscribeRealtime: (() => void) | null = null
let pageUnmounted = false

const orderSummary = computed(() => ({
  all: orders.value.length,
  active: orders.value.filter(item => item.status === 0 || item.status === 1).length,
  finished: orders.value.filter(item => item.status === 3).length,
}))

function statusTone(value: number | null) {
  if (value === 3) return 'done'
  if (value === 2) return 'muted'
  return 'active'
}

function roleLabel(item: Order) {
  return item.buyerId === session.user.value?.id ? '我买入的' : '我卖出的'
}

function reviewedStorageKey() {
  return `reviewed-orders:${session.user.value?.id ?? 'anonymous'}`
}

function loadReviewedOrderIds() {
  try {
    const raw = localStorage.getItem(`reviewed-orders:${session.user.value?.id ?? 'anonymous'}`)
    const ids = raw ? JSON.parse(raw) : []
    return new Set<number>(Array.isArray(ids) ? ids.map(Number).filter(Number.isFinite) : [])
  } catch {
    return new Set<number>()
  }
}

function markReviewed(orderId: number) {
  const next = new Set(reviewedOrderIds.value)
  next.add(orderId)
  reviewedOrderIds.value = next
  localStorage.setItem(reviewedStorageKey(), JSON.stringify([...next]))
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    orders.value = (await fetchOrders({ role: role.value, status: status.value, pageNo: 1, pageSize: 50 })).records
  } catch (err) {
    error.value = err instanceof Error ? err.message : '订单加载失败'
  } finally {
    loading.value = false
  }
}

async function run(action: () => Promise<Order>) {
  try {
    const updated = await action()
    const index = orders.value.findIndex(item => item.id === updated.id)
    if (index >= 0) orders.value[index] = updated
  } catch (err) {
    error.value = err instanceof Error ? err.message : '订单操作失败'
  }
}

async function payWithAlipay(item: Order) {
  const paymentWindow = window.open('', `alipay-${item.id}`)
  if (!paymentWindow) {
    paymentNotice.value = '支付宝收银台窗口被拦截，请允许弹出窗口后重试。'
    return
  }

  launchingAlipayOrderId.value = item.id
  paymentNotice.value = ''
  try {
    const payment = await createAlipayPayment(item.id)
    paymentWindow.document.open()
    paymentWindow.document.write(payment.formHtml)
    paymentWindow.document.close()
    pendingAlipayOrderId.value = item.id
    void pollAlipayStatus(item)
  } catch (err) {
    paymentWindow.close()
    paymentNotice.value = err instanceof Error ? err.message : '创建支付宝支付失败'
  } finally {
    launchingAlipayOrderId.value = null
  }
}

async function pollAlipayStatus(item: Order) {
  for (let attempt = 0; attempt < 60 && !pageUnmounted; attempt += 1) {
    await new Promise(resolve => window.setTimeout(resolve, 3000))
    if (pageUnmounted) return
    try {
      const status = await fetchAlipayPaymentStatus(item.orderNo)
      if (status.paid) {
        await load()
        paymentNotice.value = `订单 ${item.orderNo} 已完成支付宝支付。`
        pendingAlipayOrderId.value = null
        return
      }
    } catch (err) {
      paymentNotice.value = err instanceof Error ? err.message : '查询支付宝支付状态失败'
      pendingAlipayOrderId.value = null
      return
    }
  }
  if (!pageUnmounted) {
    pendingAlipayOrderId.value = null
    paymentNotice.value = '暂未确认支付结果，请稍后刷新订单状态；若已付款，请勿重复支付。'
  }
}

function cancel(item: Order) {
  const reason = window.prompt('请输入取消原因（可选）') ?? ''
  run(() => cancelOrder(item.id, reason))
}

function openReturnApply(item: Order) {
  returnReason.value = ''
  returnDescription.value = ''
  returnRemark.value = ''
  returnDialog.value = { order: item, mode: 'apply' }
}

function openReturnHandle(item: Order, mode: 'approve' | 'reject' | 'complete') {
  returnReason.value = ''
  returnDescription.value = ''
  returnRemark.value = ''
  returnDialog.value = { order: item, mode }
}

function closeReturnDialog() {
  if (returnSubmitting.value === returnDialog.value?.order.id) return
  returnDialog.value = null
}

async function submitReturnDialog() {
  const dialog = returnDialog.value
  if (!dialog) return
  const order = dialog.order
  if (dialog.mode === 'apply' && !returnReason.value.trim()) {
    error.value = '请填写退货原因'
    return
  }

  returnSubmitting.value = order.id
  try {
    if (dialog.mode === 'apply') {
      order.returnRequest = await createReturnRequest(order.id, {
        reason: returnReason.value.trim(),
        description: returnDescription.value.trim(),
      })
    } else if (dialog.mode === 'approve' && order.returnRequest) {
      order.returnRequest = await approveReturnRequest(order.returnRequest.id, returnRemark.value.trim())
    } else if (dialog.mode === 'reject' && order.returnRequest) {
      order.returnRequest = await rejectReturnRequest(order.returnRequest.id, returnRemark.value.trim())
    } else if (dialog.mode === 'complete' && order.returnRequest) {
      order.returnRequest = await completeReturnRequest(order.returnRequest.id, returnRemark.value.trim())
    }
    error.value = ''
    returnDialog.value = null
  } catch (err) {
    error.value = err instanceof Error ? err.message : '退货操作失败'
  } finally {
    returnSubmitting.value = null
  }
}

const returnDialogTitle = computed(() => {
  if (returnDialog.value?.mode === 'apply') return '申请退货'
  if (returnDialog.value?.mode === 'approve') return '同意退货申请'
  if (returnDialog.value?.mode === 'reject') return '驳回退货申请'
  return '确认退款完成'
})

const returnDialogButton = computed(() => {
  if (returnDialog.value?.mode === 'apply') return '提交申请'
  if (returnDialog.value?.mode === 'approve') return '同意退货'
  if (returnDialog.value?.mode === 'reject') return '确认驳回'
  return '确认退款'
})

async function submitReview(item: Order) {
  try {
    await createReview(item.id, { rating: reviewRating.value, content: reviewContent.value })
    markReviewed(item.id)
    reviewing.value = null
    reviewContent.value = ''
    error.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : '评价提交失败'
    if (error.value.includes('已经评价过')) {
      markReviewed(item.id)
      reviewing.value = null
    }
  }
}

onMounted(load)
onMounted(() => {
  startRealtime()
  unsubscribeRealtime = subscribeRealtime(payload => {
    if (payload.type === 'order-status' && payload.data) {
      const event = payload.data
      const existing = orders.value.find(item => item.id === event.orderId)
      if (existing) {
        existing.status = event.status
        existing.statusText = event.statusText
      }
      load()
    }
  })
})
onBeforeUnmount(() => {
  pageUnmounted = true
  unsubscribeRealtime?.()
})
</script>

<template>
  <div class="page-shell orders-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">交易记录</p>
        <h1>我的订单</h1>
        <p class="lead">买入、卖出和每一次交易进度，都在这里清晰留痕。</p>
      </div>
      <div class="summary">
        <div><strong>{{ orderSummary.all }}</strong><span>全部订单</span></div>
        <div><strong>{{ orderSummary.active }}</strong><span>进行中</span></div>
        <div><strong>{{ orderSummary.finished }}</strong><span>已完成</span></div>
      </div>
    </header>

    <section class="toolbar">
      <div>
        <strong>订单列表</strong>
        <span>共 {{ orderSummary.all }} 条记录</span>
      </div>
      <div class="filters">
        <select v-model="role" aria-label="筛选订单身份" @change="load">
          <option value="">全部身份</option>
          <option value="buyer">我买入的</option>
          <option value="seller">我卖出的</option>
        </select>
        <select v-model="status" aria-label="筛选订单状态" @change="load">
          <option value="">全部状态</option>
          <option :value="0">待确认</option>
          <option :value="1">已成交</option>
          <option :value="2">已取消</option>
          <option :value="3">已完成</option>
        </select>
      </div>
    </section>

    <section class="orders-panel">
      <p v-if="paymentNotice" class="payment-notice" role="status">{{ paymentNotice }}</p>
      <p v-if="loading" class="hint">加载中...</p>
      <p v-else-if="error" class="hint error">{{ error }}</p>
      <div v-else-if="!orders.length" class="empty">
        <span>◎</span>
        <strong>暂时没有订单</strong>
        <p>去商品页逛逛，遇到喜欢的好物就带它回家。</p>
        <RouterLink to="/products">浏览商品</RouterLink>
      </div>
      <div v-else class="order-list">
        <article
          v-for="item in orders"
          :key="item.id"
          class="order-card"
          :class="{ focus: String(item.id) === String(route.query.orderId) }"
        >
          <div class="order-topline">
            <span>{{ roleLabel(item) }}</span>
            <span>下单于 {{ formatDateTime(item.createTime) }}</span>
            <b :class="`status-${statusTone(item.status)}`">{{ item.statusText || orderStatusLabel(item.status) }}</b>
          </div>
          <RouterLink :to="`/products/${item.productId}`" class="product">
            <div class="cover">
              <img v-if="item.productCoverImage" :src="imageUrl(item.productCoverImage)" :alt="item.productTitle || ''" />
              <span v-else>{{ (item.productTitle || '物').slice(0, 1) }}</span>
            </div>
            <div class="product-copy">
              <strong>{{ item.productTitle || '商品' }}</strong>
              <small>订单号 {{ item.orderNo }}</small>
              <small>购买数量 {{ item.quantity }} 件</small>
              <small>{{ item.buyerNickname || item.buyerId }} 与 {{ item.sellerNickname || item.sellerId }}</small>
            </div>
          </RouterLink>
            <div class="order-side">
            <strong>{{ formatMoney(item.amount) }}</strong>
            <div class="actions">
              <button
                v-if="item.status === 0 && item.buyerId === session.user.value?.id"
                type="button"
                :disabled="launchingAlipayOrderId === item.id || pendingAlipayOrderId === item.id"
                @click="payWithAlipay(item)"
              >
                {{ launchingAlipayOrderId === item.id ? '正在跳转...' : pendingAlipayOrderId === item.id ? '等待支付结果...' : '支付宝支付' }}
              </button>
              <button v-if="item.status === 0 && item.sellerId === session.user.value?.id" type="button" @click="run(() => confirmOrder(item.id))">确认成交</button>
              <button v-if="item.status === 0" type="button" class="ghost" @click="cancel(item)">取消订单</button>
              <button v-if="item.status === 1 && (!item.returnRequest || item.returnRequest.status === 2)" type="button" @click="run(() => finishOrder(item.id))">确认完成</button>
              <button
                v-if="(item.status === 1 || item.status === 3) && item.buyerId === session.user.value?.id && !item.returnRequest"
                type="button"
                class="ghost"
                :disabled="returnSubmitting === item.id"
                @click="openReturnApply(item)"
              >
                申请退货
              </button>
              <button
                v-if="item.returnRequest?.status === 0 && item.sellerId === session.user.value?.id"
                type="button"
                :disabled="returnSubmitting === item.id"
                @click="openReturnHandle(item, 'approve')"
              >
                同意退货
              </button>
              <button
                v-if="item.returnRequest?.status === 0 && item.sellerId === session.user.value?.id"
                type="button"
                class="ghost"
                :disabled="returnSubmitting === item.id"
                @click="openReturnHandle(item, 'reject')"
              >
                驳回退货
              </button>
              <button
                v-if="item.returnRequest?.status === 1 && item.sellerId === session.user.value?.id"
                type="button"
                :disabled="returnSubmitting === item.id"
                @click="openReturnHandle(item, 'complete')"
              >
                确认退款
              </button>
              <button
                v-if="item.status === 3"
                type="button"
                class="ghost review-button"
                :disabled="reviewedOrderIds.has(item.id)"
                @click="reviewing = item.id"
              >
                {{ reviewedOrderIds.has(item.id) ? '已评价' : '评价' }}
              </button>
            </div>
            <div v-if="item.receiverAddress" class="shipping-address">
              <strong>收货信息</strong>
              <span>{{ item.receiverName }} {{ item.receiverPhone }} · {{ item.receiverAddress }}</span>
            </div>
            <div v-if="item.returnRequest" class="return-summary">
              <strong>退货：{{ item.returnRequest.statusText }}</strong>
              <span>{{ item.returnRequest.reason }}{{ item.returnRequest.sellerRemark ? ` · ${item.returnRequest.sellerRemark}` : '' }}</span>
            </div>
          </div>
          <div v-if="reviewing === item.id" class="review-form">
            <label>评分
              <select v-model.number="reviewRating">
                <option v-for="n in 5" :key="n" :value="n">{{ n }} 星</option>
              </select>
            </label>
            <textarea v-model="reviewContent" rows="3" maxlength="500" placeholder="写下这次交易的感受"></textarea>
            <div>
              <button type="button" class="ghost" @click="reviewing = null">暂不评价</button>
              <button type="button" @click="submitReview(item)">提交评价</button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <div v-if="returnDialog" class="return-backdrop" @click.self="closeReturnDialog">
      <section class="return-dialog" role="dialog" aria-modal="true" aria-labelledby="return-title">
        <div class="return-dialog-head">
          <div>
            <p class="eyebrow">售后服务</p>
            <h2 id="return-title">{{ returnDialogTitle }}</h2>
            <small>{{ returnDialog.order.productTitle || '订单商品' }} · 订单号 {{ returnDialog.order.orderNo }}</small>
          </div>
          <button type="button" class="return-close" aria-label="关闭弹窗" @click="closeReturnDialog">×</button>
        </div>

        <template v-if="returnDialog.mode === 'apply'">
          <label class="return-field">
            <span>退货原因</span>
            <input v-model="returnReason" maxlength="255" placeholder="例如：商品与描述不符" />
          </label>
          <label class="return-field">
            <span>问题说明</span>
            <textarea v-model="returnDescription" rows="5" maxlength="1000" placeholder="请补充商品问题、沟通情况等信息"></textarea>
          </label>
          <p class="return-help">提交后将由卖家审核，审核通过后请按约定完成退货。</p>
        </template>

        <template v-else>
          <div class="return-request-preview">
            <strong>{{ returnDialog.order.returnRequest?.reason }}</strong>
            <p>{{ returnDialog.order.returnRequest?.description || '买家未补充详细说明。' }}</p>
          </div>
          <label class="return-field">
            <span>{{ returnDialog.mode === 'reject' ? '驳回原因' : '处理说明' }} <em>可选</em></span>
            <textarea v-model="returnRemark" rows="4" maxlength="1000" :placeholder="returnDialog.mode === 'reject' ? '请说明驳回原因' : '可补充处理说明'"></textarea>
          </label>
        </template>

        <div class="return-dialog-actions">
          <button type="button" class="ghost" :disabled="returnSubmitting === returnDialog.order.id" @click="closeReturnDialog">取消</button>
          <button type="button" :disabled="returnSubmitting === returnDialog.order.id" @click="submitReturnDialog">
            {{ returnSubmitting === returnDialog.order.id ? '提交中...' : returnDialogButton }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.orders-page { max-width:1180px; margin:0 auto; padding:44px 24px 70px; color:var(--ink); }
.page-heading { display:flex; justify-content:space-between; align-items:end; gap:28px; margin-bottom:30px; }
.eyebrow { margin:0 0 12px; color:var(--accent); font-size:13px; font-weight:800; }
h1,p { margin:0; }
h1 { color:#101811; font-family:Georgia,'Times New Roman',serif; font-size:clamp(2.6rem,5vw,4.8rem); line-height:.95; }
.lead { margin-top:14px; color:var(--muted); }
.summary { display:flex; gap:10px; }
.summary div { min-width:92px; padding:14px 16px; border:1px solid var(--line); border-radius:12px; background:#fff; }
.summary strong,.summary span { display:block; }
.summary strong { color:var(--accent-strong); font-size:1.5rem; }
.summary span { margin-top:2px; color:var(--muted); font-size:.78rem; }
.toolbar { display:flex; justify-content:space-between; align-items:center; gap:16px; padding:16px 20px; border:1px solid var(--line); border-bottom:0; border-radius:14px 14px 0 0; background:#fff; }
.toolbar strong,.toolbar span { display:block; }
.toolbar span { margin-top:3px; color:var(--muted); font-size:.82rem; }
.filters { display:flex; gap:10px; }
select,button,textarea { min-height:42px; border:1px solid var(--line); border-radius:8px; background:#fff; color:var(--ink); padding:8px 12px; font:inherit; }
button { border-color:var(--accent); background:var(--accent); color:#fff; cursor:pointer; font-weight:700; }
button:disabled { opacity:.6; cursor:not-allowed; }
.ghost { border-color:var(--line); background:var(--surface-soft); color:var(--ink); }
.review-button:disabled { color:#7b8582; background:#eef2f1; border-color:#dfe5e4; cursor:not-allowed; opacity:1; }
.orders-panel { min-height:260px; padding:14px; border:1px solid var(--line); border-radius:0 0 14px 14px; background:rgba(255,255,255,.72); box-shadow:0 16px 38px rgba(32,41,54,.07); }
.hint { padding:36px 12px; color:var(--muted); }
.payment-notice { margin:0 0 12px; padding:12px 14px; border-left:3px solid var(--accent); color:var(--ink); background:var(--accent-soft); }
.error { color:var(--danger); }
.order-list { display:grid; gap:12px; }
.order-card { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:16px 22px; padding:18px; border:1px solid var(--line); border-radius:11px; background:#fff; }
.order-card.focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(13,118,109,.1); }
.order-topline { grid-column:1/-1; display:flex; align-items:center; gap:14px; color:var(--muted); font-size:.8rem; }
.order-topline b { margin-left:auto; padding:5px 9px; border-radius:999px; font-size:.78rem; }
.status-active { color:var(--accent-strong); background:var(--accent-soft); }
.status-done { color:#8a5b16; background:#fff0d8; }
.status-muted { color:#68717a; background:#eef1f1; }
.product { display:flex; gap:14px; align-items:center; min-width:0; color:inherit; text-decoration:none; }
.cover { width:94px; height:82px; flex:none; display:grid; place-items:center; overflow:hidden; border-radius:8px; background:#edf1ed; }
.cover img { width:100%; height:100%; object-fit:cover; }
.cover span { color:var(--accent); font-size:2.1rem; font-weight:800; }
.product-copy { display:grid; gap:5px; min-width:0; }
.product-copy strong { overflow:hidden; color:#18221b; text-overflow:ellipsis; white-space:nowrap; }
.product-copy small { overflow:hidden; color:var(--muted); text-overflow:ellipsis; white-space:nowrap; }
.order-side { display:grid; justify-items:end; align-content:center; gap:12px; }
.order-side > strong { color:var(--accent-strong); font-size:1.3rem; }
.actions { display:flex; flex-wrap:wrap; justify-content:end; gap:8px; }
.actions button { min-height:36px; padding:6px 11px; font-size:.82rem; }
.review-form { grid-column:1/-1; display:grid; gap:10px; padding-top:14px; border-top:1px solid var(--line); }
.review-form label { display:flex; align-items:center; gap:8px; color:#435048; font-size:.88rem; font-weight:700; }
.review-form textarea { width:100%; resize:vertical; }
.review-form > div { display:flex; justify-content:end; gap:8px; }
.shipping-address { grid-column:1/-1; display:grid; gap:4px; padding-top:12px; border-top:1px solid var(--line); color:var(--muted); font-size:.84rem; }.shipping-address strong { color:#435048; }.shipping-address span { line-height:1.45; }
.return-summary { grid-column:1/-1; display:grid; gap:4px; padding-top:12px; border-top:1px solid var(--line); color:var(--muted); font-size:.84rem; }.return-summary strong { color:var(--accent-strong); }.return-summary span { line-height:1.45; }
.return-backdrop { position:fixed; z-index:50; inset:0; display:grid; place-items:center; padding:24px; background:rgba(9,16,22,.58); }
.return-dialog { width:min(560px,100%); padding:26px; border:1px solid var(--line); border-radius:16px; color:var(--ink); background:#fff; box-shadow:0 24px 70px rgba(32,41,54,.22); }
.return-dialog-head { display:flex; justify-content:space-between; align-items:start; gap:16px; margin-bottom:22px; }
.return-dialog-head h2 { margin:0; color:#101811; font-family:Georgia,'Times New Roman',serif; font-size:1.9rem; }
.return-dialog-head small { display:block; margin-top:7px; color:var(--muted); }
.return-close { display:grid; place-items:center; width:36px; height:36px; min-height:36px; padding:0; border:0; color:var(--muted); background:transparent; cursor:pointer; font-size:1.7rem; }
.return-field { display:grid; gap:8px; margin-top:14px; color:#435048; font-size:.88rem; font-weight:700; }
.return-field input,.return-field textarea { width:100%; border:1px solid var(--line); border-radius:8px; color:var(--ink); background:#fff; }
.return-field textarea { resize:vertical; }
.return-field input:focus,.return-field textarea:focus { border-color:var(--accent); outline:2px solid rgba(13,118,109,.12); }
.return-field em { color:var(--muted); font-size:.76rem; font-style:normal; font-weight:400; }
.return-help { margin-top:14px; color:var(--muted); font-size:.82rem; line-height:1.55; }
.return-request-preview { display:grid; gap:7px; padding:14px; border-radius:9px; color:#435048; background:#f4f8f6; }
.return-request-preview strong { color:var(--accent-strong); }
.return-request-preview p { line-height:1.55; white-space:pre-wrap; }
.return-dialog-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:24px; }
.return-dialog-actions button { min-width:92px; }
.return-dialog-actions .ghost { border-color:var(--line); color:var(--ink); background:var(--surface-soft); }
.empty { display:grid; justify-items:center; gap:8px; padding:70px 20px; color:var(--muted); text-align:center; }
.empty > span { color:var(--accent); font-size:2rem; }
.empty strong { color:var(--ink); }
.empty a { margin-top:8px; padding:10px 15px; border-radius:8px; color:#fff; background:var(--accent); text-decoration:none; font-weight:700; }
@media (max-width:850px) {
  .page-heading,.toolbar { display:grid; align-items:start; }
  .summary { flex-wrap:wrap; }
  .order-card { grid-template-columns:1fr; }
  .order-side { justify-items:start; }
  .actions { justify-content:start; }
}
@media (max-width:520px) {
  .orders-page { padding:28px 14px 50px; }
  .filters { display:grid; grid-template-columns:1fr 1fr; }
  .toolbar { padding:14px; }
  .order-card { padding:14px; }
  .order-topline { align-items:start; flex-wrap:wrap; gap:7px 10px; }
  .order-topline b { margin-left:0; }
  .cover { width:76px; height:68px; }
}
</style>
