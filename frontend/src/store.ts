import { create } from 'zustand';
import { User } from '@auth0/auth0-react';
import { CompetitionState, PeerStatus } from './types';


type MultiState = {
  wsStatus: 'disconnected' | 'connecting' | 'connected';
  compState: CompetitionState | null;
  rtcStatus: 'connected' | 'connecting' | 'disconnected';
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  scramble: string | null;
  countdownStarted: boolean;
  startTime: number | null;
  endTime: number | null;
  error: string | null;
  peers: Record<string, PeerStatus>;
}

type MultiActions = {
  setWsStatus: (status: 'disconnected' | 'connecting' | 'connected') => void;
  setCompState: (state: CompetitionState | null) => void;
  setRtcStatus: (status: 'connected' | 'connecting' | 'disconnected') => void; 
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setScramble: (scramble: string) => void;
  setCountdownStarted: (started: boolean) => void;
  setStartTime: () => void;
  setEndTime: () => void;
  setError: (error: string | null) => void;
  setPeerStatus: (peer: string, status: PeerStatus) => void;
  resetPeers: () => void;
  reset: () => void;
}

const initialMultiState: MultiState = {
  wsStatus: 'disconnected',
  compState: null,
  rtcStatus: 'disconnected',
  localStream: null,
  remoteStream: null,
  scramble: '',
  countdownStarted: false,
  startTime: null,
  endTime: null,
  error: null,
  peers: {},
};

export const useMultiStore = create<MultiState & MultiActions>((set) => ({
  ...initialMultiState,
  setWsStatus: (status) => set({ wsStatus: status }),
  setCompState: (state) => set({ compState: state }),
  setRtcStatus: (status) => set({ rtcStatus: status }),
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setScramble: (scramble) => set({ scramble }),
  setCountdownStarted: (started) => set({ countdownStarted: started }),
  setStartTime: () => set({ startTime: Date.now() }),
  setEndTime: () => set({ endTime: Date.now() }),
  setError: (error) => set({ error }),
  setPeerStatus: (peer, status) => set((state) => ({ peers: { ...state.peers, [peer]: status } })),
  resetPeers: () => set({ peers: {} }),
  reset: () => set(initialMultiState),
}));

type UserStore = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | undefined;
  setAuth: (isAuthenticated: boolean, user?: User) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  user: undefined,
  setAuth: (isAuthenticated, user) => set({ isAuthenticated, user }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ isAuthenticated: false, user: undefined }),
}));
