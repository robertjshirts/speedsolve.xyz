// components/Timer.tsx
import { useTimeFormat } from '../hooks/useTimeFormat';

interface TimerProps {
  time: number;
}

export function Timer({ time }: TimerProps) {
  const { formatTime } = useTimeFormat();

  return (
    <div className="font-mono text-8xl md:text-[12em] text-skin-base select-none">
      {formatTime(time)}
    </div>
  );
}
