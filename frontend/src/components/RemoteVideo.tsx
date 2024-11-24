import { useRef, useEffect } from "react";

export const RemoteVideo = ({ stream}: { stream: MediaStream | null }) => { 
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video ref={videoRef} autoPlay playsInline className="w-48 h-36 object-contain" />
  );
}