import { useRef, useCallback, useState } from 'react';
import { MultiClientMessageType, RTCStatus } from '../types';
import { useMultiStore } from '../store';

interface UseWebRTCReturn {
  startConnection: (isOfferer: boolean) => void;
  handleRTCMessage: (type: 'rtc_offer' | 'rtc_answer' | 'rtc_candidate', payload: any) => void;
}

interface QueuedMessage {
  type: 'rtc_offer' | 'rtc_answer' | 'rtc_candidate';
  payload: Record<string, any>;
}

export function useWebRTC(sendMessage: (type: MultiClientMessageType, payload?: Record<string, any>) => void): UseWebRTCReturn {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const messageQueueRef = useRef<QueuedMessage[]>([]);
  const { setRtcStatus, setRemoteStream, setLocalStream } = useMultiStore(state => state);

  const processQueuedMessages = useCallback(async () => {
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
          console.log("rtc_answer sent (from queue)");
          break;
        case 'rtc_answer':
          await pc.setRemoteDescription(new RTCSessionDescription(message.payload.answer!));
          break;
        case 'rtc_candidate':
          await pc.addIceCandidate(new RTCIceCandidate(message.payload.candidate!));
          break;
      }
    }
  }, [sendMessage]);

  const handleRTCMessage = useCallback(async (type: 'rtc_offer' | 'rtc_answer' | 'rtc_candidate', payload: Record<string, any>) => {
    if (!payload) return console.error(`No payload in message of type '${type}'`);

    // If peer connection isn't ready, queue the message
    if (!peerConnectionRef.current) {
      console.log(`Queueing ${type} message as peer connection isn't ready`);
      messageQueueRef.current.push({ type, payload });
      return;
    }

    const pc = peerConnectionRef.current;
    switch (type) {
      case 'rtc_offer':
        console.log('rtc_offer received');
        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer!));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendMessage('rtc_answer', { answer });
        console.log("rtc_answer sent");
        break;
      case 'rtc_answer':
        console.log('rtc_answer received');
        await pc.setRemoteDescription(new RTCSessionDescription(payload.answer!));
        break;
      case 'rtc_candidate':
        console.log('rtc_candidate received');
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate!));
        break;
    }
  }, [peerConnectionRef, sendMessage]);

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
    console.log("got local stream");
    setLocalStream(stream);
    // Push tracks to peer connection
    stream.getTracks().forEach(track => {
      console.log("adding track to peer connection", track);
      pc.addTrack(track, stream)
    });

    // Set up event listeners
    pc.ontrack = (e) => {
      console.log("track received", e.streams);
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
      console.log("connection state changed", pc.connectionState);
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
          console.log("rtc connection state: ", pc.connectionState);
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

  return { handleRTCMessage, startConnection };
}
