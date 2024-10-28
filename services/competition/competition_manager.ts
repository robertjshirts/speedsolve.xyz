import { generateScramble } from "./scrambler.ts";
import { CubeType, SessionState, SessionType } from "./types.ts";
export class CompetitionStateManager {
	// Session keys are usernames, because users can only be in one session at a time
	// and it allows for easier parsing via jwt instead of session id
	private activeSessions: Map<string, CompetitionState> = new Map();
	private connections: Map<string, WebSocket> = new Map();
	// Queues for multiplayer, when implemented
	// private userQueues: Map<string, string[]> = new Map(); // cubeType -> usernames[]

	addConnection(username: string, ws: WebSocket) {
		this.connections.set(username, ws);
		this.activeSessions.delete(username);
		// TODO: remove user from any queues
	}

	handleDisconnect(username: string) {
		// TODO: handle multiplayer disconnect with websocket message
		// Remove user from queues
		this.activeSessions.delete(username);
		this.connections.delete(username);
	}

	// Solo session management
	handleSoloStart(username: string, cube_type: CubeType) {
		const session: CompetitionState = {
			id: crypto.randomUUID(),
			type: SessionType.SOLO,
			state: SessionState.SCRAMBLING,
			cube_type: cube_type,
			participants: [username],
			scramble: generateScramble(cube_type),
			results: [],
			start_time: null,
		};

		this.activeSessions.set(username, session);
		this.notifyUser(username, {
			type: "SESSION_UPDATE",
			payload: session,
		});
	}

	// Start solve
	handleReady(username: string) {
		const session = this.activeSessions.get(username);
		if (!session || session.state !== SessionState.SCRAMBLING) return null;

		if (session.type === SessionType.SOLO) {
			session.state = SessionState.SOLVING;
			session.start_time = Date.now();
			this.notifyUser(username, {
				type: "SESSION_UPDATE",
				payload: session,
			});
		} else {
			// TODO: implement this
		}
	}

	handleSolveComplete(username: string, result: any) {
		const session = this.activeSessions.get(username);
		if (!session || !session.start_time) return;

		const server_time = Date.now() - session.start_time;
		const time_diff = Math.abs(server_time - result.time);

		// Basic validation, if time_diff greater than 2 seconds, use server_time instead
		if (time_diff > 2000) {
			result.time = server_time;
		}

		// If solo, finish session
		if (session.type === SessionType.SOLO) {
			session.results = result;
			session.state = SessionState.COMPLETE;
			this.notifyUser(username, {
				type: "SESSION_UPDATE",
				payload: session,
			});
		}
	}

	private notifyUser(username: string, payload: any) {
		console.log(`to ${username}: ${payload}`);
		const ws = this.connections.get(username);
		if (ws) {
			ws.send(JSON.stringify(payload));
		}
	}

	private storeSolve(
		username: string,
		session: CompetitionState,
		payload: any,
	) {
		//TODO: impelement DAL
	}
}
