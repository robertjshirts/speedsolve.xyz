<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useCompetitionStore } from '~/composables/useCompetitionStore'
import { useCompetition } from '~/composables/useCompetition'

const { loading, authenticated, login } = useAuth()
const { timer, startTimer, stopTimer, resetTimer } = useCubeTimer()
const { formatTime } = useTimeFormat()
const store = useCompetitionStore()
const { initializeSession, startSolve, completeSolve } = useCompetition()

onMounted(async () => {
  if (authenticated) {
    await initializeSession()
  }
})

// Timer handlers
function handleStartSolve() {
  resetTimer()
  startTimer()
  startSolve()
}

function handleCompleteSolve() {
  stopTimer()
  completeSolve(timer.value)
}
</script>

<template>
  <div v-if="loading" class="flex-1 flex items-center justify-center h-screen">
    <div class="text-xl text-gray-600 dark:text-white animate-pulse">Loading...</div>
  </div>

  <div v-else-if="!authenticated" class="flex-1 flex items-center justify-center">
    <button @click="login" class="px-4 py-2 bg-indigo-800 text-white text-lg rounded hover:bg-blue-700">
      Login
    </button>
  </div>

  <!-- Main Timer Interface -->
  <div v-else-if="store.session" class="flex flex-row">
    <!-- Left Column: Timer and Controls -->
    <div class="grow flex flex-col items-center">
      <!-- Connection Status -->
      <div v-if="store.connectionState !== 'connected'" class="w-full p-2 text-center" :class="{
        'bg-yellow-600': store.connectionState === 'connecting',
        'bg-red-600': store.connectionState === 'disconnected'
      }">
        {{ store.connectionState === 'connecting' ? 'Connecting...' : 'Disconnected' }}
      </div>

      <!-- Error Display -->
      <div v-if="store.error" class="w-full p-2 bg-red-600 text-white text-center">
        {{ store.error }}
      </div>

      <!-- Scramble Display -->
      <div class="w-full p-2 rounded shadow-sm bg-gray-800">
        <p class="text-center text-gray-800 dark:text-white font-mono text-4xl">
          {{ store.currentScramble }}
        </p>
      </div>

      <!-- Timer Display -->
      <div class="font-mono text-[20em] flex flex-row items-center h-2/3">
        {{ formatTime(timer) }}
      </div>

      <!-- Control Buttons -->
      <div class="space-x-2">
        <button v-if="store.currentState === 'scrambling'" @click="handleStartSolve"
          class="px-4 py-2 bg-green-600 text-white text-lg rounded hover:bg-green-700" :disabled="!store.canStart">
          Start
        </button>
        <button v-else-if="store.currentState === 'solving'" @click="handleCompleteSolve"
          class="px-4 py-2 bg-red-600 text-white text-lg rounded hover:bg-red-700">
          Stop
        </button>
      </div>
    </div>

    <!-- Right Column: Stats (commented out for now) -->
    <!-- <div class="flex-initial flex flex-col items-center ml-4">...</div> -->
  </div>

  <div v-else class="flex-1 flex items-center justify-center">
    <p class="text-red-500 text-lg">
      {{ store.error || 'Error: No session found' }}
    </p>
  </div>
</template>

<style scoped>
/* Prevent text selection during timing */
.font-mono {
  user-select: none;
}

/* Prevent double-tap zoom on mobile */
button {
  touch-action: manipulation;
}
</style>
