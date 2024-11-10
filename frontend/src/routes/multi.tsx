import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMultiCompetition } from '../hooks/useMultiCompetition'
import { CompetitionState } from '../api/multi'

export const Route = createFileRoute('/multi')({
  component: RouteComponent,
})

function RouteComponent() {
  const [session, setSession] = React.useState<CompetitionState | null>(null)
  const { connectionState, error, initialize: apiInitializeConnection, startQueue } = useMultiCompetition((updatedSession) => setSession(updatedSession))

  React.useEffect(() => {
    apiInitializeConnection('wss://api.speedsolve.xyz/competition/ws')
  }, [apiInitializeConnection])

  return (
    <div>
      <h1>Multi Competition</h1>
      <p>Connection State: {connectionState}</p>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      
      <button 
        onClick={startQueue}
        disabled={connectionState !== 'connected'}
      >
        Start Queue
      </button>

      {session && (
        <pre>
          {JSON.stringify(session, null, 2)}
        </pre>
      )}
    </div>
  )
}
