<script setup lang="ts">
const config = useRuntimeConfig();
const route = useRoute();

const response = await fetch(`${config.public.apiUrl}profile/${route.params.username}`);
if (!response.ok) {
  throw createError({
    statusCode: response.status,
    statusMessage: await response.json()
  });
}

const body = await response.json();

</script>

<template>
  <div>
    <p>{{ body }}</p>
  </div>
</template>
