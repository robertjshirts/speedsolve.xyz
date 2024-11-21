
export type Profile = {
  id: string
  username: string
  email: string
  pfp: string
  bio: string
  created_at: string
}

export type PeerStatus = "peer_ready" | "peer_unready" | "peer_disconnected";
export type RTCStatus = "connected" | "connecting" | "disconnected" | "closed" | "failed";
export type WSStatus = "connecting" | "connected" | "disconnected";

// types.ts
export type SessionState = "queuing" | "connecting" | "scrambling" | "countdown" | "solving" | "results";

export type CubeType = "3x3" | "2x2";

export interface Result {
  id?: string;
  time: number;
  penalty: "DNF" | "plus2" | "none";
}

// Message Types
export type MultiClientMessageType =
  | "start_q"
  | "cancel_q"
  | "chat_message"
  | "rtc_offer"
  | "rtc_answer"
  | "rtc_candidate"
  | "rtc_connected"
  | "finish_scramble"
  | "start_countdown"
  | "cancel_countdown"
  | "finish_solve"
  | "apply_penalty"
  | "leave_session";

export type MultiServerMessageType =
  | "state_change"
  | "error"
  | "peer_ready"
  | "peer_unready"
  | "peer_disconnected"
  | "countdown_started"
  | "countdown_canceled"
  | "results_update"
  | "rtc_offer"
  | "rtc_answer"
  | "rtc_candidate";

export interface MultiClientMessage {
  type: MultiClientMessageType;
  payload?: Record<string, unknown>; // More type-safe than 'any'
}

export interface MultiServerMessage {
  type: MultiServerMessageType;
  payload?: Record<string, unknown>; // More type-safe than 'any'
}

export type SoloClientMessageType =
  | "start_session"
  | "finish_scramble"
  | "finish_solve"
  | "apply_penalty"
  | "leave_session";

export type SoloServerMessageType =
  | "state_change"
  | "results_update"
  | "error";

export interface SoloServerMessage {
  type: SoloServerMessageType;
  payload?: any; // More type-safe than 'any'
}

export interface SoloClientMessage {
  type: SoloClientMessageType;
  payload?: any; // More type-safe than 'any'
}
