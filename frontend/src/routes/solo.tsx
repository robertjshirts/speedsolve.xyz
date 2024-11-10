// Authentication and routing imports
import { useAuth0 } from '@auth0/auth0-react'
import { createFileRoute } from '@tanstack/react-router'

// React core imports
import { useState, useEffect, useRef } from 'react'

// Custom hooks for timer and competition management
import { useCubeTimer } from '../hooks/useCubeTimer'
import { useSoloCompetition } from '../hooks/useSoloCompetition'

// Component imports
import { Scramble } from '../components/Scramble'
import { Timer } from '../components/Timer'
import { SoloResult } from '../components/SoloResult'
import { CubePreview3d } from '../components/CubePreview3d'

// Type imports
import type { CompetitionState } from '../api/solo'

// Create the route definition for the solo solving page
export const Route = createFileRoute('/solo')({
  component: SoloComponent,
})

function SoloComponent() {
  // Auth0 authentication hooks
  const { isLoading, isAuthenticated, loginWithRedirect, getAccessTokenSilently } = useAuth0();

  // Timer state management from custom hook
  const { 
    time,           // Current time value (reactive)
    startTimer,     // Function to start the timer
    stopTimer,      // Function to stop the timer
    resetTimer,     // Function to reset the timer
  } = useCubeTimer();

  // Local state management
  const [session, setSession] = useState<CompetitionState | null>(null);        // Current solving session state
  const [currentState, setCurrentState] = useState<SessionState>('scrambling'); // Current solve state (scrambling/solving)
  const [isModalOpen, setIsModalOpen] = useState(false);                        // Controls result modal visibility

  // Competition management hook with session update callback
  const { 
    connectionState,    // Current WebSocket connection state
    error,             // Any error messages
    initialize: apiInitializeConnection,  // Function to initialize WebSocket connection
    startSolve: apiStartSolve,           // API call to start a solve
    completeSolve: apiCompleteSolve,     // API call to complete a solve
    startSession: apiStartSession,        // API call to start a new session
    updatePenalty: apiUpdatePenalty      // API call to update solve penalty
  } = useSoloCompetition((session) => setSession(session));

  // Initialize WebSocket connection when component mounts or auth state changes
  useEffect(() => {
    apiInitializeConnection();
  }, [isAuthenticated, apiInitializeConnection]);

  // Update local state when session state changes
  useEffect(() => {
    if (session) {
      setCurrentState(session.state);
    }
  }, [session]);
  // Event handlers for keydown/keyup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      if (connectionState !== 'connected') return;

      if (currentState === 'scrambling') {
        handleStartSolve();
      } else if (currentState === 'solving') {
        handleCompleteSolve();
      }

    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentState, connectionState]);

  // Handler for starting a new solve
  const handleStartSolve = () => {
    if (connectionState !== 'connected') return;

    resetTimer();
    startTimer();
    apiStartSolve();
  };

  // Handler for completing a solve
  const handleCompleteSolve = () => {
    if (connectionState !== 'connected') return;
    console.log('Solve completed:', time);

    const finalTime = time;
    stopTimer();
    apiCompleteSolve(finalTime);
    setIsModalOpen(true);
  };

  // Handler for starting a new session
  const handleNewSession = () => {
    if (connectionState !== 'connected') return;

    resetTimer();
    apiStartSession();
    setIsModalOpen(false);
  };

  // Handler for updating solve penalties
  const handlePenaltyChange = (penalty: Penalty) => {
    if (connectionState !== 'connected') return;
    apiUpdatePenalty(penalty);
  };

  // Loading state render
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen">
        <div className="text-xl text-skin-base animate-pulse">Loading...</div>
      </div>
    );
  }

  // Unauthenticated state render
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

  // Error state render when no session is available
  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-skin-accent text-lg">
          {error || 'Error: No session found'}
        </p>
      </div>
    );
  }

  // Main component render
  return (
    <div className="flex flex-row">
      <div className="grow flex flex-col items-center">
        {/* Connection status banner */}
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
        
        {/* Error message display */}
        {error && (
          <div className="w-full p-2 bg-skin-accent text-skin-base text-center">
            {error}
          </div>
        )}

        {/* Scramble display */}
        <Scramble scramble={session.scramble} />
        
        {/* 3D cube preview (only shown during scrambling) */}
        {currentState === 'scrambling' && (
          <CubePreview3d scramble={session.scramble} />
        )}

        {/* Timer component */}
        <Timer
          time={time}
        />

        {/* Results modal */}
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
