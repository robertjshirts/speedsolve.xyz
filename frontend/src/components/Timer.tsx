// components/Timer.tsx
import { useTimeFormat } from '../hooks/useTimeFormat';

interface TimerProps {
  time: number;
}

export function Timer({ time }: TimerProps) {
  const { formatTime } = useTimeFormat();

  return (
    <div className="flex flex-col items-center">
      <div className="font-mono text-[20em] flex flex-row items-center h-2/3 select-none">
        {formatTime(time)}
      </div>
    </div>
  );
}
