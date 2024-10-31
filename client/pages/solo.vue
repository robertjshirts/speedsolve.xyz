<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { useAuthenticatedWebsocket } from '~/composables/useAuthenticatedWebsocket';
import { CubeType, SessionState } from '~/types/competition';

const config = useRuntimeConfig();
const { loading, authenticated, login } = useAuth();
const { timer, startTimer, stopTimer, resetTimer } = useTimer();
const { createWebSocket } = useAuthenticatedWebsocket();
let session = ref<CompetitionState | null>(null);
let ws: WebSocket;

onMounted(async () => {
  ws = await createWebSocket(`wss://${config.public.apiUrl}/competition/ws`);
  
  ws.onopen = () => {
    ws.send(JSON.stringify({ 
      type: 'SOLO_START', 
      payload: { cubeType: CubeType.THREE_BY_THREE } 
    }));
  };
  
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'SESSION_UPDATE') {
      updateSession(message.payload);
    }
  };
});

function updateSession(payload: CompetitionState) {
  session.value = payload;
}

function startSession() {
  resetTimer();
  ws.send(JSON.stringify({ 
    type: 'SOLO_START', 
    payload: { cubeType: CubeType.THREE_BY_THREE } 
  }));
}

function startSolve() {
  startTimer();
  ws.send(JSON.stringify({ type: 'READY' }));
}

function completeSolve() {
  stopTimer();
  ws.send(JSON.stringify({ 
    type: 'SOLVE_COMPLETE', 
    payload: { time: timer.value } 
  }));
}

function newSession() {
  ws.send(JSON.stringify({ 
    type: 'SOLO_START', 
    payload: { cubeType: CubeType.THREE_BY_THREE } 
  }));
}
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="flex-1 flex items-center justify-center">
    <div class="text-xl text-gray-600 animate-pulse">Loading...</div>
  </div>
  <div v-else-if="!authenticated" class="flex-1 flex items-center justify-center">
    <button @click="login" class="px-4 py-2 bg-blue-600 text-white text-lg rounded hover:bg-blue-700">
      Login
    </button>
  </div>
  <div v-else class="max-h-screen flex flex-col p-4">
    <!-- Main Timer Interface -->
    <template v-if="session">
      <!-- Main Content Layout -->
      <div class="flex flex-row">
        <!-- Left Column: Timer and Controls -->
        <div class="grow flex flex-col items-center">
          <!-- Scramble Display -->
          <div class="w-full bg-gray-100 p-2 mb-4 rounded shadow-sm">
            <p class="text-center text-gray-800 font-mono text-xl">{{ session.scramble }}</p>
          </div>
          
          <!-- Timer Display -->
          <div class="font-mono text-8xl flex-grow flex items-center">
            {{ timer.toFixed(2) }}
          </div>

          <!-- Control Buttons -->
          <div class="space-x-2">
            <button v-if="session.state === SessionState.SCRAMBLING"
                    @click="startSolve"
                    class="px-4 py-2 bg-green-600 text-white text-lg rounded hover:bg-green-700">
              Start
            </button>
            <button v-else-if="session.state === SessionState.SOLVING"
                    @click="completeSolve"
                    class="px-4 py-2 bg-red-600 text-white text-lg rounded hover:bg-red-700">
              Stop
            </button>
            <button v-else
                    @click="newSession"
                    class="px-4 py-2 bg-blue-600 text-white text-lg rounded hover:bg-blue-700">
              Next Solve
            </button>
          </div>
        </div>

        <!-- Right Column: Preview and Solves List -->
        <div class="flex-inital flex flex-col items-center ml-4">
          <!-- Cube Preview Placeholder -->
          <div class="w-full h-40 bg-gray-200 mb-4 rounded flex items-center justify-center">
            <p class="text-gray-500 font-mono text-lg px-5">Cube Preview</p>
          </div>

          <!-- Solves List Placeholder -->
          <div class="w-full bg-gray-100 p-4 rounded shadow-sm">
            <h2 class="text-lg font-semibold text-gray-700 mb-2">Solves</h2>
            <ul>
              <!-- Example Solves -->
              <li v-for="solve in [12.34, 10.56, 9.87]" :key="solve" class="font-mono text-gray-800 text-sm mb-1">
                {{ solve }} s
              </li>
            </ul>
          </div>
        </div>
      </div>
    </template>

    <!-- Error State -->
    <div v-else class="flex-1 flex items-center justify-center">
      <p class="text-red-500 text-lg">Error: No session found</p>
    </div>
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