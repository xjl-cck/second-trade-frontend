<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  auditAdminProduct,
  createAdminCategory,
  deleteAdminCategory,
  fetchAdminCategories,
  fetchAdminOrders,
  fetchAdminProducts,
  fetchAdminReports,
  fetchAdminUsers,
  handleAdminReport,
  updateAdminCategory,
  updateAdminUser,
} from '@/lib/api'
import {
  formatDateTime,
  formatMoney,
  orderStatusLabel,
  reportStatusLabel,
  reportTargetLabel,
  statusLabel,
} from '@/lib/format'
import type { Order, Product, Report, UserProfile } from '@/types/api'
import type { AdminCategory } from '@/lib/api'

const tabs = ['商品审核', '举报处理', '用户管理', '分类管理', '订单查看'] as const
type Tab = typeof tabs[number]

const activeTab = ref<Tab>('商品审核')
const loading = ref(false)
const error = ref('')
const message = ref('')

const products = ref<Product[]>([])
const productStatus = ref<number | ''>(1)
const productKeyword = ref('')

const reports = ref<Report[]>([])
const reportStatus = ref<number | ''>(0)

const users = ref<UserProfile[]>([])
const userKeyword = ref('')

const categories = ref<AdminCategory[]>([])
const categoryForm = ref({ parentId: '0', name: '', icon: '', sort: '1', status: 1 })

const orders = ref<Order[]>([])
const orderStatus = ref<number | ''>('')
const orderNo = ref('')

const flatCategories = computed(() => flattenCategories(categories.value))

function flattenCategories(tree: AdminCategory[], prefix = ''): Array<{ item: AdminCategory; label: string }> {
  return tree.flatMap(item => {
    const label = prefix ? `${prefix} / ${item.name}` : item.name
    return [{ item, label }, ...flattenCategories(item.children ?? [], label)]
  })
}

