<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  createChatSession,
  createOrder,
  favoriteProduct,
  fetchAddresses,
  fetchProduct,
  fetchProductReviews,
  unfavoriteProduct,
} from '@/lib/api'
import { deliveryMethodLabel, exchangeTypeLabel, formatDateTime, formatMoney, statusLabel } from '@/lib/format'
import { imageUrl } from '@/lib/image'
import { createIdempotencyKey } from '@/lib/order'
import { useSession } from '@/lib/session'
import type { Product, Review, ShippingAddress } from '@/types/api'

const props = defineProps<{ id: string }>()
const router = useRouter()
const session = useSession()
const product = ref<Product | null>(null)
const reviews = ref<Review[]>([])
const loading = ref(true)
const error = ref('')
const reviewError = ref('')
const actionMessage = ref('')
const isFavorite = ref(false)
const busy = ref(false)
const activeImage = ref('')
const orderIdempotencyKey = ref('')
const addresses = ref<ShippingAddress[]>([])
const selectedAddressId = ref<number | null>(null)
const checkoutOpen = ref(false)
const quantity = ref(1)

const isOwner = computed(() => {
  const sellerId = product.value?.sellerId
  const currentUserId = session.user.value?.id
  return sellerId !== undefined && currentUserId !== undefined && String(sellerId) === String(currentUserId)
})
const gallery = computed(() => {
  if (!product.value) return []
  const images = product.value.images?.map(item => imageUrl(item.url)) ?? []
  return Array.from(new Set([imageUrl(product.value.coverImage), ...images].filter(Boolean))) as string[]
})
const totalAmount = computed(() => Number(product.value?.price || 0) * quantity.value)
const needsShippingAddress = computed(() => product.value?.deliveryMethod === 2)

function normalizeQuantity() {
  if (!product.value) return
  const next = Number(quantity.value)
  quantity.value = Number.isFinite(next)
    ? Math.min(Math.max(Math.floor(next), 1), product.value.stock)
    : 1
}

