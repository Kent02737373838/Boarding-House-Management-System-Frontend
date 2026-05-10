<script setup lang="ts">
import { RouterView } from 'vue-router'
import AIChatbot from '@/components/chat/AIChatbot.vue'

const groqKey = import.meta.env.VITE_GROQ_API_KEY
</script>

<template>
  <RouterView />
  <AIChatbot :groq-api-key="groqKey" />
</template>