async function load() {
  loading.value = true
  error.value = ''
  message.value = ''
  try {
    if (activeTab.value === '商品审核') {
      products.value = (await fetchAdminProducts({
        keyword: productKeyword.value.trim(),
        status: productStatus.value,
        pageNo: 1,
        pageSize: 50,
      })).records
    } else if (activeTab.value === '举报处理') {
      reports.value = (await fetchAdminReports({ status: reportStatus.value, pageNo: 1, pageSize: 50 })).records
    } else if (activeTab.value === '用户管理') {
      users.value = (await fetchAdminUsers({ keyword: userKeyword.value.trim(), pageNo: 1, pageSize: 50 })).records
    } else if (activeTab.value === '分类管理') {
      categories.value = await fetchAdminCategories()
    } else {
      orders.value = (await fetchAdminOrders({
        status: orderStatus.value,
        orderNo: orderNo.value.trim(),
        pageNo: 1,
        pageSize: 50,
      })).records
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '后台数据加载失败'
  } finally {
    loading.value = false
  }
}

async function run(action: () => Promise<unknown>, success: string) {
  error.value = ''
  message.value = ''
  try {
    await action()
    message.value = success
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '操作失败'
  }
}

function auditProduct(item: Product, pass: boolean) {
  const reason = window.prompt(pass ? '审核通过说明（可选）' : '驳回原因（可选）') ?? ''
  run(() => auditAdminProduct(item.id, pass ? 2 : 3, reason), pass ? '商品已上架' : '商品已驳回')
}

function handleReport(item: Report, nextStatus: 1 | 2 | 3) {
  const result = window.prompt('处理结果') ?? ''
  run(() => handleAdminReport(item.id, nextStatus, result), '举报状态已更新')
}

function saveUser(item: UserProfile) {
  run(() => updateAdminUser(item.id, {
    nickname: item.nickname,
    phone: item.phone ?? '',
    avatar: item.avatar ?? '',
    studentNo: item.studentNo ?? '',
    gender: item.gender ?? 0,
    major: item.major ?? '',
    grade: item.grade ?? '',
    role: item.role ?? 0,
    status: item.status ?? 1,
  }), '用户信息已保存')
}

function addCategory() {
  if (!categoryForm.value.name.trim()) {
    error.value = '请填写分类名称'
    return
  }
  run(() => createAdminCategory({
    parentId: Number(categoryForm.value.parentId || 0),
    name: categoryForm.value.name.trim(),
    icon: categoryForm.value.icon.trim(),
    sort: Number(categoryForm.value.sort || 0),
    status: categoryForm.value.status,
  }), '分类已新增')
  categoryForm.value.name = ''
  categoryForm.value.icon = ''
}

function toggleCategory(item: AdminCategory) {
  run(() => updateAdminCategory(item.id, { status: item.status === 1 ? 0 : 1 }), '分类状态已更新')
}

function removeCategory(item: AdminCategory) {
  if (!window.confirm(`确认删除分类“${item.name}”？`)) return
  run(() => deleteAdminCategory(item.id), '分类已删除')
}

function switchTab(tab: Tab) {
  activeTab.value = tab
  load()
}

onMounted(load)
</script>

<template>
  <div class="page-shell">
    <section class="panel head">
      <div>
        <h1>管理后台</h1>
        <p class="lead">覆盖商品审核、举报处理、用户、分类和订单查看。</p>
      </div>
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab"
          type="button"
          :class="{ active: activeTab === tab }"
          @click="switchTab(tab)"
        >
          {{ tab }}
        </button>
      </div>
    </section>

    <section class="panel workspace">
      <p v-if="message" class="hint success">{{ message }}</p>
      <p v-if="error" class="hint error">{{ error }}</p>

      <template v-if="activeTab === '商品审核'">
        <div class="filters">
          <input v-model="productKeyword" placeholder="商品关键词" @keydown.enter="load" />
          <select v-model="productStatus" @change="load">
            <option value="">全部状态</option>
            <option :value="1">待审核</option>
            <option :value="2">上架中</option>
            <option :value="3">已下架</option>
            <option :value="4">已售出</option>
          </select>
          <button type="button" @click="load">查询</button>
        </div>
        <p v-if="loading" class="hint">加载中...</p>
        <div v-else class="list">
          <article v-for="item in products" :key="item.id" class="row-card">
            <div>
              <strong>{{ item.title }}</strong>
              <small>{{ formatMoney(item.price) }} · {{ statusLabel(item.status) }} · 卖家 {{ item.sellerNickname || item.sellerId }}</small>
              <small v-if="item.auditReason">审核说明：{{ item.auditReason }}</small>
            </div>
            <div class="actions">
              <RouterLink :to="`/products/${item.id}`">查看</RouterLink>
              <button type="button" @click="auditProduct(item, true)">通过</button>
              <button type="button" class="ghost" @click="auditProduct(item, false)">驳回</button>
            </div>
          </article>
        </div>
      </template>

      <template v-else-if="activeTab === '举报处理'">
        <div class="filters">
          <select v-model="reportStatus" @change="load">
            <option value="">全部状态</option>
            <option :value="0">待处理</option>
            <option :value="1">已受理</option>
            <option :value="2">已驳回</option>
            <option :value="3">已关闭</option>
          </select>
        </div>
        <p v-if="loading" class="hint">加载中...</p>
        <div v-else class="list">
          <article v-for="item in reports" :key="item.id" class="row-card">
            <div>
              <strong>{{ reportTargetLabel(item.targetType) }} #{{ item.targetId }} · {{ item.reason }}</strong>
              <small>{{ reportStatusLabel(item.status) }} · 举报人 {{ item.reporterNickname || item.reporterId }} · {{ formatDateTime(item.createTime) }}</small>
              <small v-if="item.detail">{{ item.detail }}</small>
            </div>
            <div class="actions">
              <button type="button" @click="handleReport(item, 1)">受理</button>
              <button type="button" class="ghost" @click="handleReport(item, 2)">驳回</button>
              <button type="button" class="ghost" @click="handleReport(item, 3)">关闭</button>
            </div>
          </article>
        </div>
      </template>

      <template v-else-if="activeTab === '用户管理'">
        <div class="filters">
          <input v-model="userKeyword" placeholder="账号、昵称、手机号、学号" @keydown.enter="load" />
          <button type="button" @click="load">查询</button>
        </div>
        <p v-if="loading" class="hint">加载中...</p>
        <div v-else class="list">
          <article v-for="item in users" :key="item.id" class="user-row">
            <div>
              <strong>{{ item.nickname || item.username }}</strong>
              <small>{{ item.username }} · {{ item.phone || '未填手机' }} · {{ item.studentNo || '未填学号' }}</small>
            </div>
            <select v-model.number="item.role">
              <option :value="0">学生</option>
              <option :value="1">管理员</option>
            </select>
            <select v-model.number="item.status">
              <option :value="0">禁用</option>
              <option :value="1">正常</option>
              <option :value="2">封禁</option>
            </select>
            <button type="button" @click="saveUser(item)">保存</button>
          </article>
        </div>
      </template>

      <template v-else-if="activeTab === '分类管理'">
        <form class="category-form" @submit.prevent="addCategory">
          <select v-model="categoryForm.parentId">
            <option value="0">顶级分类</option>
            <option v-for="{ item, label } in flatCategories" :key="item.id" :value="item.id">{{ label }}</option>
          </select>
          <input v-model="categoryForm.name" placeholder="分类名称" />
          <input v-model="categoryForm.icon" placeholder="图标标识" />
          <input v-model="categoryForm.sort" type="number" placeholder="排序" />
          <select v-model.number="categoryForm.status">
            <option :value="1">启用</option>
            <option :value="0">禁用</option>
          </select>
          <button type="submit">新增分类</button>
        </form>
        <p v-if="loading" class="hint">加载中...</p>
        <div v-else class="list">
          <article v-for="{ item, label } in flatCategories" :key="item.id" class="row-card">
            <div>
              <strong>{{ label }}</strong>
              <small>ID {{ item.id }} · 排序 {{ item.sort ?? 0 }} · {{ item.status === 1 ? '启用' : '禁用' }}</small>
            </div>
            <div class="actions">
              <button type="button" @click="toggleCategory(item)">{{ item.status === 1 ? '禁用' : '启用' }}</button>
              <button type="button" class="ghost" @click="removeCategory(item)">删除</button>
            </div>
          </article>
        </div>
      </template>

      <template v-else>
        <div class="filters">
          <input v-model="orderNo" placeholder="订单号" @keydown.enter="load" />
          <select v-model="orderStatus" @change="load">
            <option value="">全部状态</option>
            <option :value="0">待确认</option>
            <option :value="1">已成交</option>
            <option :value="2">已取消</option>
            <option :value="3">已完成</option>
          </select>
          <button type="button" @click="load">查询</button>
        </div>
        <p v-if="loading" class="hint">加载中...</p>
        <div v-else class="list">
          <article v-for="item in orders" :key="item.id" class="row-card">
            <div>
              <strong>{{ item.productTitle || '商品' }} · {{ formatMoney(item.amount) }}</strong>
              <small>{{ item.orderNo }} · {{ orderStatusLabel(item.status) }} · {{ formatDateTime(item.createTime) }}</small>
              <small>买家 {{ item.buyerNickname || item.buyerId }} · 卖家 {{ item.sellerNickname || item.sellerId }}</small>
            </div>
            <RouterLink :to="`/products/${item.productId}`">商品详情</RouterLink>
          </article>
        </div>
      </template>

      <p v-if="!loading && activeTab === '商品审核' && !products.length" class="hint">暂无商品。</p>
      <p v-if="!loading && activeTab === '举报处理' && !reports.length" class="hint">暂无举报。</p>
      <p v-if="!loading && activeTab === '用户管理' && !users.length" class="hint">暂无用户。</p>
      <p v-if="!loading && activeTab === '分类管理' && !flatCategories.length" class="hint">暂无分类。</p>
      <p v-if="!loading && activeTab === '订单查看' && !orders.length" class="hint">暂无订单。</p>
    </section>
  </div>
</template>

<style scoped>
.page-shell { max-width:1320px; margin:0 auto; padding:34px 24px 64px; color:var(--ink); }
.panel { padding:24px; border:1px solid #dfe5e4; border-radius:10px; background:rgba(255,255,255,.9); box-shadow:0 14px 34px rgba(32,41,54,.07); }
.head { display:grid; grid-template-columns:minmax(260px,.72fr) minmax(0,1.28fr); gap:28px; align-items:end; margin-bottom:18px; }
.eyebrow { margin:0 0 8px; color:var(--accent); font-size:11px; font-weight:700; letter-spacing:.16em; text-transform:uppercase; }
h1,.lead,p { margin:0; }
.lead,.hint,small { color:var(--muted); }
.tabs,.filters,.actions,.category-form { display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
.tabs { justify-content:end; }
.workspace { display:grid; gap:14px; }
input,select,button,a { min-height:40px; border:1px solid var(--line); border-radius:8px; background:#fff; color:var(--ink); padding:8px 12px; }
button,a { cursor:pointer; text-decoration:none; }
button:not(.ghost),a,.tabs .active { border-color:var(--accent); background:var(--accent); color:#fff; }
.ghost { background:var(--surface-soft); color:var(--ink); }
.list { display:grid; gap:10px; }
.row-card,.user-row { display:grid; gap:12px; align-items:center; padding:16px; border:1px solid var(--line); border-radius:8px; background:#fbfcfc; }
.row-card { grid-template-columns:minmax(0,1fr) auto; }
.user-row { grid-template-columns:minmax(0,1fr) 120px 120px auto; }
.row-card strong,.row-card small,.user-row strong,.user-row small { display:block; }
.row-card strong,.user-row strong { color:var(--ink); }
.success { color:var(--accent); }
.error { color:var(--danger); }
@media (max-width:900px) { .head,.row-card,.user-row { grid-template-columns:1fr; align-items:start; } .tabs { justify-content:start; } }
@media (max-width:520px) { .page-shell { padding-inline:14px; } .filters,.category-form { display:grid; } }
</style>
