import { useAuth0 } from '@auth0/auth0-react'
import { useCubeTimer } from '../hooks/useCubeTimer'
import { Scramble } from '../components/Scramble'
import { Timer } from '../components/Timer'
import type { CompetitionState } from '../api/solo'
import { useSoloCompetition } from '../hooks/useSoloCompetition'
import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { SoloResult } from '../components/SoloResult'
import { CubePreview3d } from '../components/CubePreview3d'

export const Route = createFileRoute('/solo')({
  component: SoloComponent,
})

function SoloComponent() {
  const { isLoading, isAuthenticated, loginWithRedirect } = useAuth0();
  const { 
    time, 
    startTimer, 
    stopTimer, 
    resetTimer, 
  } = useCubeTimer();
  const [session, setSession] = useState<CompetitionState | null>(null);
  const [currentState, setCurrentState] = useState<SessionState>('scrambling');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { getAccessTokenSilently } = useAuth0();
  
  const { 
    connectionState, 
    error, 
    initialize, 
    startSolve: apiStartSolve, 
    completeSolve: apiCompleteSolve,
    startSession: apiStartSession,
    updatePenalty: apiUpdatePenalty
  } = useSoloCompetition((session) => setSession(session));

  useEffect(() => {
    initialize(`wss://api.speedsolve.xyz/competition/ws`);
  }, [isAuthenticated, initialize]);

  useEffect(() => {
    if (session) {
      setCurrentState(session.state);
    }
  }, [session]);

  const handleStartSolve = () => {
    if (connectionState !== 'connected') return;

    resetTimer();
    startTimer();
    apiStartSolve();
  };

  const handleCompleteSolve = () => {
    if (connectionState !== 'connected') return;

    const finalTime = time;
    stopTimer();
    apiCompleteSolve(finalTime);
    setIsModalOpen(true);
  };

  const handleNewSession = () => {
    if (connectionState !== 'connected') return;

    resetTimer();
    apiStartSession();
    setIsModalOpen(false);
  };

  const handlePenaltyChange = (penalty: Penalty) => {
    if (connectionState !== 'connected') return;
    apiUpdatePenalty(penalty);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen">
        <div className="text-xl text-skin-base animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <button
          onClick={() => loginWithRedirect()}
          className="px-4 py-2 bg-skin-accent text-skin-base text-lg rounded hover:opacity-90 transition-opacity"
        >
          Login
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-skin-accent text-lg">
          {error || 'Error: No session found'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-row">
      <div className="grow flex flex-col items-center">
        {connectionState !== 'connected' && (
          <div
            className={`w-full p-2 text-center text-skin-base ${
              connectionState === 'connecting' 
                ? 'bg-skin-accent bg-opacity-50' 
                : 'bg-skin-accent'
            }`}
          >
            {connectionState === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </div>
        )}
        
        {error && (
          <div className="w-full p-2 bg-skin-accent text-skin-base text-center">
            {error}
          </div>
        )}

        <Scramble scramble={session.scramble} />
        
        {currentState === 'scrambling' && (
          <CubePreview3d scramble={session.scramble} />
        )}

        <Timer
          time={time}
          onStart={handleStartSolve}
          onStop={handleCompleteSolve}
          canStart={connectionState === 'connected' && currentState === 'scrambling'}
          currentState={currentState}
        />

        <SoloResult
          isOpen={isModalOpen}
          onClose={handleNewSession}
          session={session}
          time={time}
          onPenaltyChange={handlePenaltyChange}
        />
      </div>
    </div>
  );
}
