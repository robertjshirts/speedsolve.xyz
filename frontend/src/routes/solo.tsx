// Authentication and routing imports
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../hooks/useAuth'
import { useSoloStore } from '../store'
import { useSoloCompetition } from '../hooks/useSoloCompetition'
import { Login } from '../components/Login'
import { SoloConnection } from '../components/SoloConnection'
import { SoloIdle } from '../components/SoloIdle'
import { SoloScramble } from '../components/SoloScramble'
import { SoloSolve } from '../components/SoloSolve'
import { SoloResult } from '../components/SoloResult'

// Create the route definition for the solo solving page
export const Route = createFileRoute('/solo')({
  component: SoloComponent,
})

function SoloComponent() {
  const { isAuthenticated } = useAuth();
  const { wsStatus, compState } = useSoloStore(state => state);
  const {
    connect,
    disconnect,
    startSession,
    finishScramble,
    finishSolve,
    applyPenalty,
    leaveSession,
  } = useSoloCompetition();

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Login />
      </div>
    );
  }

  if (wsStatus !== 'connected') {
    return <SoloConnection connect={connect} disconnect={disconnect} />;
  }

  switch (compState) {
    case null: return <SoloIdle startSession={startSession} />;
    case 'scrambling': return <SoloScramble finishScramble={finishScramble} />;
    case 'solving': return <SoloSolve finishSolve={finishSolve} />;
    case 'results': return <SoloResult applyPenalty={applyPenalty} startSession={startSession} />;
  }
}
