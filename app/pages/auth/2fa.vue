<script setup lang="ts">
import TwoFactorVerify from '~/components/TwoFactorVerify.vue'

definePageMeta({
  middleware: ['require-2fa']
})
</script>

<template>
  <TwoFactorVerify />
</template>