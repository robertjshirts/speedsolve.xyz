import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useMultiStore } from "../store";
import { useWebRTC } from "../hooks/useWebRTC";
import { MultiServerMessage, MultiClientMessageType, CompetitionState, PeerStatus } from "../types";

export function useMulti2() {
  const multiStore = useMultiStore();
  const compState = useMultiStore(state => state.compState);
  const { isLoading, isAuthenticated, getAccessToken } = useAuth();

  const wsRef = useRef<WebSocket | null>(null);
  const isOfferer = useRef<boolean>(false);

  const connect = async () => {
    if (!isAuthenticated) throw new Error('User is not authenticated');
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const accessToken = await getAccessToken();
    const wsUrl = `${import.meta.env.VITE_WS_PROTOCOL}://${import.meta.env.VITE_API_URL}/competition/ws/multi?token=${accessToken}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('Connection opened');
      multiStore.setWsStatus('connected');
    }

    wsRef.current.onmessage = (ev) => {
      const message: MultiServerMessage = JSON.parse(ev.data);
      console.log('Received message:', message);
      handleMessage(message);
    };

    wsRef.current.onclose = (ev) => {
      console.log('Connection closed:' + ev.reason);
      if (wsRef.current) wsRef.current = null;
      multiStore.setWsStatus('disconnected');
    }

    wsRef.current.onerror = () => {
      console.error('Connection error occurred');
    }
  };

  const disconnect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      endConnection();
      wsRef.current.close();
      multiStore.reset();
    }
  };

  const handleMessage = (message: MultiServerMessage) => {
    switch (message.type) {
      case 'state_change': {
        const state = message.payload!.state as CompetitionState;
        multiStore.setCompState(state);
        if (message.payload!.isOfferer) isOfferer.current = message.payload!.isOfferer as boolean;
        if (message.payload!.scramble) multiStore.setScramble(message.payload!.scramble as string);
        // if (message.payload!.results) multiStore.setResults(message.payload!.results as Record<string, Result>);
        break;
      }
      case 'peer_update': {
        const newPeer = message.payload as { username: string, status: PeerStatus };
        multiStore.setPeerStatus(newPeer.username, newPeer.status);
        break;
      };
      case 'countdown_started': {
        multiStore.setCountdownStarted(true);
        break;
      }
      case 'countdown_canceled': {
        multiStore.setCountdownStarted(false);
        break;
      }
      case 'rtc_offer':
      case 'rtc_answer':
      case 'rtc_candidate': {
        handleRTCMessage(message.type, message.payload!);
        break;
      }
      case 'session_ended': {
        multiStore.reset();
        break;
      }
      default: {
        console.error('Unknown message type:', message.type, message.payload);
        break;
      }
    }
  }

  // Send message to server
  const sendMessage = useCallback((type: MultiClientMessageType, payload?: Record<string, any>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, [wsRef])

  const { startConnection, handleRTCMessage, endConnection } = useWebRTC(sendMessage);

  // Side effects of compState changes
  useEffect(() => {
    switch (compState) {
      case 'connecting':
        startConnection(isOfferer.current);
        break;
      case null:
        endConnection();
        break;
    }
  }, [compState])


  // connect on mount and disconnect on unmount
  useEffect(() => {
    if (!isLoading) connect();
    return () => disconnect();
  }, [isLoading]);

  // return actions and other stuff later
  // they can access the store through the useMultiStore hook
  return {
    connect,
    disconnect,
    startQueue: () => sendMessage('start_q', { cube_type: '3x3' }),
    cancelQueue: () => sendMessage('cancel_q'),
    finishScramble: () => sendMessage('finish_scramble'),
    startCountdown: () => sendMessage('start_countdown'),
    cancelCountdown: () => sendMessage('cancel_countdown'),
  };
}
