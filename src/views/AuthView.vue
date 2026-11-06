<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { login, register } from '@/lib/api'
import { useSession } from '@/lib/session'

const props = defineProps<{ mode: 'login' | 'register' }>()
const route = useRoute()
const router = useRouter()
const session = useSession()
const loading = ref(false)
const error = ref('')
const form = reactive({
  username: '',
  password: '',
  nickname: '',
  phone: '',
  studentNo: '',
})

async function submit() {
  error.value = ''
  if (!form.username.trim() || !form.password) {
    error.value = '请填写账号和密码'
    return
  }
  if (props.mode === 'register' && !form.nickname.trim()) {
    error.value = '请填写昵称'
    return
  }
  loading.value = true
  try {
    if (props.mode === 'login') {
      const result = await login({ username: form.username.trim(), password: form.password })
      session.setSession(result.token, result.user)
      router.push(typeof route.query.redirect === 'string' ? route.query.redirect : '/')
    } else {
      await register({
        username: form.username.trim(),
        password: form.password,
        nickname: form.nickname.trim(),
        phone: form.phone.trim() || undefined,
        studentNo: form.studentNo.trim() || undefined,
      })
      router.push({ name: 'login', query: { registered: '1' } })
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '操作失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page-shell auth-page">
    <section class="panel auth">
      <div class="copy">
        <p class="eyebrow">校园账号</p>
        <h1>{{ props.mode === 'login' ? '欢迎回来' : '加入校园闲置交易' }}</h1>
        <p class="lead">{{ props.mode === 'login' ? '登录后可以收藏商品、下单、聊天和管理自己的商品。' : '注册一个账号，开始发布和交换校园闲置。' }}</p>
      </div>
      <form class="form" @submit.prevent="submit">
        <label>账号<input v-model="form.username" autocomplete="username" placeholder="student001" /></label>
        <label>密码<input v-model="form.password" autocomplete="current-password" type="password" placeholder="至少 6 位" /></label>
        <template v-if="props.mode === 'register'">
          <label>昵称<input v-model="form.nickname" placeholder="校园好物达人" /></label>
          <label>手机号<input v-model="form.phone" placeholder="可选" /></label>
          <label>学号<input v-model="form.studentNo" placeholder="可选" /></label>
        </template>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" :disabled="loading">{{ loading ? '提交中...' : props.mode === 'login' ? '登录' : '注册' }}</button>
        <p v-if="props.mode === 'login'" class="register-entry">
          还没有账号？
          <RouterLink to="/register">立即注册</RouterLink>
        </p>
      </form>
    </section>
  </div>
</template>

<style scoped>
.auth-page { max-width:1180px; margin:0 auto; padding:44px 24px 70px; color:var(--ink); }
.panel { padding:34px; border:1px solid var(--line); border-radius:16px; background:rgba(255,255,255,.9); box-shadow:0 16px 38px rgba(32,41,54,.07); }
.auth { display:grid; grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr); gap:clamp(34px,7vw,96px); align-items:center; }
.eyebrow { margin:0 0 12px; color:var(--accent); font-size:13px; font-weight:800; }
h1,.lead { margin:0; }
h1 { color:#101811; font-family:Georgia,'Times New Roman',serif; font-size:clamp(2.8rem,5vw,5rem); line-height:.95; }
.lead { max-width:520px; margin-top:18px; color:var(--muted); font-size:1rem; line-height:1.7; }
.form { display:grid; gap:15px; }
label { display:grid; gap:7px; color:#435048; font-size:.88rem; font-weight:700; }
input,button { width:100%; min-height:46px; padding:0 13px; border:1px solid var(--line); border-radius:8px; font:inherit; }
input { color:var(--ink); background:#fff; }
input::placeholder { color:#9aa5a2; }
input:focus { border-color:var(--accent); outline:2px solid rgba(13,118,109,.12); }
button { margin-top:4px; border-color:var(--accent); color:#fff; background:var(--accent); cursor:pointer; font-weight:800; }
button:disabled { cursor:wait; opacity:.6; }
.error { margin:0; color:var(--danger); }
.register-entry { margin:0; color:var(--muted); font-size:.88rem; text-align:center; }
.register-entry a { color:var(--accent-strong); font-weight:800; text-decoration:none; }
.register-entry a:hover { text-decoration:underline; }
@media (max-width:760px) {
  .auth-page { padding:28px 14px 50px; }
  .panel { padding:24px 20px; }
  .auth { grid-template-columns:1fr; gap:34px; }
  h1 { font-size:clamp(2.8rem,15vw,4.4rem); }
}
</style>
