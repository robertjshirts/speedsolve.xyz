import { useRef, useCallback, useEffect } from 'react';
import { MultiClientMessage, MultiClientMessageType } from '../types';

interface UseWebRTCReturn {
  startConnection: (isOfferer: boolean) => void;
  handleRTCMessage: (type: 'rtc_offer' | 'rtc_answer' | 'rtc_candidate', payload: any) => void;
}

export function useWebRTC(sendMessage: (type: MultiClientMessageType, payload?: Record<string, any>) => void): UseWebRTCReturn {
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);

  const createPeerConnection = useCallback((isOfferer: boolean) => {
    console.log('creating peer connection');
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ]
    });

    const channel = pc.createDataChannel('dataChannel');
    channel.onopen = () => console.log('data channel open');

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendMessage('rtc_candidate', e.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('connection state', pc.connectionState);
      sendMessage('rtc_connected');
    };

    peerConnection.current = pc;
    dataChannel.current = channel;
    return pc;
  }, [sendMessage]);

  const handleRTCMessage = useCallback(async (type: 'rtc_offer' | 'rtc_answer' | 'rtc_candidate', payload: any) => {
    const pc = peerConnection.current || createPeerConnection(false);

    switch (type) {
      case 'rtc_offer':
        // TODO: remove console.log
        console.log('received offer', payload);
        await pc.setRemoteDescription(payload);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendMessage('rtc_answer', answer);
        break;
      case 'rtc_answer':
        // TODO: remove console.log
        console.log('received answer', payload);
        await pc.setRemoteDescription(payload);
        break;
      case 'rtc_candidate':
        // TODO: remove console.log
        console.log('received candidate', payload);
        await pc.addIceCandidate(payload);
        break;
    }
  }, [createPeerConnection])

  const startConnection = useCallback((isOfferer: boolean) => {
    const pc = peerConnection.current || createPeerConnection(isOfferer);

    if (isOfferer) {
      pc.createOffer().then(offer => {
        console.log("created offer", offer);
        pc.setLocalDescription(offer);
        sendMessage('rtc_offer', offer);
      });
    }
  }, [createPeerConnection, sendMessage]);

  return { handleRTCMessage, startConnection };
}