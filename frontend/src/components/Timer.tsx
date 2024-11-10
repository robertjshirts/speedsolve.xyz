// components/Timer.tsx
import { useTimeFormat } from '../hooks/useTimeFormat';

interface TimerProps {
  time: number;
  onStart: () => void;
  onStop: () => void;
  canStart: boolean;
  currentState: SessionState;
}

export function Timer({ time, onStart, onStop, canStart, currentState}: TimerProps) {
  const { formatTime } = useTimeFormat();

  return (
    <div className="flex flex-col items-center">
      <div className="font-mono text-[20em] flex flex-row items-center h-2/3 select-none">
        {formatTime(time)}
      </div>
      <div className="space-x-2">
        {currentState === 'scrambling' ? (
          <button
            onClick={onStart}
            disabled={!canStart}
            className="px-4 py-2 bg-skin-accent text-skin-base text-lg rounded hover:opacity-90 transition-opacity touch-manipulation disabled:opacity-50"
          >
            Start
          </button>
        ) : (
          <button
            onClick={onStop}
            className="px-4 py-2 bg-skin-accent text-skin-base text-lg rounded hover:opacity-90 transition-opacity touch-manipulation"
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
}
