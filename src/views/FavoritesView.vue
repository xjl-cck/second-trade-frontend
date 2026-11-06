<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { fetchFavorites, unfavoriteProduct } from '@/lib/api'
import { formatMoney, statusLabel } from '@/lib/format'
import { imageUrl } from '@/lib/image'
import type { FavoriteProduct } from '@/types/api'

const products = ref<FavoriteProduct[]>([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  try {
    products.value = (await fetchFavorites()).records
  } catch (err) {
    error.value = err instanceof Error ? err.message : '收藏加载失败'
  } finally {
    loading.value = false
  }
}

async function remove(productId: number) {
  try {
    await unfavoriteProduct(productId)
    products.value = products.value.filter(item => item.id !== productId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '取消收藏失败'
  }
}

onMounted(load)
</script>

<template>
  <div class="page-shell">
    <header class="page-heading">
      <div>
        <p class="eyebrow">留住心动好物</p>
        <h1>我的收藏</h1>
        <p class="lead">把喜欢的商品放在这里，等一个合适的交易时机。</p>
      </div>
      <span class="count">{{ products.length }} 件商品</span>
    </header>
    <section class="collection-panel">
      <p v-if="loading" class="hint">加载中...</p>
      <p v-else-if="error" class="hint error">{{ error }}</p>
      <p v-else-if="!products.length" class="empty">还没有收藏商品，去逛逛校园好物吧。</p>
      <div v-else class="grid">
        <article v-for="item in products" :key="item.id" class="card">
          <RouterLink :to="`/products/${item.id}`" class="cover">
            <img v-if="item.coverImage" :src="imageUrl(item.coverImage)" :alt="item.title" />
            <span v-else>{{ item.title.slice(0, 1) }}</span>
            <i>♡</i>
          </RouterLink>
          <div class="body">
            <RouterLink :to="`/products/${item.id}`" class="title">{{ item.title }}</RouterLink>
            <strong>{{ formatMoney(item.price) }}</strong>
            <small>{{ item.sellerNickname || '匿名同学' }} · {{ statusLabel(item.status) }}</small>
            <button type="button" @click="remove(item.id)">移出收藏</button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page-shell { max-width:1180px; margin:0 auto; padding:44px 24px 70px; color:var(--ink); } .page-heading { display:flex; justify-content:space-between; align-items:end; gap:24px; margin-bottom:28px; } .eyebrow { margin:0 0 12px; color:var(--accent); font-size:13px; font-weight:800; } h1,p { margin:0; } h1 { color:#101811; font-family:Georgia,'Times New Roman',serif; font-size:clamp(2.6rem,5vw,4.8rem); line-height:.95; } .lead,.hint,small,.count { color:var(--muted); } .count { padding:10px 14px; border:1px solid var(--line); border-radius:999px; background:#fff; font-weight:700; }
.collection-panel { padding:24px; border:1px solid var(--line); border-radius:16px; background:rgba(255,255,255,.88); box-shadow:0 16px 38px rgba(32,41,54,.07); } .grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:18px; } .card { overflow:hidden; border:1px solid var(--line); border-radius:12px; background:#fff; } .cover { position:relative; display:grid; place-items:center; aspect-ratio:1/1.02; overflow:hidden; background:#eee8df; text-decoration:none; } .cover img { width:100%; height:100%; object-fit:cover; } .cover span { color:var(--accent); font-size:4rem; font-weight:800; } .cover i { position:absolute; top:10px; right:10px; display:grid; place-items:center; width:34px; height:34px; border-radius:50%; color:var(--accent-strong); background:#fff; font-style:normal; }
.body { display:grid; gap:7px; padding:14px; } .title { overflow:hidden; color:var(--ink); font-weight:800; text-decoration:none; text-overflow:ellipsis; white-space:nowrap; } .body strong { color:var(--accent-strong); font-size:1.22rem; } .body button { min-height:36px; margin-top:5px; border:1px solid var(--line); border-radius:8px; color:var(--ink); background:var(--surface-soft); cursor:pointer; } .empty { padding:60px 20px; color:var(--muted); text-align:center; } .error { color:var(--danger); }
@media (max-width:900px) { .grid { grid-template-columns:repeat(3,minmax(0,1fr)); } } @media (max-width:640px) { .page-shell { padding:28px 14px 50px; } .page-heading { display:grid; align-items:start; } .grid { grid-template-columns:repeat(2,minmax(0,1fr)); } } @media (max-width:430px) { .grid { grid-template-columns:1fr; } }
</style>
