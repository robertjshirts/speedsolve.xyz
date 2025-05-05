import { useRuntimeConfig } from '#imports'
import { useCompetitionStore } from './useCompetitionStore'
import { useAuthenticatedWebsocket } from './useAuthenticatedWebsocket'
import { Result } from '#components'

export function useCompetition() {
  const store = useCompetitionStore()
  const config = useRuntimeConfig()
  const { createWebSocket } = useAuthenticatedWebsocket()
  const modal = useModal()

  async function initializeSession() {
    store.setConnectionState('connecting')
    try {
      const websocket = await createWebSocket(`${config.public.wsProtocol}://${config.public.apiUrl}/competition/ws`)
      
      websocket.onopen = () => {
        console.log('useCompetition.ts: Connection opened')
        store.setConnectionState('connected')
        startSession()
      }
      
      websocket.onclose = () => {
        console.log('useCompetition.ts: Connection closed')
        store.setConnectionState('disconnected')
      }
      
      websocket.onerror = () => {
        store.setError('Connection error occurred')
      }
      
      websocket.onmessage = (event) => {
        const message = JSON.parse(event.data)
        console.log('useCompetition.ts: Received message', message)
        handleWebSocketMessage(message)
      }

      store.setWebSocket(websocket)
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
    store.ws?.send(JSON.stringify(message))
  }

  function startSolve() {
    const message: WebSocketMessage = {
      type: 'READY'
    }
    store.ws?.send(JSON.stringify(message))
  }

  function completeSolve(time: number) {
    const message: WebSocketMessage = {
      type: 'SOLVE_COMPLETE',
      payload: { time }
    }
    store.ws?.send(JSON.stringify(message))
  }

  function updatePenalty(penalty: Penalty) {
    console.log('useCompetition.ts: Updating penalty', penalty)
    const message: WebSocketMessage = {
      type: 'PENALTY',
      payload: { penalty }
    }
    store.ws!.send(JSON.stringify(message))
  }

  return {
    initializeSession,
    startSolve,
    completeSolve,
    updatePenalty,
  }
}