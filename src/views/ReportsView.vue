<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { createReport, fetchMyReports } from '@/lib/api'
import { formatDateTime, reportStatusLabel, reportTargetLabel } from '@/lib/format'
import type { Report } from '@/types/api'

const reports = ref<Report[]>([])
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const error = ref('')
const status = ref<number | ''>('')
const targetType = ref<'product' | 'user' | 'message' | ''>('')

const form = ref({
  targetType: 'product' as 'product' | 'user' | 'message',
  targetId: '',
  reason: '',
  detail: '',
  evidenceUrls: '',
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    reports.value = (await fetchMyReports({
      status: status.value,
      targetType: targetType.value,
      pageNo: 1,
      pageSize: 30,
    })).records
  } catch (err) {
    error.value = err instanceof Error ? err.message : '举报列表加载失败'
  } finally {
    loading.value = false
  }
}

async function submit() {
  const targetId = Number(form.value.targetId)
  if (!targetId || !form.value.reason.trim()) {
    error.value = '请填写举报对象 ID 和举报原因'
    return
  }

  saving.value = true
  error.value = ''
  message.value = ''
  try {
    await createReport({
      targetType: form.value.targetType,
      targetId,
      reason: form.value.reason.trim(),
      detail: form.value.detail.trim(),
      evidenceUrls: form.value.evidenceUrls.trim(),
    })
    form.value.reason = ''
    form.value.detail = ''
    form.value.evidenceUrls = ''
    message.value = '举报已提交'
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '举报提交失败'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page-shell reports-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">社区守护</p>
        <h1>举报中心</h1>
        <p class="lead">遇到违规商品、用户或消息，可以在这里提交线索并跟进处理结果。</p>
      </div>
      <div class="report-note"><span>01</span><strong>认真描述<br />让处理更高效</strong></div>
    </header>

    <section class="toolbar">
      <div>
        <strong>我的举报</strong>
        <span>查看历史提交和处理进度</span>
      </div>
      <div class="filters">
        <select v-model="targetType" aria-label="筛选举报对象" @change="load">
          <option value="">全部对象</option>
          <option value="product">商品</option>
          <option value="user">用户</option>
          <option value="message">消息</option>
        </select>
        <select v-model="status" aria-label="筛选举报状态" @change="load">
          <option value="">全部状态</option>
          <option :value="0">待处理</option>
          <option :value="1">已受理</option>
          <option :value="2">已驳回</option>
          <option :value="3">已关闭</option>
        </select>
      </div>
    </section>

    <section class="layout">
      <form class="form-panel" @submit.prevent="submit">
        <div class="section-title">
          <h2>提交举报</h2>
          <span>请尽量提供准确的信息</span>
        </div>
        <label><span>举报对象</span>
          <select v-model="form.targetType">
            <option value="product">商品</option>
            <option value="user">用户</option>
            <option value="message">消息</option>
          </select>
        </label>
        <label><span>对象 ID</span>
          <input v-model="form.targetId" type="number" min="1" placeholder="填写页面中的对象编号" />
        </label>
        <label><span>举报原因</span>
          <input v-model="form.reason" maxlength="100" placeholder="例如：描述不实、恶意骚扰" />
        </label>
        <label><span>详细说明</span>
          <textarea v-model="form.detail" rows="5" maxlength="1000" placeholder="补充说明具体问题"></textarea>
        </label>
        <label><span>证据链接</span>
          <input v-model="form.evidenceUrls" placeholder="可填写图片或相关页面地址" />
        </label>
        <button class="submit-button" type="submit" :disabled="saving">{{ saving ? '提交中...' : '提交举报' }} <span>→</span></button>
        <p v-if="message" class="feedback success">{{ message }}</p>
        <p v-if="error" class="feedback error">{{ error }}</p>
      </form>

      <section class="records-panel">
        <p v-if="loading" class="hint">加载中...</p>
        <div v-else-if="!reports.length" class="empty">
          <span>◎</span>
          <strong>暂无举报记录</strong>
          <p>提交后的内容和处理进度会显示在这里。</p>
        </div>
        <div v-else class="report-list">
          <article v-for="item in reports" :key="item.id" class="report">
            <div class="row">
              <strong>{{ reportTargetLabel(item.targetType) }} #{{ item.targetId }}</strong>
              <span class="badge">{{ reportStatusLabel(item.status) }}</span>
            </div>
            <p>{{ item.reason }}</p>
            <small>{{ formatDateTime(item.createTime) }}</small>
            <small v-if="item.handleResult">处理结果：{{ item.handleResult }}</small>
          </article>
        </div>
      </section>
    </section>
  </div>
</template>

<style scoped>
.reports-page { max-width:1180px; margin:0 auto; padding:44px 24px 70px; color:var(--ink); }
.page-heading { display:flex; justify-content:space-between; align-items:end; gap:24px; margin-bottom:30px; }
.eyebrow { margin:0 0 12px; color:var(--accent); font-size:13px; font-weight:800; }
h1,h2,p { margin:0; }
h1 { color:#101811; font-family:Georgia,'Times New Roman',serif; font-size:clamp(2.6rem,5vw,4.8rem); line-height:.95; }
.lead { max-width:620px; margin-top:14px; color:var(--muted); }
.report-note { display:flex; align-items:center; gap:12px; padding:14px 18px; border-left:3px solid var(--warm); color:var(--ink); background:#fff7e9; }
.report-note span { color:var(--warm); font-family:Georgia,serif; font-size:1.8rem; }
.report-note strong { font-size:.84rem; line-height:1.5; }
.toolbar { display:flex; justify-content:space-between; align-items:center; gap:16px; padding:16px 20px; border:1px solid var(--line); border-bottom:0; border-radius:14px 14px 0 0; background:#fff; }
.toolbar strong,.toolbar span { display:block; }
.toolbar span { margin-top:3px; color:var(--muted); font-size:.82rem; }
.filters,.row { display:flex; gap:10px; align-items:center; }
.layout { display:grid; grid-template-columns:370px minmax(0,1fr); gap:14px; }
.form-panel,.records-panel { padding:24px; border:1px solid var(--line); background:#fff; box-shadow:0 16px 38px rgba(32,41,54,.07); }
.form-panel { display:grid; gap:14px; border-radius:0 0 0 14px; }
.records-panel { min-height:360px; border-radius:0 0 14px 0; }
.section-title { display:flex; justify-content:space-between; align-items:baseline; gap:10px; margin-bottom:6px; }
.section-title h2 { color:#18221b; font-family:Georgia,'Times New Roman',serif; font-size:1.7rem; }
.section-title span { color:var(--muted); font-size:.78rem; }
label { display:grid; gap:7px; color:#435048; font-size:.88rem; font-weight:700; }
input,select,textarea,button { min-height:44px; border:1px solid var(--line); border-radius:8px; background:#fff; color:var(--ink); padding:8px 12px; font:inherit; }
textarea { resize:vertical; }
input:focus,select:focus,textarea:focus { border-color:var(--accent); outline:2px solid rgba(13,118,109,.12); }
.submit-button { display:flex; justify-content:space-between; align-items:center; margin-top:4px; border-color:var(--accent); background:var(--accent); color:#fff; cursor:pointer; font-weight:800; }
.submit-button:disabled { opacity:.6; cursor:not-allowed; }
.feedback { margin-top:4px; font-size:.88rem; }
.success { color:var(--accent); }
.error { color:var(--danger); }
.hint { color:var(--muted); }
.report-list { display:grid; gap:12px; }
.report { display:grid; gap:9px; padding:16px; border:1px solid var(--line); border-radius:10px; background:#fbfcfb; }
.row { justify-content:space-between; }
.row strong { color:#18221b; }
.report p { color:#435048; line-height:1.6; }
.report small { color:var(--muted); }
.badge { padding:5px 8px; border-radius:999px; color:var(--accent-strong); background:var(--accent-soft); font-size:.76rem; font-weight:700; }
.empty { display:grid; justify-items:center; gap:8px; padding:90px 20px; color:var(--muted); text-align:center; }
.empty span { color:var(--accent); font-size:2rem; }
.empty strong { color:var(--ink); }
@media (max-width:880px) {
  .page-heading,.toolbar,.layout { display:grid; grid-template-columns:1fr; align-items:start; }
  .form-panel,.records-panel { border-radius:0; }
  .filters { justify-content:start; }
}
@media (max-width:520px) {
  .reports-page { padding:28px 14px 50px; }
  .filters { display:grid; grid-template-columns:1fr 1fr; }
  .toolbar { padding:14px; }
  .form-panel,.records-panel { padding:18px; }
}
</style>
