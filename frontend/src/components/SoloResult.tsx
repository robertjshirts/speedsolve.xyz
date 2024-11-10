import { Modal } from './Modal'
import { useTimeFormat } from '../hooks/useTimeFormat'
import type { CompetitionState } from '../api/solo'

interface SoloResultProps {
  isOpen: boolean
  onClose: () => void
  session: CompetitionState
  time: number
  onPenaltyChange: (penalty: Penalty) => void
}

export function SoloResult({ isOpen, onClose, session, time, onPenaltyChange }: SoloResultProps) {
  const { formatTime } = useTimeFormat()

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

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-skin-base text-center mb-4">Solve Results</h2>
        {session.results && Object.keys(session.results).length > 0 && (
          <div className="space-y-2">
            {Object.entries(session.results).map(([id, result]) => (
              <div key={id} className="flex justify-center items-center p-2 bg-skin-base bg-opacity-10 rounded">
                <span className="text-4xl font-mono">{getFormattedTime(time, result.penalty)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-center space-x-4">
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
      </div>
    </Modal>
  )
}
