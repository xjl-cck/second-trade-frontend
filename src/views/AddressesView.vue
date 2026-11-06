<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import { createAddress, deleteAddress, fetchAddresses, setDefaultAddress, updateAddress } from '@/lib/api'
import type { ShippingAddress } from '@/types/api'

const addresses = ref<ShippingAddress[]>([])
const loading = ref(true)
const saving = ref(false)
const editingId = ref<number | null>(null)
const message = ref('')
const error = ref('')
const form = reactive({ receiverName: '', receiverPhone: '', province: '', city: '', district: '', detail: '', isDefault: false })

function reset() {
  editingId.value = null
  Object.assign(form, { receiverName: '', receiverPhone: '', province: '', city: '', district: '', detail: '', isDefault: addresses.value.length === 0 })
}

function formatAddress(address: ShippingAddress) {
  return `${address.province}${address.city}${address.district}${address.detail}`
}

async function load() {
  loading.value = true
  try {
    addresses.value = await fetchAddresses()
    if (!editingId.value) reset()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '地址加载失败'
  } finally {
    loading.value = false
  }
}

function edit(address: ShippingAddress) {
  editingId.value = address.id
  Object.assign(form, { ...address, isDefault: address.isDefault === 1 })
  message.value = ''; error.value = ''
}

async function save() {
  saving.value = true; message.value = ''; error.value = ''
  const payload = { ...form, receiverName: form.receiverName.trim(), receiverPhone: form.receiverPhone.trim(), province: form.province.trim(), city: form.city.trim(), district: form.district.trim(), detail: form.detail.trim() }
  try {
    if (editingId.value) await updateAddress(editingId.value, payload)
    else await createAddress(payload)
    await load()
    message.value = editingId.value ? '地址已更新' : '地址已新增'
    reset()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '地址保存失败'
  } finally {
    saving.value = false
  }
}

async function remove(address: ShippingAddress) {
  if (!window.confirm(`确定删除“${address.receiverName}”对应的地址吗？`)) return
  try {
    await deleteAddress(address.id)
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '地址删除失败'
  }
}

async function makeDefault(address: ShippingAddress) {
  try {
    await setDefaultAddress(address.id)
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '默认地址设置失败'
  }
}

onMounted(load)
</script>

<template>
  <div class="page-shell addresses-page">
    <header class="page-heading"><div><p class="eyebrow">配送信息</p><h1>收货地址</h1><p class="lead">管理下单时可选择的收货地址。</p></div></header>
    <div class="address-layout">
      <section class="panel"><div class="section-title"><h2>{{ editingId ? '编辑地址' : '新增地址' }}</h2><button v-if="editingId" type="button" class="text-button" @click="reset">取消编辑</button></div>
        <form class="form-grid" @submit.prevent="save">
          <label>收件人<input v-model="form.receiverName" maxlength="32" required /></label><label>联系电话<input v-model="form.receiverPhone" inputmode="numeric" maxlength="11" required /></label>
          <label>省份<input v-model="form.province" maxlength="32" placeholder="例如 广东省" required /></label><label>城市<input v-model="form.city" maxlength="32" placeholder="例如 深圳市" required /></label>
          <label>区县<input v-model="form.district" maxlength="32" placeholder="例如 南山区" required /></label><label class="check"><input v-model="form.isDefault" type="checkbox" />设为默认地址</label>
          <label class="wide">详细地址<input v-model="form.detail" maxlength="128" placeholder="街道、楼栋、宿舍或门牌号" required /></label>
          <button class="primary wide" type="submit" :disabled="saving">{{ saving ? '保存中...' : editingId ? '保存修改' : '新增地址' }}</button>
        </form>
        <p v-if="message" class="success">{{ message }}</p><p v-if="error" class="error">{{ error }}</p>
      </section>
      <section class="panel"><div class="section-title"><h2>我的地址</h2><span>{{ addresses.length }} 条</span></div>
        <p v-if="loading" class="hint">加载中...</p><p v-else-if="!addresses.length" class="hint">还没有收货地址。</p>
        <div v-else class="address-list"><article v-for="address in addresses" :key="address.id" class="address-card"><div><strong>{{ address.receiverName }} {{ address.receiverPhone }}</strong><p>{{ formatAddress(address) }}</p></div><span v-if="address.isDefault === 1" class="default">默认</span><div class="actions"><button v-if="address.isDefault !== 1" type="button" class="text-button" @click="makeDefault(address)">设为默认</button><button type="button" class="text-button" @click="edit(address)">编辑</button><button type="button" class="text-button danger" @click="remove(address)">删除</button></div></article></div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.addresses-page { max-width:1180px; margin:0 auto; padding:44px 24px 70px; color:var(--ink); }.page-heading { margin-bottom:28px; }.eyebrow { margin:0 0 12px; color:var(--accent); font-size:13px; font-weight:800; }h1,h2,p { margin:0; }h1,h2 { color:#101811; font-family:Georgia,'Times New Roman',serif; }h1 { font-size:3.2rem; }.lead,.hint { margin-top:12px; color:var(--muted); }.address-layout { display:grid; grid-template-columns:minmax(300px,.8fr) minmax(0,1.2fr); gap:20px; align-items:start; }.panel { padding:24px; border:1px solid var(--line); border-radius:10px; background:#fff; box-shadow:0 16px 38px rgba(32,41,54,.07); }.section-title { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:18px; }.section-title h2 { font-size:1.5rem; }.section-title span { color:var(--muted); }.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }label { display:grid; gap:6px; color:#435048; font-size:.86rem; font-weight:700; }input { min-height:44px; border:1px solid var(--line); border-radius:8px; padding:0 11px; color:var(--ink); font:inherit; }.wide { grid-column:1/-1; }.check { display:flex; align-items:center; gap:8px; padding-top:25px; }.check input { min-height:auto; width:16px; height:16px; }.primary { min-height:46px; border:0; border-radius:8px; color:#fff; background:var(--accent); font:inherit; font-weight:800; cursor:pointer; }.text-button { border:0; padding:4px 0; color:var(--accent-strong); background:transparent; font:inherit; font-size:.85rem; cursor:pointer; }.danger,.error { color:var(--danger); }.success { margin-top:14px; color:var(--accent); }.address-list { display:grid; gap:12px; }.address-card { display:grid; grid-template-columns:1fr auto; gap:10px 16px; padding:16px; border:1px solid var(--line); border-radius:8px; }.address-card strong { color:#18221b; }.address-card p { margin-top:7px; color:var(--muted); line-height:1.5; }.default { align-self:start; padding:3px 7px; border-radius:999px; color:var(--accent-strong); background:var(--accent-soft); font-size:.76rem; font-weight:800; }.actions { grid-column:1/-1; display:flex; gap:14px; }.hint { padding:24px 0; }@media (max-width:760px) { .addresses-page { padding:28px 14px 50px; }.address-layout { grid-template-columns:1fr; }.form-grid { grid-template-columns:1fr; }.wide { grid-column:auto; } }
</style>
