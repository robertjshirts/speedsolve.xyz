import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMultiCompetition } from '../hooks/useMultiCompetition'
import { CompetitionState } from '../api/multi'
import { Scramble } from '../components/Scramble'
import { Timer } from '../components/Timer'
import { CubePreview3d } from '../components/CubePreview3d'
import { useCubeTimer } from '../hooks/useCubeTimer'
import { OpponentCard } from '../components/OpponentCard'
import { useAuth0 } from '@auth0/auth0-react'
import { getProfile } from '../api/profile'
import { MultiResult } from '../components/MultiResult'

export const Route = createFileRoute('/multi')({
  component: RouteComponent,
})

function RouteComponent() {
  const { isLoading, isAuthenticated, loginWithRedirect, user } = useAuth0();
  const [session, setSession] = useState<CompetitionState | null>(null)
  const [opponent, setOpponent] = useState<Profile | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { time, startTimer, stopTimer, resetTimer } = useCubeTimer()
  const { 
    connectionState, 
    error, 
    initialize: apiInitializeConnection, 
    startQueue: apiStartQueue,
    startSolve: apiStartSolve,
    completeSolve: apiCompleteSolve
  } = useMultiCompetition((updatedSession) => setSession(updatedSession))

  useEffect(() => {
    apiInitializeConnection()
  }, [apiInitializeConnection])

  // Effects on session state
  useEffect(() => {
    if (!session) return;
    if (session.state === 'scrambling') {
      const opponent = session.participants.find(p => {
        return p !== user?.username;
      })
      getProfile(opponent!).then(setOpponent)
    }
    if (session.state === 'solving' && Object.keys(session.results).length === 0) {
      startTimer();
    }

  }, [session]);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      if (connectionState !== 'connected') return;
      if (session?.state === 'scrambling' && Object.keys(session.results).length === 0) {
        apiStartSolve();
      }
      if (session?.state === 'solving') {
        const finalTime = time;
        stopTimer();
        setIsModalOpen(true);
        apiCompleteSolve(finalTime);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [session?.state, connectionState])

  // Modal handlers
  const handleNewSession = () => {
    if (Object.keys(session!.results).length === 2) {
      setIsModalOpen(false);
      handleNewSession();
    }
  }

  const renderReadyStatus = () => {
    return (
      <> </>
    )
  }

  const renderOpponentBox = () => {
    if (!opponent) return null;

    return (
      <OpponentCard opponent={opponent} />
    );
  }

  const renderCubePreview = () => {
    if (!session || !session.scramble) return null;
    return (
      <CubePreview3d scramble={session.scramble} />
    );
  }

  const renderContent = () => {
    // Initial state - just show the start queue button
    if (!session) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <button 
            onClick={apiStartQueue}
            disabled={connectionState !== 'connected'}
            className="bg-skin-accent text-skin-base px-6 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Start Queue
          </button>
        </div>
      );
    }

    // Show loading screen only when actively queuing
    if (session.state === 'queuing') {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="w-12 h-12 border-4 border-skin-accent border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl text-skin-base">In queue...</p>
        </div>
      );
    }

    // Show scrambling state UI
    else if (session.state === 'scrambling') {
      return (
        <div className="flex flex-col items-center">
          <Scramble scramble={session.scramble} />
          {renderCubePreview()}
          {renderOpponentBox()}
          <Timer
            time={time}
          />
          <button
            onClick={apiStartSolve}
            disabled={session.readyParticipants?.includes(user?.username!)}
            className="mt-4 bg-green-500 text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Ready to solve
          </button>
        </div>
      );
    }

    // Show solving state UI
    else {
      return (
        <div className="flex flex-col items-center">
          {renderOpponentBox()}
          <Timer
            time={time}
          />
          <MultiResult
            isOpen={isModalOpen}
            onClose={handleNewSession}
            session={session}
            time={time}
            onPenaltyChange={() => {} }
      />
        </div>
      )
    }
  }

  return (
    <div className="flex flex-col items-center p-4">
      <h1 className="text-2xl mb-4">Multi Competition</h1>
      {error && <p className="text-skin-accent mb-4">Error: {error}</p>}
      {renderContent()}
    </div>
  )
}
