/* hooks/useSoloCompetition.ts */
import { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { SoloCompetitionApi } from '../api/solo'

export function useSoloCompetition(callback: (session: CompetitionState) => void) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const apiRef = useRef<SoloCompetitionApi | null>(null);
  const { getAccessTokenSilently } = useAuth0();

  const initialize = useCallback(async (wsUrl: string) => {
    if (!apiRef.current) {
      apiRef.current = new SoloCompetitionApi({
        onConnectionStateChange: setConnectionState,
        onError: setError,
        onSessionUpdate: (session) => {
          console.log('Session updated:', session);
          callback(session);
        }
      });
    }

    await apiRef.current.initialize(
      wsUrl,
      getAccessTokenSilently
    );
  }, [getAccessTokenSilently]);

  return {
    connectionState,
    error,
    initialize,
    startSession: () => apiRef.current?.startSession(),
    startSolve: () => apiRef.current?.startSolve(),
    completeSolve: (time: number) => apiRef.current?.completeSolve(time),
    updatePenalty: (penalty: Penalty) => apiRef.current?.updatePenalty(penalty),
    onSessionUpdate: (updatedSession: CompetitionState) => {
      console.log('Session updated:', updatedSession);
    }
  };
}