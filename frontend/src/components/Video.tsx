import { useRef, useEffect, useState } from "react";

export const Video = ({ stream, muted }: { stream: MediaStream | null, muted: boolean }) => { 
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(muted);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = isMuted;
    }
  }, [stream, isMuted]);

  return (
    <button
      onClick={() => setIsMuted(!isMuted)}
      className={`relative ${isMuted ? 'border-red-500' : 'border-green-500'} border-2 rounded-lg`}
    >
    <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className="w-48 object-contain" 
      />
    </button>
  );
}