<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { createProduct, fetchCategories, uploadProductImage } from '@/lib/api'
import type { CategoryNode } from '@/types/api'

const router = useRouter()
const categories = ref<CategoryNode[]>([])
const files = ref<File[]>([])
const previews = ref<string[]>([])
const loading = ref(false)
const error = ref('')
const progress = ref('')
const form = reactive({
  categoryId: '',
  title: '',
  price: '',
  stock: '1',
  originalPrice: '',
  description: '',
  exchangeType: '0',
  deliveryMethod: '0',
  location: '',
  contactPhone: '',
})

function flatten(tree: CategoryNode[], prefix = ''): Array<{ id: number; label: string }> {
  return tree.flatMap(item => [
    { id: item.id, label: prefix ? `${prefix} / ${item.name}` : item.name },
    ...flatten(item.children ?? [], prefix ? `${prefix} / ${item.name}` : item.name),
  ])
}

const options = computed(() => flatten(categories.value))
const needsTradeLocation = computed(() => form.deliveryMethod !== '2')

function pickFiles(event: Event) {
  previews.value.forEach(preview => URL.revokeObjectURL(preview))
  files.value = Array.from((event.target as HTMLInputElement).files ?? [])
  previews.value = files.value.map(file => URL.createObjectURL(file))
}

