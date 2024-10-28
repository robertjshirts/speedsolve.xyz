export enum SessionType {
	SOLO = "solo",
	MULTI = "multi",
}
export enum SessionState {
	QUEUING = "queuing", // Multi only - waiting for opponent
	SCRAMBLING = "scrambling",
	SOLVING = "solving",
	COMPLETE = "complete",
}
export enum CubeType {
	THREE_BY_THREE = "3x3",
	TWO_BY_TWO = "2x2",
}

declare global {
	type WebSocketMessage = {
		type:
			| "SOLO_START"
			| "MULTI_QUEUE"
			| "READY"
			| "SOLVE_COMPLETE"
			| "REMATCH"
			| "LEAVE";
		payload?: any;
	};
	interface CompetitionState {
		id: string;
		type: SessionType;
		state: SessionState;
		cube_type: CubeType;
		participants: string[];
		scramble: string;
		results: {
			userId: string;
			time: number;
		}[];
		start_time: number | null;
	}
}
