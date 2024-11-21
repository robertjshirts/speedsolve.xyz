import { useRef, useCallback, useState } from 'react';
import { MultiClientMessageType, RTCStatus } from '../types';

interface UseWebRTCReturn {
  startConnection: (isOfferer: boolean) => void;
  handleRTCMessage: (type: 'rtc_offer' | 'rtc_answer' | 'rtc_candidate', payload: any) => void;
  rtcStatus: RTCStatus;
}


export function useWebRTC(sendMessage: (type: MultiClientMessageType, payload?: Record<string, any>) => void): UseWebRTCReturn {
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const [rtcStatus, setRtcStatus] = useState<RTCStatus>('disconnected');

  const createPeerConnection = useCallback(() => {
    // Create a new RTCPeerConnection
    const turnUsername = import.meta.env.VITE_TURN_USERNAME!;
    const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL!;
    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        }
        // {
        //   urls: "stun:stun.relay.metered.ca:80",
        // },
        // {
        //   urls: "turn:global.relay.metered.ca:80",
        //   username: turnUsername,
        //   credential: turnCredential,
        // },
        // {
        //   urls: "turn:global.relay.metered.ca:80?transport=tcp",
        //   username: turnUsername,
        //   credential: turnCredential,
        // },
        // {
        //   urls: "turn:global.relay.metered.ca:443",
        //   username: turnUsername,
        //   credential: turnCredential,
        // },
        // {
        //   urls: "turns:global.relay.metered.ca:443?transport=tcp",
        //   username: turnUsername,
        //   credential: turnCredential,
        // },
      ], 
    });

    // Handle RTC events
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendMessage('rtc_candidate', e.candidate);
      }
    };

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
        case "disconnected":
          setRtcStatus("disconnected");
          break;
        case "closed":
          setRtcStatus("closed");
          break;
        case "failed":
          setRtcStatus("failed");
          break;
      }
      sendMessage('rtc_connected');
    };

    peerConnection.current = pc;
    return pc;
  }, [sendMessage]);

  const handleRTCMessage = useCallback(async (type: 'rtc_offer' | 'rtc_answer' | 'rtc_candidate', payload: any) => {
    const pc = peerConnection.current || createPeerConnection();

    // TODO: remove console.log
    switch (type) {
      case 'rtc_offer':
        console.log('received offer', payload);
        await pc.setRemoteDescription(payload);
        console.log('creating answer');
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendMessage('rtc_answer', answer);
        break;
      case 'rtc_answer':
        console.log('received answer', payload);
        await pc.setRemoteDescription(payload);
        break;
      case 'rtc_candidate':
        console.log('received candidate', payload);
        await pc.addIceCandidate(payload);
        break;
    }
  }, [createPeerConnection])

  const startConnection = useCallback((isOfferer: boolean) => {
    const pc = peerConnection.current || createPeerConnection();

    if (isOfferer) {
      pc.createOffer().then(offer => {
        console.log("created offer", offer);
        pc.setLocalDescription(offer);
        sendMessage('rtc_offer', offer);
      });
    }
  }, [createPeerConnection, sendMessage]);

  return { handleRTCMessage, startConnection, rtcStatus };
}