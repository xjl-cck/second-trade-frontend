<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <div class="page-shell">
    <section class="panel">
      <p class="eyebrow">规划中</p>
      <h1>{{ title }}</h1>
      <p class="lead">{{ description }}</p>
    </section>
  </div>
</template>

<style scoped>
.page-shell {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 20px 56px;
}

.panel {
  padding: 22px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(13, 18, 26, 0.72);
  backdrop-filter: blur(16px);
}

.eyebrow {
  margin: 0 0 10px;
  color: #8dd3c7;
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

h1,
.lead {
  margin: 0;
}

.lead {
  margin-top: 12px;
  color: rgba(244, 239, 231, 0.72);
}
</style>
