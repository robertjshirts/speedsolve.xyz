import { useEffect } from 'react';
import { useMultiStore } from '../store';
import { Timer } from './Timer';

export const MultiSolve = ({ finishSolve }: { finishSolve: () => void }) => {
  const startTime = useMultiStore(state => state.startTime);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        finishSolve();
      }
    };
    const timeout = setTimeout(() => {
      window.addEventListener('keydown', handleKeyDown);
    }, 1000); // 1000ms delay to prevent accidental key presses
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('keydown', handleKeyDown)
    };
  }, [finishSolve]);

  return (
    <div className="flex flex-col items-center">
      <Timer startTime={startTime!} />
    </div>
  );
};