async function load() {
  loading.value = true
  error.value = ''
  reviewError.value = ''
  try {
    const productData = await fetchProduct(props.id)
    product.value = productData
    activeImage.value = gallery.value[0] ?? ''
    if (session.isLoggedIn.value) {
      try {
        reviews.value = (await fetchProductReviews(props.id)).records
      } catch (err) {
        reviewError.value = err instanceof Error ? err.message : '评价加载失败'
      }
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '商品加载失败'
  } finally {
    loading.value = false
  }
}

async function toggleFavorite() {
  if (!session.isLoggedIn.value) {
    router.push('/login')
    return
  }
  busy.value = true
  actionMessage.value = ''
  try {
    if (isFavorite.value) {
      await unfavoriteProduct(props.id)
      isFavorite.value = false
      actionMessage.value = '已取消收藏'
    } else {
      await favoriteProduct(props.id)
      isFavorite.value = true
      actionMessage.value = '已收藏'
    }
  } catch (err) {
    actionMessage.value = err instanceof Error ? err.message : '操作失败'
  } finally {
    busy.value = false
  }
}

function formatAddress(address: ShippingAddress) {
  return `${address.province}${address.city}${address.district}${address.detail}`
}

async function openCheckout() {
  if (!session.isLoggedIn.value) {
    router.push('/login')
    return
  }
  if (!product.value) return
  busy.value = true
  try {
    if (needsShippingAddress.value) {
      addresses.value = await fetchAddresses()
      if (!addresses.value.length) {
        actionMessage.value = '卖家配送需要先新增收货地址'
        router.push({ name: 'addresses' })
        return
      }
      const defaultAddress = addresses.value.find(item => item.isDefault === 1) ?? addresses.value.at(0)
      if (!defaultAddress) return
      selectedAddressId.value = defaultAddress.id
    } else {
      addresses.value = []
      selectedAddressId.value = null
    }
    quantity.value = Math.min(Math.max(quantity.value, 1), product.value.stock)
    checkoutOpen.value = true
  } catch (err) {
    actionMessage.value = err instanceof Error ? err.message : '地址加载失败'
  } finally {
    busy.value = false
  }
}

async function buy() {
  if (!product.value || (needsShippingAddress.value && !selectedAddressId.value)) return
  busy.value = true
  try {
    if (!orderIdempotencyKey.value) {
      orderIdempotencyKey.value = createIdempotencyKey()
    }
    const order = await createOrder(product.value.id, orderIdempotencyKey.value, selectedAddressId.value, quantity.value)
    orderIdempotencyKey.value = ''
    checkoutOpen.value = false
    router.push({ name: 'orders', query: { orderId: String(order.id) } })
  } catch (err) {
    actionMessage.value = err instanceof Error ? err.message : '下单失败'
  } finally {
    busy.value = false
  }
}

async function startChat() {
  if (!session.isLoggedIn.value) {
    router.push('/login')
    return
  }
  busy.value = true
  try {
    const chat = await createChatSession(props.id)
    router.push({ name: 'messages', query: { sessionId: String(chat.id) } })
  } catch (err) {
    actionMessage.value = err instanceof Error ? err.message : '创建会话失败'
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page-shell">
    <p v-if="loading" class="hint">加载中...</p>
    <p v-else-if="error" class="hint error">{{ error }}</p>

    <template v-else-if="product">
      <section class="detail-layout">
        <div class="panel gallery-panel">
          <div class="main-image">
            <img v-if="activeImage" :src="activeImage" :alt="product.title" />
            <span v-else>{{ product.title.slice(0, 1) }}</span>
          </div>
          <div v-if="gallery.length > 1" class="thumbs">
            <button
              v-for="image in gallery"
              :key="image"
              type="button"
              :class="{ active: activeImage === image }"
              @click="activeImage = image"
            >
              <img :src="image" :alt="product.title" />
            </button>
          </div>
        </div>

        <section class="panel info-panel">
          <div class="title-row">
            <div>
              <p class="eyebrow">商品详情</p>
              <h1>{{ product.title }}</h1>
            </div>
            <span class="status">{{ statusLabel(product.status) }}</span>
          </div>
          <strong class="price">{{ formatMoney(product.price) }}</strong>
          <span v-if="product.originalPrice" class="original-price">原价 {{ formatMoney(product.originalPrice) }}</span>
          <p class="description">{{ product.description || '卖家暂未补充商品描述。' }}</p>

          <div class="facts">
            <span>{{ exchangeTypeLabel(product.exchangeType) }}</span>
            <span>{{ deliveryMethodLabel(product.deliveryMethod) }}</span>
            <span>{{ product.location || '交易地点待协商' }}</span>
            <span>库存 {{ product.stock ?? 0 }}</span>
            <span>浏览 {{ product.browseCount ?? 0 }}</span>
          </div>

          <div v-if="!isOwner && product.status === 2 && product.stock > 0" class="quantity-picker">
            <span>购买数量</span>
            <div class="quantity-controls">
              <button type="button" aria-label="减少数量" :disabled="quantity <= 1" @click="quantity -= 1">−</button>
              <input v-model.number="quantity" type="number" min="1" :max="product.stock" aria-label="购买数量" @change="normalizeQuantity" />
              <button type="button" aria-label="增加数量" :disabled="quantity >= product.stock" @click="quantity += 1">+</button>
            </div>
            <small>库存 {{ product.stock }} 件</small>
          </div>

          <div class="seller">
            <span class="avatar">{{ product.sellerNickname?.slice(0, 1) || 'U' }}</span>
            <div>
              <strong>{{ product.sellerNickname || '匿名卖家' }}</strong>
              <small>发布于 {{ formatDateTime(product.publishedTime) }}</small>
            </div>
          </div>

          <div class="actions">
            <button v-if="!isOwner && product.status === 2 && product.stock > 0" type="button" class="primary" :disabled="busy" @click="openCheckout">
              立即下单
            </button>
            <span v-if="isOwner" class="owner-tip">这是你发布的商品，不能购买</span>
            <span v-if="!isOwner && product.status === 2 && product.stock <= 0" class="sold-out">库存不足</span>
            <button v-if="!isOwner" type="button" class="ghost" :disabled="busy" @click="startChat">联系卖家</button>
            <button type="button" class="ghost" :disabled="busy" @click="toggleFavorite">
              {{ isFavorite ? '取消收藏' : '收藏商品' }}
            </button>
          </div>
          <p v-if="actionMessage" class="hint">{{ actionMessage }}</p>
        </section>
      </section>

      <section class="panel reviews">
        <div class="section-head">
          <div>
            <h2>交易评价</h2>
          </div>
          <span class="muted">{{ reviews.length }} 条</span>
        </div>
        <p v-if="reviewError" class="hint error">评价暂时无法加载：{{ reviewError }}</p>
        <p v-else-if="!reviews.length" class="hint">还没有评价。</p>
        <div v-else class="review-list">
          <article v-for="review in reviews" :key="review.id" class="review">
            <div class="review-head">
              <strong>{{ review.reviewerNickname || '匿名用户' }}</strong>
              <span class="stars">{{ '★'.repeat(review.rating) }}{{ '☆'.repeat(5 - review.rating) }}</span>
              <small>{{ formatDateTime(review.createTime) }}</small>
            </div>
            <p>{{ review.content || '用户未填写文字评价。' }}</p>
          </article>
        </div>
      </section>

      <div v-if="checkoutOpen" class="checkout-backdrop" @click.self="checkoutOpen = false">
        <section class="checkout-dialog">
          <div class="checkout-head"><div><p class="eyebrow">确认下单</p><h2>{{ needsShippingAddress ? '选择收货地址' : '确认交易信息' }}</h2></div><button type="button" class="close" @click="checkoutOpen = false">×</button></div>
          <div class="checkout-product">
            <div><strong>{{ product.title }}</strong><small>数量 {{ quantity }} 件 · {{ deliveryMethodLabel(product.deliveryMethod) }}</small></div>
            <span>{{ formatMoney(totalAmount) }}</span>
          </div>
          <p v-if="!needsShippingAddress" class="checkout-note">
            {{ deliveryMethodLabel(product.deliveryMethod) }}无需填写收货地址，交易地点：{{ product.location || '卖家暂未填写，请先联系卖家确认' }}。
          </p>
          <label v-for="address in needsShippingAddress ? addresses : []" :key="address.id" class="address-option" :class="{ selected: selectedAddressId === address.id }">
            <input v-model="selectedAddressId" type="radio" :value="address.id" />
            <span class="address-copy"><strong>{{ address.receiverName }}</strong><small>{{ address.receiverPhone }}</small><small>{{ formatAddress(address) }}</small></span>
            <b v-if="address.isDefault === 1">默认</b>
          </label>
          <div class="checkout-actions"><RouterLink v-if="needsShippingAddress" :to="{ name: 'addresses' }" @click="checkoutOpen = false">管理地址</RouterLink><span v-else></span><button type="button" class="primary" :disabled="busy || (needsShippingAddress && !selectedAddressId)" @click="buy">{{ busy ? '提交中...' : '提交订单' }}</button></div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page-shell { max-width: 1180px; margin: 0 auto; padding: 28px 20px 56px; }
.panel { padding: 22px; border: 1px solid rgba(255,255,255,.1); background: rgba(12,18,27,.78); box-shadow: 0 18px 60px rgba(0,0,0,.22); }
.detail-layout { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(360px, .95fr); gap: 20px; }
.gallery-panel { min-width: 0; }
.main-image { display: grid; place-items: center; aspect-ratio: 1 / .82; overflow: hidden; background: #17222d; }
.main-image img { width: 100%; height: 100%; object-fit: cover; }
.main-image span { font-size: 6rem; color: #9de6d8; }
.thumbs { display: flex; gap: 10px; margin-top: 12px; overflow-x: auto; }
.thumbs button { width: 72px; height: 64px; padding: 0; border: 2px solid transparent; background: transparent; cursor: pointer; }
.thumbs button.active { border-color: #9de6d8; }
.thumbs img { width: 100%; height: 100%; object-fit: cover; }
.info-panel { display: grid; align-content: start; gap: 16px; }
.title-row, .section-head, .review-head, .seller, .actions, .facts { display: flex; align-items: center; gap: 12px; }
.title-row, .section-head { justify-content: space-between; align-items: start; }
.eyebrow { margin: 0 0 8px; color: #9de6d8; font-size: 12px; letter-spacing: .16em; }
h1, h2, p { margin: 0; }
h1 { font-size: clamp(1.8rem, 4vw, 3.2rem); line-height: 1.1; }
.price { color: #ffcf75; font-size: 2rem; }
.original-price { color: rgba(248,244,236,.5); text-decoration: line-through; }
.description { color: rgba(248,244,236,.75); white-space: pre-wrap; }
.facts { flex-wrap: wrap; color: rgba(248,244,236,.72); }
.facts span { padding: 7px 10px; background: rgba(255,255,255,.06); }
.quantity-picker { display:flex; align-items:center; flex-wrap:wrap; gap:10px; color:rgba(248,244,236,.82); }
.quantity-picker > span { font-weight:700; }
.quantity-picker small { color:rgba(248,244,236,.58); }
.quantity-controls { display:flex; align-items:center; }
.quantity-controls button { display:grid; place-items:center; width:36px; min-height:36px; padding:0; border:1px solid rgba(255,255,255,.14); color:#f8f4ec; background:rgba(255,255,255,.06); cursor:pointer; font-size:1.2rem; }
.quantity-controls button:disabled { cursor:not-allowed; opacity:.4; }
.quantity-controls input { width:58px; min-height:36px; border:1px solid rgba(255,255,255,.14); border-left:0; border-right:0; border-radius:0; color:#f8f4ec; background:rgba(255,255,255,.06); text-align:center; }
.seller { padding-top: 4px; border-top: 1px solid rgba(255,255,255,.08); }
.avatar { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: #9de6d8; color: #08131d; font-weight: 700; }
.seller strong, .seller small { display: block; }
.seller small, .muted, .hint, .review small { color: rgba(248,244,236,.58); }
.actions { flex-wrap: wrap; }
.primary, .ghost { min-height: 44px; padding: 0 16px; border: 1px solid rgba(255,255,255,.12); cursor: pointer; }
.primary { background: #9de6d8; color: #08131d; }
.ghost { background: rgba(255,255,255,.05); color: #f8f4ec; }
.owner-tip { color: #ffcf75; font-weight: 700; }
.reviews { margin-top: 20px; }
.review-list { display: grid; gap: 12px; }
.review { padding: 14px 0; border-top: 1px solid rgba(255,255,255,.08); }
.checkout-backdrop { position:fixed; z-index:50; inset:0; display:grid; place-items:center; padding:24px; background:rgba(9,16,22,.68); }
.checkout-dialog { width:min(780px,100%); padding:34px 36px 24px; border:0; background:#fff; box-shadow:0 24px 80px rgba(0,0,0,.35); color:#18221b; }
.checkout-head { display:flex; justify-content:space-between; gap:16px; align-items:start; }
.checkout-head h2 { margin:0; color:#101811; font-size:2.35rem; line-height:1.1; }
.checkout-head .eyebrow { margin-bottom:14px; color:#087b73; font-size:.95rem; letter-spacing:.08em; }
.close { display:grid; place-items:center; width:40px; height:40px; border:0; background:transparent; color:#435048; font-size:2.6rem; line-height:1; cursor:pointer; }
.checkout-product { display:flex; justify-content:space-between; gap:20px; margin:28px 0 16px; padding:20px 0; border-top:1px solid #d8dfdc; border-bottom:1px solid #d8dfdc; }
.checkout-product strong { overflow:hidden; color:#18221b; font-size:1.35rem; text-overflow:ellipsis; white-space:nowrap; }
.checkout-product span { flex:none; color:#087b73; font-size:1.35rem; font-weight:800; }
.checkout-note { margin:12px 0 4px; padding:16px 18px; border:1px solid #b9ded5; border-radius:8px; color:#33423f; background:#eef8f5; line-height:1.6; }
.address-option { display:flex; gap:18px; align-items:center; margin-top:12px; min-height:126px; padding:20px 22px; border:1px solid #168f86; background:#dff3ee; cursor:pointer; }
.address-option input { flex:none; width:22px; height:22px; margin:0; accent-color:#087b73; }
.address-option.selected { border-color:#168f86; background:#dff3ee; }
.address-copy { display:grid; gap:4px; flex:1; min-width:0; }
.address-copy strong { color:#33423f; font-size:1.18rem; }
.address-option small { overflow:hidden; color:#687777; font-size:1rem; line-height:1.4; text-overflow:ellipsis; white-space:nowrap; }
.address-option b { align-self:start; color:#087b73; font-size:1rem; }
.checkout-actions { display:flex; justify-content:space-between; align-items:center; gap:20px; margin-top:26px; }
.checkout-actions a { color:#087b73; font-size:1.12rem; font-weight:800; text-decoration:none; }
.checkout-actions .primary { min-width:146px; min-height:58px; padding:0 25px; border:0; border-radius:32px; color:#fff; background:#087f76; font-size:1.1rem; font-weight:800; }
.review-head { flex-wrap: wrap; }
.review-head small { margin-left: auto; }
.review p { margin-top: 8px; color: rgba(248,244,236,.74); }
.stars { color: #ffcf75; letter-spacing: .08em; }
.error { color: #ffb6b6; }
@media (max-width: 860px) { .detail-layout { grid-template-columns: 1fr; } }
@media (max-width: 520px) { .page-shell { padding-inline: 14px; } .panel { padding: 16px; } .review-head small { margin-left: 0; } .checkout-backdrop { padding:0; align-items:end; } .checkout-dialog { padding:26px 20px 20px; } .checkout-head h2 { font-size:1.9rem; } .checkout-product { margin-top:20px; padding:16px 0; } .checkout-product strong,.checkout-product span { font-size:1.05rem; } .address-option { gap:12px; min-height:108px; padding:16px; } .address-copy strong { font-size:1rem; } .address-option small { font-size:.85rem; } .checkout-actions .primary { min-width:126px; min-height:50px; } }
</style>
