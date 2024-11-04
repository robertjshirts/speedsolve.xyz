<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { useAuthenticatedWebsocket } from '~/composables/useAuthenticatedWebsocket';
import { Result } from '#components'

const config = useRuntimeConfig();
const { loading, authenticated, login } = useAuth();
const { timer, startTimer, stopTimer, resetTimer } = useCubeTimer();
const { formatTime } = useTimeFormat();
const { createWebSocket } = useAuthenticatedWebsocket();
const modal = useModal();
const session = ref<CompetitionState | null>(null);
let ws: WebSocket;

onMounted(async () => {
  ws = await createWebSocket(`ws://${config.public.apiUrl}/competition/ws`);

  ws.onopen = () => {
    startSession();
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'SESSION_UPDATE') {
      updateSession(message.payload);
    }
  };
});

function updateSession(payload: CompetitionState) {
  console.log(payload);
  session.value = payload;
  if (payload.state === 'complete') {
    // In case it is a penalty update, close the modal first
    modal.close();
    modal.open(Result, {
      session: payload,
      ui: { width: 'w-fit' },
      preventClose: true,
      "onUpdatePenalty": (param: Penalty) => {
        console.log(param);
        updatePenalty(param);
      },
      "onClose": () => {
        startSession();
      }
    });
  }
}

function startSession() {
  resetTimer();
  const message: WebSocketMessage = {
    type: 'SOLO_START',
    payload: { cube_type: "3x3" }
  }
  ws.send(JSON.stringify(message));
}

function startSolve() {
  startTimer();
  const message: WebSocketMessage = {
    type: 'READY',
  }
  ws.send(JSON.stringify(message));
}

function completeSolve() {
  stopTimer();
  const message: WebSocketMessage = {
    type: 'SOLVE_COMPLETE',
    payload: { time: timer.value }
  }
  ws.send(JSON.stringify(message));
}

function updatePenalty(penalty: Penalty) {

  const message: WebSocketMessage = {
    type: 'PENALTY',
    payload: { penalty }
  }
  ws.send(JSON.stringify(message));
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
  <div v-if="session" class="flex flex-row">
    <!-- Left Column: Timer and Controls -->
    <div class="grow flex flex-col items-center">
      <!-- Scramble Display -->
      <div class="w-full p-2 rounded shadow-sm bg-gray-800">
        <p class="text-center text-gray-800 dark:text-white font-mono text-4xl">{{ session.scramble }}</p>
      </div>

      <!-- Timer Display -->
      <div class="font-mono text-[20em] flex flex-row items-center h-2/3">
        {{ formatTime(timer) }}
      </div>

      <!-- Control Buttons -->
      <div class="space-x-2">
        <button v-if="session.state === 'scrambling'" @click="startSolve"
          class="px-4 py-2 bg-green-600 text-white text-lg rounded hover:bg-green-700">
          Start
        </button>
        <button v-else-if="session.state === 'solving'" @click="completeSolve"
          class="px-4 py-2 bg-red-600 text-white text-lg rounded hover:bg-red-700">
          Stop
        </button>
      </div>
    </div>

    <!-- Right Column: Preview and Solves List 
    <div class="flex-inital flex flex-col items-center ml-4">
      <div class="w-full h-40 bg-gray-200 mb-4 rounded flex items-center justify-center">
        <p class="text-gray-500 font-mono text-lg px-5">Cube Preview</p>
      </div>

      <div class="w-full bg-gray-100 p-4 rounded shadow-sm">
        <h2 class="text-lg font-semibold text-gray-700 mb-2">Solves</h2>
        <ul>
          <li v-for="solve in [12.34, 10.56, 9.87]" :key="solve" class="font-mono text-gray-800 text-sm mb-1">
            {{ solve }} s
          </li>
        </ul>
      </div>
    </div -->
  </div>

  <div v-else class="flex-1 flex items-center justify-center">
    <p class="text-red-500 text-lg">Error: No session found</p>
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
