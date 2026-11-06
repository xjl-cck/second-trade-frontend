<script setup lang="ts">
import { onMounted } from 'vue'

import { startRealtime } from '@/lib/realtime'
import { useSession } from '@/lib/session'

const session = useSession()

onMounted(() => {
  if (session.token.value) startRealtime()
})
</script>

<template>
  <RouterView />
</template>
