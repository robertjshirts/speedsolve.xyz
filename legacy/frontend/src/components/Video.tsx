import { useRef, useEffect, useState } from "react";
import { useMultiStore } from "../store";

export const Video = ({ stream, muted, isRemote }: {
  stream: MediaStream | null,
  muted: boolean,
  isRemote?: boolean,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(muted);
  const compState = useMultiStore(state => state.compState);
  const peers = useMultiStore(state => state.peers);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = isMuted;
    }
  }, [stream, isMuted]);

  const username = Object.keys(peers)[0];
  const showStatus = compState === 'scrambling' || compState === 'countdown' || compState === 'solving';

  return (
    <div className="flex flex-col">
      {isRemote ? (
        <div className="bg-skin-accent text-skin-base p-2 rounded-t-lg flex justify-between items-center">
          <span>{username}</span>
          {showStatus && (
            <span className="text-sm">
              {peers[username] === 'ready' ? '✅ Ready' : '⏳ Not Ready'}
            </span>
          )}
        </div>
      ) : (
        <div className="bg-skin-accent text-skin-base p-2 rounded-t-lg flex justify-between items-center">
          <span className="text-center">You</span>
        </div>
      )}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className={`relative ${isMuted ? 'border-red-500' : 'border-green-500'} border-2 rounded-b-lg`}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-48 object-contain"
        />
      </button>
    </div>
  );
};