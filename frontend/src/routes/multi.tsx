import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMultiCompetition } from '../hooks/useMultiCompetition'
import { CompetitionState } from '../api/multi'
import { Scramble } from '../components/Scramble'
import { Timer } from '../components/Timer'
import { CubePreview3d } from '../components/CubePreview3d'
import { useCubeTimer } from '../hooks/useCubeTimer'

export const Route = createFileRoute('/multi')({
  component: RouteComponent,
})

function RouteComponent() {
  const [session, setSession] = React.useState<CompetitionState | null>(null)
  const { time, startTimer, stopTimer, resetTimer } = useCubeTimer()
  const { 
    connectionState, 
    error, 
    initialize: apiInitializeConnection, 
    startQueue,
    startSolve 
  } = useMultiCompetition((updatedSession) => setSession(updatedSession))

  React.useEffect(() => {
    apiInitializeConnection()
  }, [apiInitializeConnection])

  React.useEffect(() => {
    if (session && session.state === 'solving') {
      startTimer();
    }
  }, [session]);

  const renderReadyStatus = () => {
    if (!session || !session.participants || session.participants.length < 2) {
      return null;
    }

    const currentUser = session.participants.find(p => p.is_self);
    const otherUser = session.participants.find(p => !p.is_self);

    if (!currentUser || !otherUser) return null;

    if (currentUser.ready && otherUser.ready) {
      return <p className="text-green-500">Both participants are ready!</p>;
    } else if (currentUser.ready) {
      return <p className="text-yellow-500">Waiting for other participant...</p>;
    } else if (otherUser.ready) {
      return <p className="text-yellow-500">Other participant is waiting for you...</p>;
    }

    return null;
  }

  const renderOpponentBox = () => {
    if (!session?.participants) return null;
    const opponent = session.participants.find(p => !p.is_self);
    if (!opponent) return null;

    return (
      <div className="w-64 h-64 bg-skin-fill rounded-lg p-4 shadow-lg">
        <h3 className="text-lg font-semibold mb-2">Opponent</h3>
        <div className="text-center">
          <p className="text-xl">Opponent #{opponent.id}</p>
          {opponent.ready && <p className="text-green-500">Ready</p>}
        </div>
      </div>
    );
  }

  const renderContent = () => {
    // Initial state - just show the start queue button
    if (!session) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <button 
            onClick={startQueue}
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
    if (session.state === 'scrambling' || session.state === 'solving') {
      return (
        <div className="flex flex-col items-center">
          <Scramble scramble={session.scramble} />
          <div className="flex gap-8 my-8">
            <CubePreview3d scramble={session.scramble} />
            {renderOpponentBox()}
          </div>
          <Timer
            time={0}
            onStart={() => {} }
            onStop={() => {} }
            canStart={false}
            currentState={session.state}
          />
          <button
            onClick={startSolve}
            disabled={session.participants.find(p => p.is_self)?.ready}
            className="mt-4 bg-green-500 text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Ready
          </button>
          {renderReadyStatus()}
        </div>
      );
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
