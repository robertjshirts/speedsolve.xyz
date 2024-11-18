import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMultiCompetition } from '../hooks/useMultiCompetition'
import { Scramble } from '../components/Scramble'
import { Timer } from '../components/Timer'
import { CubePreview3d } from '../components/CubePreview3d'
import { useCubeTimer } from '../hooks/useCubeTimer'
import { OpponentCard } from '../components/OpponentCard'
import { useAuth0 } from '@auth0/auth0-react'
import { getProfile } from '../api/profile'
import { MultiResult } from '../components/MultiResult'
import { Login } from '../components/Login'

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
    completeSolve: apiCompleteSolve,
    updatePenalty: apiUpdatePenalty,
    leaveSession: apiLeaveSession
  } = useMultiCompetition((updatedSession) => setSession(updatedSession))

  useEffect(() => {
    apiInitializeConnection()
  }, [apiInitializeConnection])

  // Effects on session state
  useEffect(() => {
    if (!session) return;
    if (session.state === 'webrtc') {
      
    }
    if (session.state === 'scrambling') {
      const opponent = session.participants.find(p => {
        return p !== user?.username;
      })
      getProfile(opponent!).then((opponentProfile) => {
        console.log("opponent:", opponentProfile);
        setOpponent(opponentProfile);
      })
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
        stopTimer();
        const finalTime = time;
        setIsModalOpen(true);
        apiCompleteSolve(finalTime);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [session?.state, connectionState, time])

  // Modal handlers
  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetTimer();
    apiLeaveSession();
    setSession(null);
  }

  const handlePenaltyChange = (penalty: Penalty) => {
    apiUpdatePenalty(penalty);
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
    // Show login screen if not authenticated
    if (!isAuthenticated) {
      return (
        <Login />
      );
    }
    // Show error if there is one
    else if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <p className="text-xl text-skin-base">Error: {error}</p>
        </div>
      );
    }
    // Show start queue button if there is no session
    else if (!session) {
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
            onClose={handleCloseModal}
            session={session}
            time={time}
            onPenaltyChange={handlePenaltyChange}
          />
        </div>
      )
    }
  }

  return (
    <div className="flex flex-col items-center">
      {renderContent()}
    </div>
  )
}
