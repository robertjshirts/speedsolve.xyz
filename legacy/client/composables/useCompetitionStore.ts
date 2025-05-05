import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

type ConnectionState = 'disconnected' | 'connecting' | 'connected'

export const useCompetitionStore = defineStore('competition', () => {
  // State
  const session = ref<CompetitionState | null>(null)
  const connectionState = ref<ConnectionState>('disconnected')
  const ws = ref<WebSocket | null>(null)
  const error = ref<string | null>(null)

  // Getters
  const isWebsocketConnected = computed(() => connectionState.value === 'connected')
  const isSessionActive = computed(() => session.value !== null)
  const currentState = computed(() => session.value?.state || null)
  const currentScramble = computed(() => session.value?.scramble || '')
  const canStart = computed(() =>
    connectionState.value === 'connected' &&
    session.value?.state === 'scrambling'
  )
  const solveTime = computed(() => {
    if (!session.value?.results) return null
    const [firstResult] = Object.values(session.value.results)
    return firstResult?.time || null
  })
  const penalty = computed(() => {
    if (!session.value?.results) return 'none'
    const [firstResult] = Object.values(session.value.results)
    return firstResult?.penalty || 'none'
  })

  // Actions
  function setWebSocket(websocket: WebSocket) {
    ws.value = websocket
  }
  
  function updateSession(newSession: CompetitionState) {
    session.value = newSession
  }

  function setConnectionState(state: ConnectionState) {
    connectionState.value = state
  }

  function setError(message: string | null) {
    error.value = message
  }

  function reset() {
    session.value = null
    error.value = null
  }

  // Future multiplayer additions
  const competitors = ref<string[]>([])
  const updateCompetitors = (participants: string[]) => {
    competitors.value = participants
  }

  return {
    // State
    ws,
    session,
    connectionState,
    error,
    competitors,

    // Getters
    isWebsocketConnected,
    isSessionActive,
    currentState,
    currentScramble,
    canStart,
    solveTime,
    penalty,

    // Actions
    setWebSocket,
    updateSession,
    setConnectionState,
    setError,
    reset,
    updateCompetitors,
  }
})
