import { Modal } from './Modal'
import { useTimeFormat } from '../hooks/useTimeFormat'
import type { CompetitionState } from '../api/multi'
import { useAuth0 } from '@auth0/auth0-react'

interface MultiResultProps {
  isOpen: boolean
  onClose: () => void
  session: CompetitionState
  time: number
  onPenaltyChange: (penalty: Penalty) => void
}

export function MultiResult({ isOpen, onClose, session, time, onPenaltyChange }: MultiResultProps) {
  const { formatTime } = useTimeFormat()
  const { user } = useAuth0()

  const getFormattedTime = (time: number, penalty: Penalty) => {
    const baseTime = formatTime(time)
    switch (penalty) {
      case 'plus2':
        return `${formatTime(time + 2000)}+`
      case 'DNF':
        return `DNF(${baseTime})`
      default:
        return baseTime
    }
  }

  const determineWinner = () => {
    if (!session.results || Object.keys(session.results).length < 2) return null

    const results = Object.entries(session.results)
    const [player1, player2] = results

    // If either player has DNF, they lose
    if (player1[1].penalty === 'DNF') return player2[0]
    if (player2[1].penalty === 'DNF') return player1[0]

    // Calculate final times including penalties
    const time1 = player1[1].penalty === 'plus2' ? player1[1].time + 2000 : player1[1].time
    const time2 = player2[1].penalty === 'plus2' ? player2[1].time + 2000 : player2[1].time

    if (time1 < time2) return player1[0]
    if (time2 < time1) return player2[0]
    return 'tie'
  }

  const winner = determineWinner()

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-skin-base text-center mb-4">Race Results</h2>
        
        {/* Results Display */}
        <div className="space-y-4">
          {session.results && Object.entries(session.results).map(([username, result]) => {
            const isSelf = username === user?.username
            const isWinner = winner === username

            return (
              <div 
                key={username}
                className={`p-4 rounded-lg border-2 ${
                  isWinner 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : 'border-skin-accent'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-lg">
                    {isSelf ? 'You' : username}
                    {isWinner && ' 🏆'}
                  </span>
                  <span className="text-2xl font-mono">
                    {getFormattedTime(result.time, result.penalty)}
                  </span>
                </div>
              </div>
            )
          })}

          {winner === 'tie' && (
            <div className="text-center text-lg font-medium text-skin-accent">
              It's a tie!
            </div>
          )}
        </div>

        {/* Penalty Controls (only for self) */}
        {session.results && user?.username && session.results[user.username] && (
          <div className="flex justify-center space-x-4 mt-6">
            <button
              onClick={() => onPenaltyChange('none')}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              OK
            </button>
            <button
              onClick={() => onPenaltyChange('plus2')}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              +2
            </button>
            <button
              onClick={() => onPenaltyChange('DNF')}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              DNF
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}