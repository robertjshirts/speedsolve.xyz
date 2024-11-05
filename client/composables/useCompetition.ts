import { useRuntimeConfig } from '#imports'
import { useCompetitionStore } from './useCompetitionStore'
import { useAuthenticatedWebsocket } from './useAuthenticatedWebsocket'
import { Result } from '#components';

export function useCompetition() {
  const store = useCompetitionStore()
  const config = useRuntimeConfig()
  const { createWebSocket } = useAuthenticatedWebsocket()
  const modal = useModal()
  let ws: WebSocket

  async function initializeSession() {
    store.setConnectionState('connecting')

    try {
      ws = await createWebSocket(`${config.public.wsProtocol}://${config.public.apiUrl}/competition/ws`)

      ws.onopen = () => {
        store.setConnectionState('connected')
        startSession()
      }

      ws.onclose = () => {
        store.setConnectionState('disconnected')
      }

      ws.onerror = () => {
        store.setError('Connection error occurred')
      }

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        handleWebSocketMessage(message)
      }
    } catch (error) {
      store.setError('Failed to connect')
      store.setConnectionState('disconnected')
    }
  }

  function handleWebSocketMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'SESSION_UPDATE':
        store.updateSession(message.payload)
        if (message.payload.state === 'complete') {
          showResultModal()
        }
        break
      case 'ERROR':
        store.setError(message.payload.message)
        break
    }
  }

  function showResultModal() {
    modal.close()
    modal.open(Result, {
      ui: { width: 'w-fit' },
      preventClose: true,
      onClose: () => startSession()
    })
  }

  function startSession() {
    const message: WebSocketMessage = {
      type: 'SOLO_START',
      payload: { cube_type: "3x3" }
    }
    ws.send(JSON.stringify(message))
  }

  function startSolve() {
    const message: WebSocketMessage = {
      type: 'READY'
    }
    ws.send(JSON.stringify(message))
  }

  function completeSolve(time: number) {
    const message: WebSocketMessage = {
      type: 'SOLVE_COMPLETE',
      payload: { time }
    }
    ws.send(JSON.stringify(message))
  }

  function updatePenalty(penalty: Penalty) {
    const message: WebSocketMessage = {
      type: 'PENALTY',
      payload: { penalty }
    }
    ws.send(JSON.stringify(message))
  }

  return {
    initializeSession,
    startSolve,
    completeSolve,
    updatePenalty,
  }
}
