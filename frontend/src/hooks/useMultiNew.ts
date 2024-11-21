import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { CubeType, Result, SessionState, MultiServerMessage, MultiClientMessageType } from '../types';

interface PeerInfo {
  username: string;
  isReady: boolean;
  // We can extend this later with profile info, etc.
}

interface CompetitionState {
  mainState: SessionState | null;
  scramble?: string;
  results: Record<string, Result>;
  peers: Record<string, PeerInfo>;
  error?: string;
}

interface UseMultiCompetitionReturn {
  state: CompetitionState;
  connectionState: 'disconnected' | 'connecting' | 'connected';
  actions: {
    startQueue: (cubeType: CubeType) => void;
    cancelQueue: () => void;
    sendRTCSignal: (type: 'offer' | 'answer' | 'candidate', payload: any) => void;
    finishScramble: () => void;
    startCountdown: () => void;
    cancelCountdown: () => void;
    finishSolve: (time: number) => void;
    applyPenalty: (penalty: "none" | "DNF" | "plus2") => void;
    leaveSession: () => void;
  };
}

export function useMultiNew(): UseMultiCompetitionReturn {
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [state, setState] = useState<CompetitionState>({
    mainState: null,
    results: {},
    peers: {}
  });
  const wsRef = useRef<WebSocket | null>(null);
  const { getAccessTokenSilently } = useAuth0();

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionState('disconnected');
    setState({
      mainState: null,
      results: {},
      peers: {}
    });
  }, []);

  const sendMessage = useCallback((type: MultiClientMessageType, payload?: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return;
    }
    wsRef.current.send(JSON.stringify({ type, payload }));
  }, []);

  const handleServerMessage = useCallback((message: MultiServerMessage) => {
    if (!message.payload) return;

    switch (message.type) {
      case 'state_change': {
        const payload = message.payload as { state: SessionState; scramble?: string; results?: Record<string, Result>; peers?: Record<string, PeerInfo> };
        if (payload.state === 'queuing') {
          cleanup();
          return;
        }

        setState(prev => ({
          ...prev,
          mainState: payload.state,
          scramble: payload.scramble,
          results: payload.results || prev.results,
          peers: payload.peers || prev.peers
        }));
        break;
      }

      case 'peer_ready': {
        const peer = message.payload.peer as string;
        if (!peer) return;

        setState(prev => ({
          ...prev,
          peers: {
            ...prev.peers,
            [peer]: {
              ...(prev.peers[peer] || { username: peer }),
              isReady: true
            }
          }
        }));
        break;
      }

      case 'peer_unready': {
        const peer = message.payload.peer as string;
        if (!peer) return;

        setState(prev => ({
          ...prev,
          peers: {
            ...prev.peers,
            [peer]: {
              ...(prev.peers[peer] || { username: peer }),
              isReady: false
            }
          }
        }));
        break;
      }

      case 'peer_disconnected': {
        const peer = message.payload.peer as string;
        if (!peer) return;

        setState(prev => {
          const newPeers = { ...prev.peers };
          delete newPeers[peer];
          return {
            ...prev,
            error: `Peer ${peer} disconnected`,
            peers: newPeers
          };
        });
        break;
      }

      case 'results_update': {
        const results = message.payload.results as Record<string, Result>;
        if (!results) return;

        setState(prev => ({
          ...prev,
          results
        }));
        break;
      }

      case 'error': {
        const errorMessage = message.payload.message as string;
        if (!errorMessage) return;

        setState(prev => ({
          ...prev,
          error: errorMessage
        }));
        break;
      }
    }
  }, [cleanup]);

  const initialize = useCallback(async () => {
    cleanup();

    try {
      const token = await getAccessTokenSilently();
      const wsProtocol = import.meta.env.VITE_WS_PROTOCOL || 'wss';
      const apiUrl = import.meta.env.VITE_API_URL;
      
      if (!apiUrl) {
        throw new Error('API URL not configured');
      }

      const wsUrl = `${wsProtocol}://${apiUrl}/competition/ws/multi?token=${token}`;
      
      wsRef.current = new WebSocket(wsUrl);
      setConnectionState('connecting');

      wsRef.current.onopen = () => {
        setConnectionState('connected');
        setState(prev => ({ ...prev, error: undefined }));
      };

      wsRef.current.onclose = () => {
        cleanup();
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ ...prev, error: 'WebSocket connection error' }));
        cleanup();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as MultiServerMessage;
          handleServerMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          setState(prev => ({ ...prev, error: 'Failed to parse server message' }));
        }
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      setState(prev => ({ ...prev, error: 'Failed to initialize WebSocket connection' }));
      cleanup();
    }
  }, [getAccessTokenSilently, handleServerMessage, cleanup]);

  useEffect(() => {
    initialize();
    return cleanup;
  }, [initialize, cleanup]);

  const actions = {
    startQueue: (cubeType: CubeType) => sendMessage('start_q', { cube_type: cubeType }),
    cancelQueue: () => sendMessage('cancel_q'),
    sendRTCSignal: (type: 'offer' | 'answer' | 'candidate', payload: any) => 
      sendMessage(`rtc_${type}` as MultiClientMessageType, payload),
    finishScramble: () => sendMessage('finish_scramble'),
    startCountdown: () => sendMessage('start_countdown'),
    cancelCountdown: () => sendMessage('cancel_countdown'),
    finishSolve: (time: number) => sendMessage('finish_solve', { time }),
    applyPenalty: (penalty: "none" | "DNF" | "plus2") => sendMessage('apply_penalty', { penalty }),
    leaveSession: () => {
      sendMessage('leave_session');
      cleanup();
    }
  };

  return { state, connectionState, actions };
}
