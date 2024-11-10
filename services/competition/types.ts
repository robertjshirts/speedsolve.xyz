declare global {
	type SessionType = "solo" | "multi";
	type SessionState = "queuing" | "scrambling" | "solving" | "complete";
	type CubeType = "3x3" | "2x2";
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
	type Result = {
		id?: string;
		time: number;
		penalty: "DNF" | "plus2" | "none";
	};
	type CompetitionState = {
		id: string;
		type: SessionType;
		state: SessionState;
		cube_type: CubeType;
		participants: Set<string>;
		readyParticipants?: Set<string>;
		scramble: string;
		results: Record<string, Result>;
		start_time: number | null;
	};
}
