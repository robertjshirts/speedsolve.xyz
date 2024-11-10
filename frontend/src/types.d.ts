export {}

declare global {
  type Profile = {
    id: string
    username: string
    email: string
    pfp: string
    bio: string
    createdAt: string
    updatedAt: string
  }
  type SessionType = "solo" | "multi";
  type SessionState = "queuing" | "scrambling" | "solving" | "complete";
  type CubeType = "3x3" | "2x2";
  type ConnectionState = "disconnected" | "connecting" | "connected";
  type WebSocketMessageType =
    | "MULTI_QUEUE"
    | "QUEUE_CONFIRM"
    | "SOLO_START"
    | "READY"
    | "SOLVE_COMPLETE"
    | "PENALTY"
    | "REMATCH"
    | "LEAVE"
    | "SESSION_UPDATE"
    | "ERROR";
  type WebSocketMessage = {
    type: WebSocketMessageType;
    payload?: any;
  };
  type Penalty = "DNF" | "plus2" | "none";
  type Result = {
    id?: string;
    time: number;
    penalty: Penalty;
  }
  type Participant = {
    id: string;
    ready: boolean;
    is_self: boolean;
  }
  type CompetitionState = {
    id: string;
    type: SessionType;
    state: SessionState;
    cube_type: CubeType;
    participants: Participant[];
    scramble: string;
    results: Record<string, Result>;
    start_time: number | null;
  }
}
