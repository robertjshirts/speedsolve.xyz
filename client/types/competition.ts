declare global {
	type SessionType = "solo" | "multi";
	type SessionState = "queuing" | "scrambling" | "solving" | "complete";
	type CubeType = "3x3" | "2x2";
	type ConnectionState = "disconnected" | "connecting" | "connected";
	type WebSocketMessageType =
		| "MULTI_QUEUE"
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
	type CompetitionState = {
		id: string;
		type: SessionType;
		state: SessionState;
		cube_type: CubeType;
		participants: string[];
		scramble: string;
		results: Record<string, Result>;
		start_time: number | null;
	}
}
