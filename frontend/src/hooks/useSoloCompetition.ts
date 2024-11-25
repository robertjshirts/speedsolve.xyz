import { useEffect, useRef } from 'react'
import { useAuth } from './useAuth'
import { useSoloStore } from '../store'
import { SoloServerMessage, CompetitionState, Result, SoloClientMessage, SoloClientMessageType } from '../types'

export function useSoloCompetition() {
  const soloStore = useSoloStore()
  const compState = useSoloStore(state => state.compState)
  const { isLoading, isAuthenticated, getAccessToken } = useAuth()

  const wsRef = useRef<WebSocket | null>(null)

  const connect = async () => {
    if (!isAuthenticated) throw new Error('User is not authenticated')
    soloStore.reset()
    if (wsRef.current?.readyState === WebSocket.OPEN) return soloStore.setWsStatus('connected')

    const accessToken = await getAccessToken()
    const wsUrl = `${import.meta.env.VITE_WS_PROTOCOL}://${import.meta.env.VITE_API_URL}/competition/ws/solo?token=${accessToken}`
    wsRef.current = new WebSocket(wsUrl)

    wsRef.current.onopen = () => {
      console.log('Connection opened')
      soloStore.setWsStatus('connected')
    }

    wsRef.current.onmessage = (ev) => {
      const message: SoloServerMessage = JSON.parse(ev.data)
      console.log('Received message:', message)
      handleMessage(message)
    }

    wsRef.current.onclose = (ev) => {
      if (ev.reason) console.log('Connection closed:' + ev.reason);
      if (wsRef.current) wsRef.current = null;
      soloStore.setWsStatus('disconnected');
    }

    wsRef.current.onerror = () => {
      console.error('Connection error occurred');
    }
  };

  const disconnect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
      wsRef.current = null;
    }
    soloStore.reset();
  };

  // Handle incoming messages from server
  const handleMessage = (message: SoloServerMessage) => {
    console.log('Handling message:', message);
    switch (message.type) {
      case 'state_change': {
        const state = message.payload!.state as CompetitionState;
        soloStore.setCompState(state);
        if (message.payload!.scramble) soloStore.setScramble(message.payload!.scramble as string);
        if (message.payload!.result) soloStore.setResult(message.payload!.result as Result);
        break;
      }
      case 'results_update': {
        soloStore.setResult(message.payload!.result as Result);
        break;
      }
      case 'error': {
        const error = message.payload!.error as string;
        soloStore.setError(error);
        break;
      }
    }
  };

  // Send message to server
  const sendMesssage = (type: SoloClientMessageType, payload?: Record<string, any>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  };

  // Set timers for frontend components
  useEffect(() => {
    switch (compState) {
      case 'solving':
        soloStore.setStartTime(Date.now());
        break;
      case 'results':
        soloStore.setStartTime(null);
        break;
    }
  }, [compState]);

  // connect to server when component mounts
  useEffect(() => {
    if (!isLoading) connect();
    return () => disconnect();
  }, [isAuthenticated]);

  return {
    isLoading,
    connect,
    disconnect,
    startSession: () => sendMesssage('start_session', { cube_type: '3x3' }),
    finishScramble: () => sendMesssage('finish_scramble'),
    finishSolve: () => {
      const time = Date.now() - soloStore.startTime!;
      sendMesssage('finish_solve', { time });
    },
    applyPenalty: (penalty: string) => sendMesssage('apply_penalty', { penalty }),
    leaveSession: () => sendMesssage('leave_session'),
  };
}