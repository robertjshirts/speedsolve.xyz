import { useState, useEffect } from 'react';
import { useTimeFormat } from '../hooks/useTimeFormat';
import { useMultiStore } from '../store';

export function Timer() {
  const { formatTime } = useTimeFormat();
  const startTime = useMultiStore(state => state.startTime);
  const endTime = useMultiStore(state => state.endTime);
  const [time, setTime] = useState(startTime!);

  useEffect(() => {
    if (endTime) {
      setTime(endTime - startTime!);
      return;
    }

    const interval = setInterval(() => {
      setTime(Date.now() - startTime!);
    }, 10);

    return () => clearInterval(interval);
  }, [startTime, endTime]);

  return (
    <div className="font-mono text-8xl md:text-[12em] text-skin-base select-none">
      {formatTime(time)}
    </div>
  );
}