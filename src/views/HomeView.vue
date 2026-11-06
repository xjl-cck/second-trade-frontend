<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { fetchProducts } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { imageUrl } from '@/lib/image'
import type { Product } from '@/types/api'

const loading = ref(true)
const error = ref('')
const products = ref<Product[]>([])

const heroImage = 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=80'

async function load() {
  loading.value = true
  error.value = ''
  try {
    products.value = (await fetchProducts({ pageNo: 1, pageSize: 5 })).records
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="home-page">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">校园好物上新</p>
        <h1>旧物新遇见，交易更轻松。</h1>
        <p class="lead">发现同校同学正在转手的教材、数码、宿舍用品和生活小物。</p>
        <div class="actions">
          <RouterLink to="/products" class="primary">立即逛逛 <span>→</span></RouterLink>
          <RouterLink to="/publish" class="ghost">发布闲置</RouterLink>
        </div>
      </div>

      <div class="hero-visual">
        <img :src="heroImage" alt="校园二手交易" />
        <article class="floating-card">
          <button type="button" aria-label="收藏">♡</button>
          <strong>本周热门</strong>
          <span>教材 · 数码 · 宿舍好物</span>
          <RouterLink to="/products">查看精选</RouterLink>
        </article>
      </div>
    </section>

    <section class="perks">
      <article>
        <span>校</span>
        <strong>同校交易</strong>
        <small>地点更近，沟通更快</small>
      </article>
      <article>
        <span>验</span>
        <strong>真实信息</strong>
        <small>商品细节清楚展示</small>
      </article>
      <article>
        <span>聊</span>
        <strong>即时私聊</strong>
        <small>下单前先问清楚</small>
      </article>
      <article>
        <span>订</span>
        <strong>订单留痕</strong>
        <small>交易状态随时可查</small>
      </article>
    </section>

    <section class="catalog">
      <div class="section-head">
        <h2>最新上架</h2>
        <RouterLink to="/products">查看更多 <span>→</span></RouterLink>
      </div>

      <p v-if="loading" class="hint">加载中...</p>
      <p v-else-if="error" class="hint error">{{ error }}</p>

      <div v-else class="product-grid">
        <RouterLink v-for="item in products" :key="item.id" :to="`/products/${item.id}`" class="product-card">
          <div class="cover">
            <img v-if="item.coverImage" :src="imageUrl(item.coverImage)" :alt="item.title" />
            <span v-else>{{ item.title.slice(0, 1) }}</span>
            <button type="button" aria-label="收藏商品">♡</button>
          </div>
          <div class="meta">
            <strong>{{ item.title }}</strong>
            <p>{{ formatMoney(item.price) }}</p>
            <small>{{ item.sellerNickname || '匿名同学' }}</small>
          </div>
        </RouterLink>
      </div>
    </section>

  </div>
</template>

<style scoped>
.home-page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 28px 24px 64px;
  color: var(--ink);
}

.hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(420px, 1.08fr);
  min-height: 560px;
  overflow: hidden;
  border-radius: 34px;
  background:
    radial-gradient(circle at 72% 22%, #e8b1aa 0 15%, transparent 15.2%),
    radial-gradient(circle at 98% 20%, #eee3d6 0 18%, transparent 18.2%),
    #fff8f0;
  box-shadow: 0 24px 70px rgba(54, 69, 58, 0.13);
}

.hero-copy {
  z-index: 1;
  align-self: center;
  padding: 74px 0 74px 58px;
}

.eyebrow {
  margin: 0 0 18px;
  color: var(--accent);
  font-size: 13px;
  font-weight: 800;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  max-width: 9ch;
  color: #101811;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(3.2rem, 7vw, 6.9rem);
  font-weight: 700;
  line-height: 0.92;
}

.lead {
  max-width: 34ch;
  margin-top: 22px;
  color: #415047;
  font-size: 1.08rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 30px;
}

.primary,
.ghost,
.section-head a,
.floating-card a,
.deal-banner a,
.product-card {
  text-decoration: none;
}

.primary,
.ghost,
.deal-banner a {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  min-height: 50px;
  padding: 0 24px;
  border-radius: 999px;
  font-weight: 800;
}

.primary,
.deal-banner a {
  color: #fff;
  background: var(--accent);
}

.ghost {
  color: var(--accent-strong);
  border: 1px solid rgba(13, 118, 109, 0.18);
  background: rgba(255, 255, 255, 0.7);
}

.hero-visual {
  position: relative;
  min-height: 560px;
}

.hero-visual img {
  position: absolute;
  right: 7%;
  bottom: 0;
  width: min(520px, 82%);
  height: 86%;
  object-fit: cover;
  object-position: center;
  border-radius: 260px 260px 0 0;
  box-shadow: 0 26px 60px rgba(32, 41, 54, 0.18);
}

.floating-card {
  position: absolute;
  right: 28px;
  bottom: 74px;
  display: grid;
  gap: 8px;
  width: 235px;
  padding: 22px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 44px rgba(32, 41, 54, 0.12);
}

.floating-card button {
  justify-self: end;
  width: 32px;
  height: 32px;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: #fff;
}

.floating-card strong {
  font-size: 1.12rem;
}

.floating-card span,
.floating-card a,
.hint,
.product-card small {
  color: var(--muted);
}

.perks {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  padding: 28px 26px;
}

.perks article {
  display: grid;
  justify-items: center;
  gap: 6px;
  text-align: center;
}

.perks span,
.mail-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  color: var(--accent-strong);
  background: var(--accent-soft);
  font-weight: 800;
}

.perks small {
  color: var(--muted);
}

.catalog {
  padding: 28px 32px;
  border: 1px solid rgba(32, 41, 54, 0.08);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 18px 44px rgba(54, 69, 58, 0.08);
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 24px;
}

.section-head h2 {
  color: #101811;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 2rem;
}

.section-head a {
  color: var(--accent-strong);
  font-weight: 800;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 18px;
}

.product-card {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  color: var(--ink);
}

.cover {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 1.08 / 1;
  overflow: hidden;
  background: #eee7dc;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover span {
  color: var(--accent);
  font-size: 3rem;
  font-weight: 800;
}

.cover button {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 34px;
  height: 34px;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
}

.meta {
  display: grid;
  gap: 4px;
  padding: 12px 14px 14px;
}

.meta strong {
  overflow: hidden;
  color: #1f2925;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta p {
  color: var(--accent-strong);
  font-weight: 800;
}

.error {
  color: var(--danger);
}

@media (max-width: 1060px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .hero-copy {
    padding: 48px 32px 0;
  }

  .hero-visual {
    min-height: 430px;
  }

  .product-grid,
  .perks {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .home-page {
    padding: 18px 14px 44px;
  }

  .hero {
    border-radius: 24px;
  }

  .hero-copy {
    padding: 36px 22px 0;
  }

  .hero-visual img {
    right: 9%;
    width: 82%;
  }

  .floating-card {
    right: 18px;
    bottom: 28px;
    width: 200px;
  }

  .perks,
  .product-grid {
    grid-template-columns: 1fr;
  }

  .catalog {
    padding: 22px;
  }
}
</style>
