<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { createOrder, fetchAddresses, fetchCategories, fetchProducts } from '@/lib/api'
import { deliveryMethodLabel, formatMoney, statusLabel } from '@/lib/format'
import { imageUrl } from '@/lib/image'
import { createIdempotencyKey } from '@/lib/order'
import { useSession } from '@/lib/session'
import type { CategoryNode, Product, ShippingAddress } from '@/types/api'

const router = useRouter()
const session = useSession()
const loading = ref(false)
const error = ref('')
const categories = ref<CategoryNode[]>([])
const products = ref<Product[]>([])
const total = ref(0)
const keyword = ref('')
const categoryId = ref('')
const status = ref('')
const minPrice = ref('')
const maxPrice = ref('')
const sortType = ref<'latest' | 'hot'>('latest')
const pageNo = ref(1)
const pageSize = ref(12)
const selectedIds = ref<number[]>([])
const addresses = ref<ShippingAddress[]>([])
const selectedAddressId = ref<number | null>(null)
const checkoutOpen = ref(false)
const batchBusy = ref(false)
const batchMessage = ref('')

function flatten(tree: CategoryNode[], prefix = ''): Array<{ id: number; label: string }> {
  return tree.flatMap(item => {
    const label = prefix ? `${prefix} / ${item.name}` : item.name
    return [{ id: item.id, label }, ...flatten(item.children ?? [], label)]
  })
}

const categoryOptions = computed(() => flatten(categories.value))
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const selectedProducts = computed(() => products.value.filter(item => selectedIds.value.includes(item.id)))
const selectedTotal = computed(() => selectedProducts.value.reduce((sum, item) => sum + Number(item.price || 0), 0))
const selectedNeedsAddress = computed(() => selectedProducts.value.some(item => item.deliveryMethod === 2))

function isSelectable(product: Product) {
  return product.status === 2 && product.stock > 0
}

function toggleSelection(product: Product) {
  if (!isSelectable(product)) return
  selectedIds.value = selectedIds.value.includes(product.id)
    ? selectedIds.value.filter(id => id !== product.id)
    : [...selectedIds.value, product.id]
  batchMessage.value = ''
}

function formatAddress(address: ShippingAddress) {
  return `${address.province}${address.city}${address.district}${address.detail}`
}

async function openBatchCheckout() {
  if (!session.isLoggedIn.value) {
    router.push('/login')
    return
  }
  if (!selectedProducts.value.length) {
    batchMessage.value = '请先选择至少一件在售商品'
    return
  }
  batchBusy.value = true
  batchMessage.value = ''
  try {
    if (selectedNeedsAddress.value) {
      addresses.value = await fetchAddresses()
      if (!addresses.value.length) {
        batchMessage.value = '包含卖家配送商品，请先新增收货地址'
        router.push({ name: 'addresses' })
        return
      }
      const defaultAddress = addresses.value.find(item => item.isDefault === 1) ?? addresses.value[0]
      if (!defaultAddress) return
      selectedAddressId.value = defaultAddress.id
    } else {
      addresses.value = []
      selectedAddressId.value = null
    }
    checkoutOpen.value = true
  } catch (err) {
    batchMessage.value = err instanceof Error ? err.message : '地址加载失败'
  } finally {
    batchBusy.value = false
  }
}

