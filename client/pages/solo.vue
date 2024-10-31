<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { useAuthenticatedWebsocket } from '~/composables/useAuthenticatedWebsocket';
import { CubeType, SessionState } from '~/types/competition';

const { loading, authenticated, login } = useAuth();
let session = ref<CompetitionState | null>(null); 
const scramble = ref<string>('');
const timer = ref<number>(0);
const solving = ref<boolean>(false);
const { createWebSocket } = useAuthenticatedWebsocket();
let ws: WebSocket;

onMounted(async () => {
  // TODO: change this URL
  ws = await createWebSocket('ws://localhost:8000/competition/ws');

  ws.onopen = () => {
    console.log('WebSocket connected');
    // Initiate solo session when WebSocket opens
    ws.send(JSON.stringify({ type: 'SOLO_START', payload: { cubeType: CubeType.THREE_BY_THREE } }));
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    switch (message.type) {
      case 'SESSION_UPDATE':
        updateSession(message.payload);
        break;
      
      default:
        console.warn('Unknown message type:', message.type);
        console.warn('Message:', message);
    }
  };

  ws.onclose = () => {
    console.log('WebSocket closed');
  };
});

function updateSession(payload: CompetitionState) {
  console.log('Updating session:', payload);
  session.value = payload;
  if (payload.scramble) {
    scramble.value = payload.scramble;
  }
}

function startSolve() {
  ws.send(JSON.stringify({ type: 'READY', payload: { } }));
  timer.value = 0;
  // TODO: how to keep track of time and present nicely for user?
}

function completeSolve() {
  ws.send(JSON.stringify({ type: 'SOLVE_COMPLETE', payload: { time: timer.value } }));
  timer.value = 0;
}

function newSession() {
  ws.send(JSON.stringify({ type: 'SOLO_START', payload: { cubeType: CubeType.THREE_BY_THREE } }));
}

</script>

<template>
  <div class="p-6">
    <div v-if="loading" class="text-gray-500 animate-pulse">
      Loading...
    </div>
    <div v-else-if="session">
      <div class="mb-4 text-center">
        <h2 class="text-2xl font-bold">Solo Solving</h2>
        <p v-if="session.scramble" class="text-lg mt-4">Scramble: {{ scramble }}</p>
      </div>

      <div class="flex flex-col items-center space-y-4">
        <button v-if="session.state === SessionState.SCRAMBLING" @click="startSolve"
          class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition duration-150 ease-in-out">
          Start Solve
        </button>
        <button v-if="session.state === SessionState.SOLVING" @click="completeSolve"
          class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition duration-150 ease-in-out">
          Complete Solve
        </button>
        <button v-else @click="newSession">
          New Scramble
        </button>
        <div v-if="session" class="text-xl font-mono">
          Timer: {{ timer }} s
        </div>
      </div>
    </div>
    <div v-else-if="!authenticated">
      <button @click="login"
        class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition duration-150 ease-in-out">
        Login to Start Solving
      </button>
    </div>
    <div v-else>
      <p class="text-red-500">Error: No session found</p>
    </div>
  </div>
</template>

<style scoped>
.timer {
  font-size: 3rem;
  font-weight: bold;
}
</style>
