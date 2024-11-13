declare global {
	type SessionType = "solo" | "multi";
	type SessionState = "queuing" | "scrambling" | "solving" | "complete";
	type CubeType = "3x3" | "2x2";

	// Common message types
	type CommonMessageType = "ERROR" | "SESSION_UPDATE";

	// Solo-specific message types
	type SoloMessageType = CommonMessageType | "SOLO_START" | "READY" | "SOLVE_COMPLETE" | "PENALTY";
	type SoloWebSocketMessage = {
		type: SoloMessageType;
		payload?: any;
	};

	// Multi-specific message types
	type MultiMessageType = CommonMessageType | "QUEUE" | "READY" | "SOLVE_COMPLETE" | "PENALTY" | "LEAVE";
	type MultiWebSocketMessage = {
		type: MultiMessageType;
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
