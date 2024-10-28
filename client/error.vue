<script setup lang="ts">
import { defineProps } from 'vue';
import type { NuxtError } from '#app'

setPageLayout('default');

defineProps({
  error: Object as () => NuxtError
})

</script>

<template>
  <NuxtLayout>
    <div>
      <h1>{{ error?.statusCode }}</h1>
      <NuxtLink to="/">Go back home</NuxtLink>
    </div>
  </NuxtLayout>
</template>
