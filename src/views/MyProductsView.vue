<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { fetchProducts } from '@/lib/api'
import { formatMoney, statusLabel } from '@/lib/format'
import { imageUrl } from '@/lib/image'
import { useSession } from '@/lib/session'
import type { Product } from '@/types/api'

const router = useRouter()
const session = useSession()
const products = ref<Product[]>([])
const loading = ref(true)
const error = ref('')
const status = ref<number | ''>('')

const counts = computed(() => ({
  all: products.value.length,
  selling: products.value.filter(item => item.status === 2).length,
  sold: products.value.filter(item => item.status === 4).length,
}))

async function load() {
  if (!session.user.value?.id) {
    router.push({ name: 'login', query: { redirect: '/my-products' } })
    return
  }

  loading.value = true
  error.value = ''
  try {
    const result = await fetchProducts({
      sellerId: session.user.value.id,
      status: status.value,
      sortType: 'latest',
      pageNo: 1,
      pageSize: 50,
    })
    products.value = result.records
  } catch (err) {
    error.value = err instanceof Error ? err.message : '商品加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page-shell my-products-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">我的闲置</p>
        <h1>我发布的</h1>
        <p class="lead">管理你发布的校园好物，随时查看商品状态和库存。</p>
      </div>
      <RouterLink to="/publish" class="publish-button">发布新商品 <span>→</span></RouterLink>
    </header>

    <section class="summary">
      <div><strong>{{ counts.all }}</strong><span>全部商品</span></div>
      <div><strong>{{ counts.selling }}</strong><span>在售中</span></div>
      <div><strong>{{ counts.sold }}</strong><span>已售出</span></div>
    </section>

    <section class="toolbar">
      <div>
        <strong>商品列表</strong>
        <span>共 {{ products.length }} 件</span>
      </div>
      <select v-model="status" aria-label="筛选商品状态" @change="load">
        <option value="">全部状态</option>
        <option :value="1">待审核</option>
        <option :value="2">在售中</option>
        <option :value="3">已下架</option>
        <option :value="4">已售出</option>
      </select>
    </section>

    <section class="products-panel">
      <p v-if="loading" class="hint">加载中...</p>
      <p v-else-if="error" class="hint error">{{ error }}</p>
      <div v-else-if="!products.length" class="empty">
        <span>＋</span>
        <strong>还没有发布商品</strong>
        <p>把暂时不用的好物发布出来，让它找到下一位主人。</p>
        <RouterLink to="/publish">发布商品</RouterLink>
      </div>
      <div v-else class="product-grid">
        <RouterLink v-for="item in products" :key="item.id" :to="`/products/${item.id}`" class="product-card">
          <div class="cover">
            <img v-if="item.coverImage" :src="imageUrl(item.coverImage)" :alt="item.title" />
            <span v-else>{{ item.title.slice(0, 1) }}</span>
            <b :class="`status status-${item.status}`">{{ statusLabel(item.status) }}</b>
          </div>
          <div class="card-body">
            <div class="title-row">
              <strong>{{ item.title }}</strong>
              <span>{{ item.stock }} 件</span>
            </div>
            <p class="price">{{ formatMoney(item.price) }}</p>
            <small>{{ item.location || '交易地点待补充' }}</small>
            <small>浏览 {{ item.browseCount || 0 }} · 收藏 {{ item.favoriteCount || 0 }}</small>
          </div>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.my-products-page { max-width:1180px; margin:0 auto; padding:44px 24px 70px; color:var(--ink); }
.page-heading { display:flex; justify-content:space-between; align-items:end; gap:24px; margin-bottom:28px; }
.eyebrow { margin:0 0 12px; color:var(--accent); font-size:13px; font-weight:800; }
h1,p { margin:0; }
h1 { color:#101811; font-family:Georgia,'Times New Roman',serif; font-size:clamp(2.6rem,5vw,4.8rem); line-height:.95; }
.lead { margin-top:14px; color:var(--muted); }
.publish-button { display:inline-flex; align-items:center; gap:12px; min-height:48px; padding:0 20px; border-radius:999px; color:#fff; background:var(--accent); text-decoration:none; font-weight:800; }
.summary { display:flex; gap:10px; margin-bottom:24px; }
.summary div { min-width:108px; padding:14px 16px; border:1px solid var(--line); border-radius:12px; background:#fff; }
.summary strong,.summary span { display:block; }
.summary strong { color:var(--accent-strong); font-size:1.5rem; }
.summary span { margin-top:2px; color:var(--muted); font-size:.78rem; }
.toolbar { display:flex; justify-content:space-between; align-items:center; gap:16px; padding:16px 20px; border:1px solid var(--line); border-bottom:0; border-radius:14px 14px 0 0; background:#fff; }
.toolbar strong,.toolbar span { display:block; }
.toolbar span { margin-top:3px; color:var(--muted); font-size:.82rem; }
select { min-height:40px; border:1px solid var(--line); border-radius:8px; padding:0 12px; color:var(--ink); background:#fff; font:inherit; }
.products-panel { min-height:300px; padding:14px; border:1px solid var(--line); border-radius:0 0 14px 14px; background:rgba(255,255,255,.72); box-shadow:0 16px 38px rgba(32,41,54,.07); }
.hint { padding:36px 12px; color:var(--muted); }
.error { color:var(--danger); }
.product-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; }
.product-card { overflow:hidden; border:1px solid var(--line); border-radius:11px; color:var(--ink); background:#fff; text-decoration:none; transition:transform 180ms ease,box-shadow 180ms ease; }
.product-card:hover { transform:translateY(-3px); box-shadow:0 16px 30px rgba(32,41,54,.1); }
.cover { position:relative; display:grid; place-items:center; aspect-ratio:1/1.02; overflow:hidden; background:#eee8df; }
.cover img { width:100%; height:100%; object-fit:cover; }
.cover > span { color:var(--accent); font-size:4rem; font-weight:800; }
.status { position:absolute; top:10px; left:10px; padding:5px 8px; border-radius:999px; font-size:.72rem; font-weight:800; }
.status-1 { color:#856117; background:#fff0d8; }
.status-2 { color:var(--accent-strong); background:var(--accent-soft); }
.status-3,.status-4 { color:#68717a; background:#eef1f1; }
.card-body { display:grid; gap:6px; padding:14px; }
.title-row { display:flex; justify-content:space-between; align-items:start; gap:8px; }
.title-row strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.title-row span { flex:none; color:var(--muted); font-size:.78rem; }
.price { color:var(--accent-strong); font-size:1.22rem; font-weight:800; }
.card-body small { overflow:hidden; color:var(--muted); text-overflow:ellipsis; white-space:nowrap; }
.empty { display:grid; justify-items:center; gap:8px; padding:80px 20px; color:var(--muted); text-align:center; }
.empty > span { color:var(--accent); font-size:2rem; }
.empty strong { color:var(--ink); }
.empty a { margin-top:8px; padding:10px 15px; border-radius:8px; color:#fff; background:var(--accent); text-decoration:none; font-weight:700; }
@media (max-width:900px) { .product-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
@media (max-width:700px) {
  .my-products-page { padding:28px 14px 50px; }
  .page-heading { display:grid; align-items:start; }
  .summary { flex-wrap:wrap; }
  .product-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
}
@media (max-width:430px) { .product-grid { grid-template-columns:1fr; } .toolbar { display:grid; align-items:start; } }
</style>
