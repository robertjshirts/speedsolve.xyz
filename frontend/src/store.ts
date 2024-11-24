import { create } from 'zustand';
import { User } from '@auth0/auth0-react';
import { CompetitionState } from './types';

type MultiState = {
  wsStatus: 'disconnected' | 'connecting' | 'connected';
  compState: CompetitionState | null;
  rtcStatus: 'connected' | 'connecting' | 'disconnected';
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  error: string | null;
}

type MultiActions = {
  setWsStatus: (status: 'disconnected' | 'connecting' | 'connected') => void;
  setCompState: (state: CompetitionState | null) => void;
  setRtcStatus: (status: 'connected' | 'connecting' | 'disconnected') => void; 
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialMultiState: MultiState = {
  wsStatus: 'disconnected',
  compState: null,
  rtcStatus: 'disconnected',
  localStream: null,
  remoteStream: null,
  error: null,
};

export const useMultiStore = create<MultiState & MultiActions>((set) => ({
  ...initialMultiState,
  setWsStatus: (status) => set({ wsStatus: status }),
  setCompState: (state) => set({ compState: state }),
  setRtcStatus: (status) => set({ rtcStatus: status }),
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setError: (error) => set({ error }),

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