async function submit() {
  if (!form.categoryId || !form.title.trim() || !form.price) {
    error.value = '请填写分类、标题和价格'
    return
  }
  if (needsTradeLocation.value && !form.location.trim()) {
    error.value = '线下自提和当面交易需要填写交易地点'
    return
  }
  loading.value = true
  error.value = ''
  progress.value = ''
  try {
    const product = await createProduct({
      categoryId: Number(form.categoryId),
      title: form.title.trim(),
      price: form.price,
      stock: Number(form.stock),
      originalPrice: form.originalPrice || undefined,
      description: form.description.trim() || undefined,
      exchangeType: Number(form.exchangeType),
      deliveryMethod: Number(form.deliveryMethod),
      location: form.location.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
    })
    for (const [index, file] of files.value.entries()) {
      progress.value = `正在上传图片 ${index + 1}/${files.value.length}`
      await uploadProductImage(product.id, file, index === 0, index)
    }
    router.push(`/products/${product.id}`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '发布失败'
  } finally {
    loading.value = false
    progress.value = ''
  }
}

onMounted(async () => {
  try {
    categories.value = await fetchCategories()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '分类加载失败'
  }
})

onBeforeUnmount(() => previews.value.forEach(preview => URL.revokeObjectURL(preview)))
</script>

<template>
  <div class="page-shell publish-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">分享一件闲置</p>
        <h1>发布商品</h1>
        <p class="lead">把用不到的好物交给下一位需要它的人。</p>
      </div>
      <RouterLink to="/products" class="back-link">返回商品列表 <span>→</span></RouterLink>
    </header>

    <form class="publish-layout" @submit.prevent="submit">
      <section class="form-panel">
        <div class="section-title">
          <h2>商品信息</h2>
          <span>带 * 为必填</span>
        </div>
        <div class="form-grid">
          <label class="wide">商品标题 *
            <input v-model="form.title" maxlength="128" placeholder="例如 九成新机械键盘" />
          </label>
          <label>商品分类 *
            <select v-model="form.categoryId">
              <option value="">请选择分类</option>
              <option v-for="item in options" :key="item.id" :value="item.id">{{ item.label }}</option>
            </select>
          </label>
          <label>出售价格 *
            <input v-model="form.price" type="number" min="0.01" step="0.01" placeholder="0.01" />
          </label>
          <label>库存数量 *
            <input v-model="form.stock" type="number" min="1" step="1" placeholder="1" />
          </label>
          <label>原价
            <input v-model="form.originalPrice" type="number" min="0.01" step="0.01" placeholder="可选" />
          </label>
          <label>交易方式
            <select v-model="form.exchangeType"><option value="0">一口价</option><option value="1">可交换</option></select>
          </label>
          <label>交付方式
            <select v-model="form.deliveryMethod"><option value="0">线下自提</option><option value="1">当面交易</option><option value="2">卖家配送</option></select>
          </label>
          <label>交易地点{{ needsTradeLocation ? ' *' : '' }}
            <input v-model="form.location" maxlength="128" :placeholder="needsTradeLocation ? '例如 南门广场、宿舍楼下' : '可选'" />
          </label>
          <label>联系电话
            <input v-model="form.contactPhone" maxlength="20" placeholder="可选" />
          </label>
          <label class="wide">商品描述
            <textarea v-model="form.description" rows="7" maxlength="2000" placeholder="描述成色、配件、使用情况和交易要求"></textarea>
          </label>
        </div>
      </section>

      <aside class="side-panel">
        <div class="section-title">
          <h2>商品图片</h2>
          <span>{{ files.length }}/9</span>
        </div>
        <label class="upload-box">
          <input type="file" accept=".jpg,.jpeg,.png,.webp" multiple @change="pickFiles" />
          <span class="upload-icon">＋</span>
          <strong>添加图片</strong>
          <small>支持 JPG、PNG、WEBP</small>
        </label>
        <div v-if="previews.length" class="preview-grid">
          <img v-for="(preview, index) in previews" :key="preview" :src="preview" :alt="`预览图 ${index + 1}`" />
        </div>
        <div v-else class="image-tip">
          <span>01</span>
          <p>第一张图片会自动作为商品封面，清晰的图片更容易被看见。</p>
        </div>
        <p v-if="progress" class="progress">{{ progress }}</p>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="submit-button" type="submit" :disabled="loading">
          {{ loading ? '发布中...' : '发布商品' }} <span>→</span>
        </button>
      </aside>
    </form>
  </div>
</template>

<style>
.publish-page {
  color: #202936;
}

.publish-page,
.publish-page * {
  box-sizing: border-box;
}

.publish-page .panel {
  color: #202936;
  background: #fff;
}

.page-shell { max-width:1180px; margin:0 auto; padding:44px 24px 70px; color:var(--ink); }
.page-heading { display:flex; justify-content:space-between; align-items:end; gap:24px; margin-bottom:28px; }
.eyebrow { margin:0 0 12px; color:var(--accent); font-size:13px; font-weight:800; } h1,h2,p { margin:0; } h1 { color:#101811; font-family:Georgia,'Times New Roman',serif; font-size:clamp(2.6rem,5vw,4.8rem); line-height:.95; } .lead { margin-top:14px; color:var(--muted); }
.back-link { color:var(--accent-strong); font-weight:800; text-decoration:none; }
.publish-layout { display:grid; grid-template-columns:minmax(0,1.35fr) minmax(320px,.65fr); gap:20px; align-items:start; }
.form-panel,.side-panel { padding:26px; border:1px solid var(--line); border-radius:16px; background:rgba(255,255,255,.88); box-shadow:0 16px 38px rgba(32,41,54,.07); }
.side-panel { position:sticky; top:100px; }
.section-title { display:flex; justify-content:space-between; align-items:baseline; gap:12px; margin-bottom:20px; } .section-title h2 { font-family:Georgia,'Times New Roman',serif; font-size:1.7rem; color:#101811; } .section-title span { color:var(--muted); font-size:.82rem; }
.form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; } label { display:grid; gap:7px; color:#435048; font-size:.88rem; font-weight:700; } .wide { grid-column:1/-1; }
input,select,textarea { width:100%; min-height:46px; border:1px solid var(--line); border-radius:8px; padding:10px 12px; color:var(--ink); background:#fff; font-weight:400; } textarea { resize:vertical; } input:focus,select:focus,textarea:focus { border-color:var(--accent); outline:2px solid rgba(13,118,109,.12); }
.upload-box { display:grid; justify-items:center; gap:6px; min-height:180px; padding:20px; border:1.5px dashed #a9c7c1; border-radius:12px; color:var(--accent-strong); background:var(--accent-soft); cursor:pointer; text-align:center; } .upload-box input { display:none; } .upload-icon { display:grid; place-items:center; width:48px; height:48px; border-radius:50%; color:#fff; background:var(--accent); font-size:1.8rem; font-weight:400; } .upload-box small { color:var(--muted); font-weight:400; }
.preview-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:14px; } .preview-grid img { width:100%; aspect-ratio:1; border-radius:8px; object-fit:cover; }
.image-tip { display:flex; gap:12px; align-items:start; margin-top:16px; padding:14px; border-radius:8px; color:var(--muted); background:#f6f8f7; } .image-tip span { color:var(--accent); font-family:Georgia,serif; font-size:1.4rem; } .image-tip p { font-size:.86rem; line-height:1.55; }
.progress { margin-top:14px; color:var(--accent); font-size:.9rem; } .error { margin-top:14px; color:var(--danger); font-size:.9rem; }
.submit-button { display:flex; justify-content:space-between; align-items:center; width:100%; min-height:52px; margin-top:18px; padding:0 20px; border:0; border-radius:9px; color:#fff; background:var(--accent); font-weight:800; cursor:pointer; } .submit-button:disabled { cursor:not-allowed; opacity:.65; }
@media (max-width:850px) { .page-heading,.publish-layout { display:grid; grid-template-columns:1fr; align-items:start; } .side-panel { position:static; } }
@media (max-width:560px) { .page-shell { padding:28px 14px 50px; } .form-panel,.side-panel { padding:18px; } .form-grid { grid-template-columns:1fr; } .wide { grid-column:auto; } }
</style>
