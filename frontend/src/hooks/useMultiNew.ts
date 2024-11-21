import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useWebRTC } from './useWebRTC';
import { PeerStatus, CubeType, Result, SessionState, MultiServerMessage, MultiClientMessageType } from '../types';

// Maybe make a peer info object with profile later

interface CompetitionState {
  mainState: SessionState | null;
  scramble?: string;
  results: Record<string, Result>;
  peers: Record<string, PeerStatus>;
  error?: string;
}

interface UseMultiCompetitionReturn {
  state: CompetitionState;
  connectionState: 'disconnected' | 'connecting' | 'connected';
  actions: {
    retryConnection: () => void;
    startQueue: (cubeType: CubeType) => void;
    cancelQueue: () => void;
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
  const [username, setUsername] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { getAccessTokenSilently, user } = useAuth0();

  useEffect(() => {
    if (user?.username) {
      setUsername(user.username!);
      // Delete the username from the peers object if it exists
      setState(prev => ({
        ...prev,
        peers: Object.fromEntries(
          Object.entries(prev.peers).filter(([peer]) => peer !== user.username)
        )
      }));
    }
  }, [user, state.mainState])

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

  const sendMessage = useCallback((type: MultiClientMessageType, payload?: Record<string, any>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return;
    }
    wsRef.current.send(JSON.stringify({ type, payload }));
  }, []);

  const { startConnection, handleRTCMessage } = useWebRTC(sendMessage);

  const handleServerMessage = useCallback((message: MultiServerMessage) => {
    switch (message.type) {
      case 'state_change': {
        const payload = message.payload as { state: SessionState; scramble?: string; results?: Record<string, Result>; peers?: string[]; isOfferer?: boolean };
        if (!payload) return console.error("No payload in message of type 'state_change'");
        // make new peers object
        const newPeers: Record<string, PeerStatus> = {};
        payload.peers?.forEach(peer => {
          if (peer === username) {
            return;
          }
          newPeers[peer] = 'peer_unready';
        });
        setState(prev => ({
          ...prev,
          // On state_change, mainState is always updated
          mainState: payload.state,
          scramble: payload.scramble || prev.scramble,
          results: payload.results || prev.results,
          // Peers are also reset on state_change
          peers: newPeers
        }));
        if (payload.state === 'connecting') {
          startConnection(payload.isOfferer || false);
        }
        break;
      }

      case 'peer_ready': {
        const peer = message.payload?.peer as string;
        if (!peer) return console.error("No peer in payload on event 'peer_ready'");

        setState(prev => ({
          ...prev,
          peers: {
            ...prev.peers,
            [peer]: 'peer_ready'
          }
        }));
        break;
      }

      case 'peer_unready': {
        const peer = message.payload?.peer as string;
        if (!peer) return console.error("No peer in payload on event 'peer_unready'");

        setState(prev => ({
          ...prev,
          peers: {
            ...prev.peers,
            [peer]: 'peer_unready'
          }
        }));
        break;
      }

      case 'peer_disconnected': {
        const peer = message.payload?.peer as string;
        if (!peer) return console.error("No peer in payload on event 'peer_disconnected'");

        setState(prev => {
          if (prev.mainState !== 'results') {
            return {
              ...prev,
              error: `Peer ${peer} disconnected outside of results phase`
            }
          }
          return {
            ...prev,
            peers: {
              ...prev.peers,
              [peer]: 'peer_disconnected'
            }
          }
        });
        break;
      }

      case 'results_update': {
        const results = message.payload?.results as Record<string, Result>;
        if (!results) return console.error("No results in payload on event 'results_update'");

        setState(prev => ({
          ...prev,
          results
        }));
        break;
      }

      case 'rtc_offer':
      case 'rtc_answer':
      case 'rtc_candidate': {
        handleRTCMessage(message.type, message.payload);
        break;
      }

      case 'error': {
        const errorMessage = message.payload?.message as string;
        if (!errorMessage) return console.error("No error message in payload on event 'error'");

        setState(prev => ({
          ...prev,
          error: `Websocket error: ${errorMessage}`
        }));
        break;
      }
    }
  }, []);

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
  }, [getAccessTokenSilently, cleanup]);

  useEffect(() => {
    initialize();
    return cleanup;
  }, [initialize, cleanup]);

  const actions = {
    retryConnection: initialize,
    startQueue: (cubeType: CubeType) => sendMessage('start_q', { cube_type: cubeType }),
    cancelQueue: () => sendMessage('cancel_q'),
    finishScramble: () => sendMessage('finish_scramble'),
    startCountdown: () => sendMessage('start_countdown'),
    cancelCountdown: () => sendMessage('cancel_countdown'),
    finishSolve: (time: number) => sendMessage('finish_solve', { time }),
    applyPenalty: (penalty: "none" | "DNF" | "plus2") => sendMessage('apply_penalty', { penalty }),
    leaveSession: () => {
      sendMessage('leave_session');
      setState({
        mainState: null,
        results: {},
        peers: {}
      });
    }
  };

  return { state, connectionState, actions };
}
