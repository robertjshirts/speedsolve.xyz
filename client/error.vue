<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps({
  error: Object as () => NuxtError
})

const handleError = () => {
  if (props.error?.statusCode === 404) {
    navigateTo('/');
  } else {
    refreshNuxtData();
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-md">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {{ props.error?.statusCode === 404 ? 'Page Not Found' : 'An Error Occurred' }}
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          {{ props.error?.message }}
        </p>
      </div>
      <div class="mt-8 space-y-6">
        <button @click="handleError"
          class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          {{ props.error?.statusCode === 404 ? 'Go back home' : 'Try again' }}

        </button>
      </div>
    </div>
  </div>
</template>
