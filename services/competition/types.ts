/// <reference lib="dom" />

//#region Session types
export type SessionState = "queuing" | "connecting" | "scrambling" | "countdown" | "solving" | "results";
export type CubeType = "3x3" | "2x2";

export type Result = {
	id?: string;
	time: number;
	penalty: "DNF" | "plus2" | "none";
};

export interface SoloSession {
	id: string;
	state: SessionState;
	cube_type: CubeType;
	participant: string;
	scramble: string;
	start_time: number | null;
	result: Result | null;
}

export interface MultiSession {
	id: string;
	cube_type: CubeType;
	participants: Set<string>;
	readyParticipants: Set<string>;
	state: SessionState;
	scramble: string;
	results: Record<string, Result>;
	start_time: number | null;
	timeoutId: number | null;
}
//#endregion

//#region Multi Message types
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

export type PeerStatus = "ready" | "unready" | "disconnected";

type MultiServerMessageType = 
	| "state_change" 
	| "error" 
	| "peer_update"
	| "countdown_started" 
	| "countdown_canceled" 
	| "results_update"
	| "session_ended";

export interface MultiClientMessage {
	type: MultiClientMessageType;
	// deno-lint-ignore no-explicit-any
	payload?: Record<string, any>;
}

export interface MultiServerMessage {
	type: MultiServerMessageType;
	// deno-lint-ignore no-explicit-any
	payload?: Record<string, any>;
}
//#endregion

//#region Solo Message types
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
    // deno-lint-ignore no-explicit-any
    payload?: any;
}

export interface SoloClientMessage {
    type: SoloClientMessageType;
    // deno-lint-ignore no-explicit-any
    payload?: any;
}
//#endregion
