import { useEffect } from 'react';
import { Timer } from './Timer';

export const MultiSolve = ({ finishSolve }: { finishSolve: () => void }) => {
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
      <Timer />
    </div>
  );
};