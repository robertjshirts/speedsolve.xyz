import { useEffect, useState } from 'react';
import { useMultiStore } from '../store';

export const MultiCountdown = ({ 
  startCountdown, 
  cancelCountdown
}: {
  startCountdown: () => void;
  cancelCountdown: () => void;
}) => {
  const countdownStarted = useMultiStore(state => state.countdownStarted);
  const peers = useMultiStore(state => state.peers);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !isReady) {
        setIsReady(true);
        startCountdown();
      }
    }
    window.addEventListener('keydown', handleKeyDown);

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsReady(false);
        cancelCountdown();
      }
    }
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [startCountdown, cancelCountdown]);

  const unreadyPeers: string[] = [];
  console.log("peers: ", peers);
  for (const [username, status] of Object.entries(peers)) {
    if (status !== 'ready') {
      unreadyPeers.push(username);
    }
  } 

  const getMessage = () => {
    if (countdownStarted) {
      return 'Get ready to solve!';
    }
    
    let msg = '';
    if (!isReady) {
      msg += 'Press space to ready up';
    }
    if (unreadyPeers.length > 0) {
      if (msg) msg += ' | ';
      const names = unreadyPeers.join(', ');
      msg += `${names} ${unreadyPeers.length === 1 ? 'is' : 'are'} not ready`;
    }
    return msg || 'Everyone is ready! Waiting on server to start countdown...';
  };

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-4 text-skin-base">{getMessage()}</h1>
    </div>
  );
};