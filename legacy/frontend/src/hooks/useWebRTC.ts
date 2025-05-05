import { useRef, useCallback, useState } from 'react';
import { MultiClientMessageType, RTCStatus } from '../types';
import { useMultiStore } from '../store';

interface QueuedMessage {
  type: 'rtc_offer' | 'rtc_answer' | 'rtc_candidate';
  payload: Record<string, any>;
}

export function useWebRTC(sendMessage: (type: MultiClientMessageType, payload?: Record<string, any>) => void) {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const messageQueueRef = useRef<QueuedMessage[]>([]);
  const { setRtcStatus, setRemoteStream, setLocalStream } = useMultiStore(state => state);
  const localStream = useMultiStore(state => state.localStream);
  const remoteStream = useMultiStore(state => state.remoteStream);

  const processQueuedMessages = async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    while (messageQueueRef.current.length > 0) {
      const message = messageQueueRef.current.shift();
      if (!message) continue;

      switch (message.type) {
        case 'rtc_offer':
          await pc.setRemoteDescription(new RTCSessionDescription(message.payload.offer!));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendMessage('rtc_answer', { answer });
          break;
        case 'rtc_answer':
          await pc.setRemoteDescription(new RTCSessionDescription(message.payload.answer!));
          break;
        case 'rtc_candidate':
          await pc.addIceCandidate(new RTCIceCandidate(message.payload.candidate!));
          break;
      }
    }
  };

  const handleRTCMessage = async (type: 'rtc_offer' | 'rtc_answer' | 'rtc_candidate', payload: Record<string, any>) => {
    if (!payload) return console.error(`No payload in message of type '${type}'`);

    // If peer connection isn't ready, queue the message
    if (!peerConnectionRef.current) {
      messageQueueRef.current.push({ type, payload });
      return;
    }

    const pc = peerConnectionRef.current;
    switch (type) {
      case 'rtc_offer':
        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer!));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendMessage('rtc_answer', { answer });
        console.log("rtc_answer sent");
        break;
      case 'rtc_answer':
        await pc.setRemoteDescription(new RTCSessionDescription(payload.answer!));
        break;
      case 'rtc_candidate':
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate!));
        break;
    }
  };

  const startConnection = useCallback(async (isOfferer: boolean) => {
    const iceServers = await fetch(import.meta.env.VITE_ICE_SERVERS_URL).then(res => res.json());
    const pc = new RTCPeerConnection({ iceServers });

    // Get local media stream
    const stream = await navigator.mediaDevices.getUserMedia({ video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      }, audio: true });
    if (!stream) return console.error('No local stream could be found or created in startConnection');
    setLocalStream(stream);
    // Push tracks to peer connection
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream)
    });

    // Set up event listeners
    pc.ontrack = (e) => {
      const [remoteStream] = e.streams;
      setRemoteStream(remoteStream);
    };

    // Listen for ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendMessage('rtc_candidate', { candidate: e.candidate });
      }
    };

    // Listen for connection state changes
    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case "new":
        case "connecting":
          setRtcStatus("connecting");
          break;
        case "connected":
          setRtcStatus("connected");
          sendMessage('rtc_connected');
          break;
        case "closed":
        case "disconnected":
        case "failed":
          setRtcStatus("disconnected");
          break;
      }
    };

    peerConnectionRef.current = pc;

    // Process any queued messages
    await processQueuedMessages();

    // Create offer and start connection logic
    if (isOfferer) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendMessage('rtc_offer', { offer });
      console.log("rtc_offer sent")
    }
  }, [sendMessage, processQueuedMessages]);

  const endConnection = () => {
    const pc = peerConnectionRef.current;

    localStream?.getTracks().forEach(track => track.stop());
    remoteStream?.getTracks().forEach(track => track.stop());

    setLocalStream(null);
    setRemoteStream(null);
    setRtcStatus('disconnected');

    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
      peerConnectionRef.current = null;
    }

    messageQueueRef.current = [];
  };

  return { handleRTCMessage, startConnection, endConnection };
}
