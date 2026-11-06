<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import { changePassword, fetchCurrentUser, updateCurrentUser } from '@/lib/api'
import { formatDateTime, genderLabel } from '@/lib/format'
import { useSession } from '@/lib/session'

const session = useSession()
const loading = ref(true)
const saving = ref(false)
const passwordSaving = ref(false)
const message = ref('')
const error = ref('')
const form = reactive({ nickname: '', phone: '', avatar: '', studentNo: '', gender: '', major: '', grade: '' })
const password = reactive({ oldPassword: '', newPassword: '' })

async function load() {
  try {
    const user = await fetchCurrentUser()
    session.user.value = user
    Object.assign(form, {
      nickname: user.nickname || '', phone: user.phone || '', avatar: user.avatar || '', studentNo: user.studentNo || '',
      gender: user.gender === null ? '' : String(user.gender), major: user.major || '', grade: user.grade || '',
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : '资料加载失败'
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true; message.value = ''; error.value = ''
  try {
    const user = await updateCurrentUser({
      nickname: form.nickname.trim(), phone: form.phone.trim(), avatar: form.avatar.trim(), studentNo: form.studentNo.trim(),
      gender: form.gender === '' ? '' : Number(form.gender), major: form.major.trim(), grade: form.grade.trim(),
    })
    session.user.value = user
    localStorage.setItem('auth-user', JSON.stringify(user))
    message.value = '资料已保存'
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function savePassword() {
  if (!password.oldPassword || password.newPassword.length < 6) {
    error.value = '原密码不能为空，新密码至少 6 位'
    return
  }
  passwordSaving.value = true; message.value = ''; error.value = ''
  try {
    await changePassword(password)
    password.oldPassword = ''; password.newPassword = ''; message.value = '密码已修改'
  } catch (err) {
    error.value = err instanceof Error ? err.message : '密码修改失败'
  } finally {
    passwordSaving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page-shell">
    <header class="page-heading">
      <div>
        <p class="eyebrow">我的校园账户</p>
        <h1>个人中心</h1>
        <p class="lead">完善资料，让每一次校园交易都更安心。</p>
      </div>
      <div class="profile-badge">
        <span class="avatar">{{ session.user.value?.nickname?.slice(0, 1) || 'U' }}</span>
        <div><strong>{{ session.user.value?.nickname || '校园用户' }}</strong><small>{{ session.user.value?.role === 1 ? '平台管理员' : '校园用户' }}</small></div>
      </div>
    </header>
    <p v-if="loading" class="hint">加载中...</p>
    <template v-else>
      <div class="profile-layout">
        <section class="panel">
          <div class="section-title"><h2>基本资料</h2><span>让别人更了解你</span></div>
          <form class="form" @submit.prevent="save">
            <label>昵称<input v-model="form.nickname" placeholder="校园好物达人" /></label>
            <label>手机号<input v-model="form.phone" placeholder="可选" /></label>
            <label>学号<input v-model="form.studentNo" placeholder="可选" /></label>
            <label>性别<select v-model="form.gender"><option value="">请选择</option><option value="0">未知</option><option value="1">男</option><option value="2">女</option></select></label>
            <label>专业<input v-model="form.major" placeholder="例如 软件工程" /></label>
            <label>年级<input v-model="form.grade" placeholder="例如 2026级" /></label>
            <label>头像地址<input v-model="form.avatar" placeholder="头像图片 URL" /></label>
            <button class="wide-button" type="submit" :disabled="saving">{{ saving ? '保存中...' : '保存资料' }} <span>→</span></button>
          </form>
        </section>
        <aside class="side-column">
          <section class="panel account-card">
            <p class="eyebrow">账户信息</p>
            <div class="account-row"><span>登录账号</span><strong>{{ session.user.value?.username }}</strong></div>
            <div class="account-row"><span>性别</span><strong>{{ genderLabel(session.user.value?.gender) }}</strong></div>
            <div class="account-row"><span>注册时间</span><strong>{{ formatDateTime(session.user.value?.createTime) }}</strong></div>
            <div class="account-row"><span>最近登录</span><strong>{{ formatDateTime(session.user.value?.lastLoginTime) }}</strong></div>
          </section>
          <section class="panel">
            <div class="section-title"><h2>登录安全</h2><span>定期更新密码</span></div>
            <form class="password" @submit.prevent="savePassword">
              <label>原密码<input v-model="password.oldPassword" type="password" /></label>
              <label>新密码<input v-model="password.newPassword" type="password" placeholder="至少 6 位" /></label>
              <button class="wide-button" type="submit" :disabled="passwordSaving">{{ passwordSaving ? '提交中...' : '修改密码' }} <span>→</span></button>
            </form>
          </section>
        </aside>
      </div>
      <p v-if="message" class="success">{{ message }}</p><p v-if="error" class="error">{{ error }}</p>
    </template>
  </div>
</template>

<style scoped>
.page-shell { max-width:1180px; margin:0 auto; padding:44px 24px 70px; color:var(--ink); } .page-heading { display:flex; justify-content:space-between; align-items:end; gap:24px; margin-bottom:28px; } .eyebrow { margin:0 0 12px; color:var(--accent); font-size:13px; font-weight:800; } h1,h2,p { margin:0; } h1 { color:#101811; font-family:Georgia,'Times New Roman',serif; font-size:clamp(2.6rem,5vw,4.8rem); line-height:.95; } .lead,.hint,small { color:var(--muted); } .profile-badge { display:flex; align-items:center; gap:12px; padding:10px 14px 10px 10px; border:1px solid var(--line); border-radius:14px; background:#fff; } .profile-badge strong,.profile-badge small { display:block; } .avatar { display:grid; place-items:center; width:48px; height:48px; border-radius:50%; color:var(--accent-strong); background:var(--accent-soft); font-weight:800; }
.profile-layout { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(300px,.75fr); gap:20px; } .side-column { display:grid; gap:20px; align-content:start; } .panel { padding:26px; border:1px solid var(--line); border-radius:16px; background:rgba(255,255,255,.88); box-shadow:0 16px 38px rgba(32,41,54,.07); } .section-title { display:flex; justify-content:space-between; align-items:baseline; gap:12px; margin-bottom:20px; } .section-title h2 { color:#101811; font-family:Georgia,'Times New Roman',serif; font-size:1.7rem; } .section-title span { color:var(--muted); font-size:.82rem; }
.form { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; } label { display:grid; gap:7px; color:#435048; font-size:.88rem; font-weight:700; } input,select { width:100%; min-height:46px; border:1px solid var(--line); border-radius:8px; padding:0 12px; color:var(--ink); background:#fff; font-weight:400; } input:focus,select:focus { border-color:var(--accent); outline:2px solid rgba(13,118,109,.12); } .wide-button { display:flex; justify-content:space-between; align-items:center; min-height:50px; padding:0 18px; border:0; border-radius:9px; color:#fff; background:var(--accent); font-weight:800; cursor:pointer; } .wide-button:disabled { opacity:.65; cursor:not-allowed; } .form .wide-button { grid-column:1/-1; }
.account-card { display:grid; gap:0; } .account-card .eyebrow { margin-bottom:8px; } .account-row { display:flex; justify-content:space-between; gap:12px; padding:14px 0; border-top:1px solid var(--line); } .account-row span { color:var(--muted); } .account-row strong { font-size:.9rem; text-align:right; } .password { display:grid; gap:14px; } .success { margin-top:16px; color:var(--accent); } .error { margin-top:16px; color:var(--danger); }
@media (max-width:760px) { .page-shell { padding:28px 14px 50px; } .page-heading,.profile-layout { display:grid; grid-template-columns:1fr; align-items:start; } .form { grid-template-columns:1fr; } .form .wide-button { grid-column:auto; } }
</style>
