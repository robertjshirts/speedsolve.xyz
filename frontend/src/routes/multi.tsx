import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMultiNew } from '../hooks/useMultiNew'
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
  const { isAuthenticated, loginWithRedirect } = useAuth0();
  const { state, connectionState, actions } = useMultiNew();

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderMainContent = () => {
    if (connectionState === 'disconnected') {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <button
            onClick={actions.retryConnection}
            className="mt-4 bg-skin-accent text-skin-base px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            Estalish connection to server
          </button>
        </div>
      );
    }
    if (connectionState === 'connecting') {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="w-12 h-12 border-4 border-skin-accent border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl text-skin-base">Connecting to server...</p>
          <button
            onClick={actions.retryConnection}
            className="mt-4 bg-skin-accent text-skin-base px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            Retry Connection to Server
          </button>
        </div>
      );
    }

    // Display error if present
    if (state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <p className="text-xl text-red-500">Error: {state.error}</p>
          <button
            onClick={actions.retryConnection}
            className="mt-4 bg-skin-accent text-skin-base px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            Retry Connection to server
          </button>
        </div>
      );
    }

    // State-specific UI
    switch (state.mainState) {
      case null:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <button 
              onClick={() => actions.startQueue('3x3')}
              className="bg-skin-accent text-skin-base px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              Start Queue
            </button>
          </div>
        );

      case 'queuing':
        return (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <div className="w-12 h-12 border-4 border-skin-accent border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-xl text-skin-base">Finding opponent...</p>
            <button 
              onClick={actions.cancelQueue}
              className="mt-4 bg-red-500 text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              Cancel Queue
            </button>
          </div>
        );

      case 'connecting':
        return (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <div className="w-12 h-12 border-4 border-skin-accent border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-xl text-skin-base">Connecting to opponent...</p>
            <button
              onClick={actions.sendRTCConnected}
              className="mt-4 bg-green-500 text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              Connect RTC
            </button>
          </div>
        );

      case 'scrambling':
        return (
          <div className="flex flex-col items-center">
            {state.scramble && (
              <>
                <Scramble scramble={state.scramble} />
                <CubePreview3d scramble={state.scramble} />
              </>
            )}
            <button
              onClick={actions.finishScramble}
              className="mt-4 bg-green-500 text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              Ready to solve
            </button>
          </div>
        );

      case 'countdown':
        return (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <p className="text-4xl text-skin-base mb-4">Get Ready!</p>
            <button
              onClick={actions.startCountdown}
              className="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              Start Countdown
            </button>
          </div>
        );

      case 'solving':
        return (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <p className="text-4xl text-skin-base mb-4">Solving...</p>
            <button
              onClick={() => actions.finishSolve(10000)}
              className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              Complete Solve (10s)
            </button>
          </div>
        );

      case 'results':
        return (
          <div className="flex flex-col items-center">
            <div className="mb-6">
              <h2 className="text-2xl text-skin-base mb-4">Results</h2>
              {Object.entries(state.results).map(([user, result]) => (
                <div key={user} className="text-lg text-skin-base">
                  {user}: {result.time}ms {result.penalty !== 'none' && `(${result.penalty})`}
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => actions.applyPenalty('plus2')}
                className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
              >
                Apply +2
              </button>
              <button 
                onClick={actions.leaveSession}
                className="bg-red-500 text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
              >
                Leave Session
              </button>
            </div>
          </div>
        );
    }
  };

  // Debug panel for development
  const renderDebugPanel = () => (
    <div className="fixed bottom-4 left-4 bg-gray-800 text-white p-4 rounded-lg opacity-75 hover:opacity-100 transition-opacity">
      <div>Connection: {connectionState}</div>
      <div>State: {state.mainState || 'not started'}</div>
      <div>
        Peers:{' '}
        {Object.entries(state.peers).map(([username, status]) => (
          <div key={username} className="ml-2">
            {username}: {status === 'peer_ready' ? '✅' : status === 'peer_unready' ? '⏳' : status === 'peer_disconnected' ? '❌' : '❔'}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {renderMainContent()}
      {import.meta.env.DEV && renderDebugPanel()}
    </div>
  );
}

{/*
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
*/}