async function submitBatchPurchase() {
  if (!selectedProducts.value.length || (selectedNeedsAddress.value && !selectedAddressId.value)) return
  batchBusy.value = true
  batchMessage.value = ''
  let createdCount = 0
  try {
    for (const product of selectedProducts.value) {
      await createOrder(product.id, createIdempotencyKey(), product.deliveryMethod === 2 ? selectedAddressId.value : null)
      createdCount += 1
    }
    selectedIds.value = []
    checkoutOpen.value = false
    router.push({ name: 'orders', query: { batch: '1' } })
  } catch (err) {
    batchMessage.value = createdCount
      ? `已成功下单 ${createdCount} 件，剩余商品下单失败：${err instanceof Error ? err.message : '请稍后重试'}`
      : err instanceof Error ? err.message : '批量下单失败'
  } finally {
    batchBusy.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [categoryData, productPage] = await Promise.all([
      fetchCategories(),
      fetchProducts({
        keyword: keyword.value.trim(),
        categoryId: categoryId.value ? Number(categoryId.value) : '',
        status: status.value ? Number(status.value) : '',
        minPrice: minPrice.value ? Number(minPrice.value) : '',
        maxPrice: maxPrice.value ? Number(maxPrice.value) : '',
        sortType: sortType.value,
        pageNo: pageNo.value,
        pageSize: pageSize.value,
      }),
    ])
    categories.value = categoryData
    products.value = productPage.records
    total.value = productPage.total
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function search() {
  pageNo.value = 1
  load()
}

function changePage(delta: number) {
  const next = pageNo.value + delta
  if (next < 1 || next > pageCount.value) return
  pageNo.value = next
  load()
}

onMounted(load)
</script>

<template>
  <div class="page-shell product-list-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">校园好物集市</p>
        <h1>发现同校的好东西</h1>
        <p class="lead">教材、数码、生活用品，都能在这里找到合适的下一位主人。</p>
      </div>
      <div class="heading-actions">
        <RouterLink v-if="session.isLoggedIn.value" to="/my-products" class="my-products-entry">我的商品</RouterLink>
        <button type="button" class="batch-entry" :disabled="batchBusy" @click="openBatchCheckout">批量购买</button>
        <RouterLink to="/publish" class="primary">发布闲置 <span>→</span></RouterLink>
      </div>
    </header>

    <section class="filter-panel">
      <div class="search-box">
        <span>⌕</span>
        <input v-model="keyword" placeholder="搜索商品名称" @keydown.enter="search" />
      </div>
      <select v-model="categoryId">
        <option value="">全部分类</option>
        <option v-for="item in categoryOptions" :key="item.id" :value="item.id">{{ item.label }}</option>
      </select>
      <input v-model="minPrice" class="short-input" type="number" min="0" placeholder="最低价" />
      <input v-model="maxPrice" class="short-input" type="number" min="0" placeholder="最高价" />
      <button type="button" class="filter-button" @click="search">筛选</button>
    </section>

    <div class="toolbar">
      <strong>全部商品</strong>
      <span>{{ total }} 件好物</span>
      <select v-model="sortType" @change="search">
        <option value="latest">最新发布</option>
        <option value="hot">最受欢迎</option>
      </select>
    </div>

    <p v-if="loading" class="hint">加载中...</p>
    <p v-else-if="error" class="hint error">{{ error }}</p>
    <p v-else-if="!products.length" class="empty">还没有找到符合条件的商品。</p>

    <div v-else class="cards">
      <RouterLink
        v-for="item in products"
        :key="item.id"
        :to="`/products/${item.id}`"
        class="card"
        :class="{ selected: selectedIds.includes(item.id) }"
      >
        <div class="cover">
          <img v-if="item.coverImage" :src="imageUrl(item.coverImage)" :alt="item.title" />
          <span v-else>{{ item.title.slice(0, 1) }}</span>
          <label v-if="isSelectable(item)" class="select-box" @click.stop>
            <input
              type="checkbox"
              :checked="selectedIds.includes(item.id)"
              :aria-label="`选择 ${item.title}`"
              @change="toggleSelection(item)"
            />
            <span>选购</span>
          </label>
          <button type="button" aria-label="收藏商品">♡</button>
        </div>
        <div class="body">
          <div class="title-line">
            <strong>{{ item.title }}</strong>
            <span v-if="item.status === 2" class="available">在售</span>
          </div>
          <p class="price">{{ formatMoney(item.price) }}</p>
          <small>{{ item.sellerNickname || '匿名同学' }} · {{ statusLabel(item.status) }}</small>
        </div>
      </RouterLink>
    </div>

    <p v-if="batchMessage" class="batch-message" :class="{ error: batchMessage.includes('失败') }">{{ batchMessage }}</p>

    <footer class="pager">
      <span>共 {{ total }} 件</span>
      <div>
        <button type="button" :disabled="pageNo === 1" @click="changePage(-1)">上一页</button>
        <span>{{ pageNo }} / {{ pageCount }}</span>
        <button type="button" :disabled="pageNo === pageCount" @click="changePage(1)">下一页</button>
      </div>
    </footer>

    <div v-if="selectedProducts.length" class="batch-bar">
      <span>已选 {{ selectedProducts.length }} 件</span>
      <strong>合计 {{ formatMoney(selectedTotal) }}</strong>
      <button type="button" class="primary" :disabled="batchBusy" @click="openBatchCheckout">
        {{ batchBusy ? '处理中...' : '统一下单' }}
      </button>
    </div>

    <div v-if="checkoutOpen" class="checkout-backdrop" @click.self="checkoutOpen = false">
      <section class="checkout-dialog">
        <div class="checkout-head">
          <div><p class="eyebrow">批量购买</p><h2>{{ selectedNeedsAddress ? '确认商品和收货地址' : '确认商品' }}</h2></div>
          <button type="button" class="close" aria-label="关闭" @click="checkoutOpen = false">×</button>
        </div>
        <div class="checkout-summary">
          <div v-for="item in selectedProducts" :key="item.id" class="checkout-item">
            <span>{{ item.title }} · {{ deliveryMethodLabel(item.deliveryMethod) }}</span>
            <strong>{{ formatMoney(item.price) }}</strong>
          </div>
          <div class="checkout-total"><span>共 {{ selectedProducts.length }} 件</span><strong>{{ formatMoney(selectedTotal) }}</strong></div>
        </div>
        <div v-if="!selectedNeedsAddress" class="checkout-note">
          <p>所选商品均为线下交易方式，无需填写收货地址。</p>
          <small v-for="item in selectedProducts" :key="item.id">{{ item.title }}：{{ item.location || '卖家暂未填写交易地点，请先联系卖家确认' }}</small>
        </div>
        <label v-for="address in selectedNeedsAddress ? addresses : []" :key="address.id" class="address-option" :class="{ selected: selectedAddressId === address.id }">
          <input v-model="selectedAddressId" type="radio" :value="address.id" />
          <span class="address-copy"><strong>{{ address.receiverName }}</strong><small>{{ address.receiverPhone }}</small><small>{{ formatAddress(address) }}</small></span>
          <b v-if="address.isDefault === 1">默认</b>
        </label>
        <div class="checkout-actions">
          <RouterLink v-if="selectedNeedsAddress" :to="{ name: 'addresses' }" @click="checkoutOpen = false">管理地址</RouterLink>
          <span v-else></span>
          <button type="button" class="primary" :disabled="batchBusy || (selectedNeedsAddress && !selectedAddressId)" @click="submitBatchPurchase">{{ batchBusy ? '提交中...' : '提交批量订单' }}</button>
        </div>
      </section>
    </div>
  </div>
</template>

<style>
.product-list-page {
  color: #202936;
}

.product-list-page,
.product-list-page * {
  box-sizing: border-box;
}

.product-list-page .panel,
.product-list-page .card {
  color: #202936;
  background: #fff;
}

.page-shell { max-width:1280px; margin:0 auto; padding:44px 24px 70px; color:var(--ink); }
.page-heading { display:flex; justify-content:space-between; gap:24px; align-items:end; margin-bottom:28px; }
.heading-actions { display:flex; align-items:center; gap:10px; }
.eyebrow { margin:0 0 12px; color:var(--accent); font-size:13px; font-weight:800; }
h1,.lead,p { margin:0; } h1 { color:#101811; font-family:Georgia,'Times New Roman',serif; font-size:clamp(2.6rem,5vw,4.8rem); line-height:.95; } .lead { max-width:48ch; margin-top:15px; color:var(--muted); }
.primary,.filter-button { display:inline-flex; align-items:center; justify-content:center; gap:12px; min-height:48px; padding:0 20px; border:1px solid var(--accent); border-radius:999px; color:#fff; background:var(--accent); text-decoration:none; font-weight:800; cursor:pointer; }
.filter-panel { display:grid; grid-template-columns:minmax(240px,1.5fr) 1.1fr repeat(3,minmax(90px,.6fr)) auto; gap:10px; align-items:center; padding:14px; border:1px solid var(--line); border-radius:14px; background:#fff; box-shadow:0 10px 26px rgba(32,41,54,.06); }
.search-box { display:flex; align-items:center; gap:10px; min-height:44px; padding:0 14px; border:1px solid var(--line); border-radius:8px; color:var(--accent); } .search-box input { width:100%; border:0; outline:0; color:var(--ink); background:transparent; }
select,input { min-height:44px; min-width:0; border:1px solid var(--line); border-radius:8px; padding:0 12px; color:var(--ink); background:#fff; } .filter-button { min-height:44px; border-radius:8px; }
.toolbar { display:flex; align-items:center; gap:10px; margin:34px 0 16px; } .toolbar strong { font-size:1.2rem; } .toolbar span { color:var(--muted); } .toolbar select { margin-left:auto; min-height:38px; }
.cards { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:18px; }
.card { overflow:hidden; border:1px solid var(--line); border-radius:12px; background:#fff; color:var(--ink); text-decoration:none; transition:transform 180ms ease, box-shadow 180ms ease; } .card:hover { transform:translateY(-3px); box-shadow:0 16px 30px rgba(32,41,54,.1); } .card.selected { border-color:var(--accent); box-shadow:0 0 0 3px rgba(13,118,109,.12); }
.cover { position:relative; display:grid; place-items:center; aspect-ratio:1/1.02; overflow:hidden; background:#eee8df; } .cover img { width:100%; height:100%; object-fit:cover; } .cover > span { color:var(--accent); font-size:4rem; font-weight:800; }
.cover button { position:absolute; top:12px; right:12px; display:grid; place-items:center; width:34px; height:34px; border:1px solid var(--line); border-radius:50%; background:rgba(255,255,255,.9); cursor:pointer; }
.select-box { position:absolute; top:10px; left:10px; display:flex; align-items:center; gap:4px; padding:5px 7px; border:1px solid var(--line); border-radius:7px; color:var(--ink); background:rgba(255,255,255,.92); cursor:pointer; font-size:.7rem; font-weight:700; } .select-box span { color:inherit; font-size:inherit; font-weight:inherit; } .select-box input { width:14px; height:14px; min-width:14px; min-height:14px; margin:0; padding:0; border:1px solid #89918e; border-radius:3px; accent-color:var(--accent); }
.body { display:grid; gap:6px; padding:14px; } .title-line { display:flex; align-items:start; justify-content:space-between; gap:8px; } .title-line strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .available { flex:none; color:var(--accent); font-size:.72rem; } .price { color:var(--accent-strong); font-size:1.22rem; font-weight:800; } small,.hint,.empty { color:var(--muted); }
.pager { display:flex; justify-content:space-between; align-items:center; margin-top:24px; color:var(--muted); } .pager div { display:flex; align-items:center; gap:10px; } .pager button { min-height:38px; border:1px solid var(--line); border-radius:8px; color:var(--ink); background:#fff; cursor:pointer; } .pager button:disabled { cursor:not-allowed; opacity:.45; } .error { color:var(--danger); }
button.batch-entry { min-height:48px; padding:0 18px; border:1px solid var(--accent); border-radius:999px; color:var(--accent-strong); background:var(--accent-soft); cursor:pointer; font-weight:800; } button.batch-entry:disabled { cursor:not-allowed; opacity:.6; }
.my-products-entry { display:inline-flex; align-items:center; justify-content:center; min-height:48px; padding:0 18px; border:1px solid var(--line); border-radius:999px; color:var(--ink); background:#fff; text-decoration:none; font-weight:800; }
.batch-message { margin-top:18px; color:var(--accent-strong); } .batch-bar { position:sticky; bottom:18px; z-index:10; display:flex; align-items:center; gap:18px; margin:24px auto 0; padding:14px 16px; border:1px solid var(--accent); border-radius:12px; color:var(--ink); background:#fff; box-shadow:0 12px 30px rgba(32,41,54,.15); } .batch-bar strong { margin-left:auto; color:var(--accent-strong); } .batch-bar .primary { min-height:42px; border-radius:8px; }
.checkout-backdrop { position:fixed; z-index:50; inset:0; display:grid; place-items:center; padding:24px; background:rgba(9,16,22,.68); } .checkout-dialog { width:min(780px,100%); max-height:90vh; overflow:auto; padding:34px 36px 24px; background:#fff; color:#18221b; box-shadow:0 24px 80px rgba(0,0,0,.35); } .checkout-head { display:flex; justify-content:space-between; gap:16px; align-items:start; } .checkout-head h2 { margin:0; color:#101811; font-size:2.15rem; line-height:1.1; } .checkout-head .eyebrow { margin-bottom:14px; color:#087b73; font-size:.95rem; letter-spacing:.08em; } .close { display:grid; place-items:center; width:40px; height:40px; border:0; background:transparent; color:#435048; font-size:2.6rem; line-height:1; cursor:pointer; } .checkout-summary { margin:22px 0 16px; border-top:1px solid #d8dfdc; border-bottom:1px solid #d8dfdc; } .checkout-item,.checkout-total { display:flex; justify-content:space-between; gap:18px; padding:12px 0; } .checkout-item span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .checkout-item strong,.checkout-total strong { color:#087b73; } .checkout-total { border-top:1px solid #e6ece9; font-weight:800; } .checkout-note { display:grid; gap:6px; margin:12px 0 4px; padding:16px 18px; border:1px solid #b9ded5; border-radius:8px; color:#33423f; background:#eef8f5; line-height:1.6; } .checkout-note small { display:block; color:#52635f; } .address-option { display:flex; gap:18px; align-items:center; margin-top:12px; min-height:106px; padding:18px 20px; border:1px solid #cfdad6; background:#fff; cursor:pointer; } .address-option input { flex:none; width:22px; height:22px; margin:0; accent-color:#087b73; } .address-option.selected { border-color:#168f86; background:#dff3ee; } .address-copy { display:grid; gap:4px; flex:1; min-width:0; } .address-copy strong { color:#33423f; font-size:1.08rem; } .address-option small { overflow:hidden; color:#687777; font-size:.92rem; line-height:1.4; text-overflow:ellipsis; white-space:nowrap; } .address-option b { align-self:start; color:#087b73; font-size:.9rem; } .checkout-actions { display:flex; justify-content:space-between; align-items:center; gap:20px; margin-top:26px; } .checkout-actions a { color:#087b73; font-weight:800; text-decoration:none; } .checkout-actions .primary { min-height:52px; padding:0 22px; border:0; border-radius:28px; color:#fff; background:#087f76; font-weight:800; cursor:pointer; } .checkout-actions .primary:disabled { cursor:not-allowed; opacity:.6; }
@media (max-width:1000px) { .filter-panel { grid-template-columns:repeat(3,minmax(0,1fr)); } .search-box { grid-column:1/-1; } .cards { grid-template-columns:repeat(3,minmax(0,1fr)); } }
@media (max-width:700px) { .page-shell { padding:28px 14px 50px; } .page-heading { display:grid; align-items:start; } .heading-actions { flex-wrap:wrap; } .filter-panel,.cards { grid-template-columns:repeat(2,minmax(0,1fr)); } .search-box,.filter-button { grid-column:1/-1; } .toolbar { margin-top:26px; } }
@media (max-width:520px) { .batch-bar { align-items:stretch; flex-wrap:wrap; gap:9px 14px; } .batch-bar strong { margin-left:0; } .batch-bar .primary { width:100%; } .checkout-backdrop { padding:0; align-items:end; } .checkout-dialog { padding:26px 20px 20px; } .checkout-head h2 { font-size:1.8rem; } .address-option { gap:12px; min-height:98px; padding:15px; } .checkout-actions .primary { min-height:48px; padding:0 15px; } }
@media (max-width:430px) { .filter-panel,.cards { grid-template-columns:1fr; } .toolbar { display:grid; } .toolbar select { margin-left:0; } .pager { display:grid; gap:12px; } }
</style>
