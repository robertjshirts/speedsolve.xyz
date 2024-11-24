import { useEffect } from "react";
import { useMultiStore } from "../store";

export const MultiCountdown = ({ startCountdown, cancelCountdown}: {
  startCountdown: () => void;
  cancelCountdown: () => void;
}) => {
  const countdownStarted = useMultiStore(state => state.countdownStarted);
  const peers = useMultiStore(state => state.peers);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        startCountdown();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { 
      if (e.code === 'Space') {
        cancelCountdown();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    }

  }, [startCountdown, cancelCountdown]);

  const unreadyPeers = Object.values(peers).filter(status => status === 'unready');

  const getMessage = () => {
    if (countdownStarted) {
      return 'Get ready to solve!';
    }
    // If no unready peers, and not started, we are waiting on user
    if (unreadyPeers.length === 0) {
      return 'Hold space when ready';
    }

    // If there are unready peers, we are waiting on them
    const names = unreadyPeers.join(', ');
    return `${names} ${unreadyPeers.length === 1 ? 'is' : 'are'} unready`;
  };

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-4 text-skin-base">{getMessage()}</h1>
    </div>
  );
};

