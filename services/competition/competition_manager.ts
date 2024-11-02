import { generateScramble } from "./scrambler.ts";
import { SessionDB, SolveDB } from "./models.ts";
export class CompetitionStateManager {
	// Session keys are usernames, because users can only be in one session at a time
	// and it allows for easier parsing via jwt instead of session id
	private activeSessions: Map<string, CompetitionState> = new Map();
	private connections: Map<string, WebSocket> = new Map();
	// Queues for multiplayer, when implemented
	// private userQueues: Map<string, string[]> = new Map(); // cube_type -> usernames[]

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
			type: "solo",
			state: "scrambling",
			cube_type: cube_type,
			participants: [username],
			scramble: generateScramble(cube_type),
			results: {},
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
		if (!session || session.state !== "scrambling") {
			this.notifyUser(username, {
				type: "ERROR",
				payload:
					`Invalid state, user ${username} is not in a valid state to start solving`,
			});
			return;
		}

		if (session.type === "solo") {
			session.state = "solving";
			session.start_time = Date.now();
			this.notifyUser(username, {
				type: "SESSION_UPDATE",
				payload: session,
			});
		} else {
			// TODO: implement this
		}
	}

	async handleSolveComplete(username: string, result: Result) {
		const session = this.activeSessions.get(username);
		if (!session || !session.start_time) {
			this.notifyUser(username, {
				type: "ERROR",
				payload:
					`Invalid state, user ${username} is not in a valid state to complete a solve`,
			});
			return;
		}

		result.id = crypto.randomUUID();

		const server_time = Date.now() - session.start_time;
		const time_diff = Math.abs(server_time - result.time);

		// Basic validation, if time_diff greater than 2 seconds, use server_time instead
		if (time_diff > 2000) {
			result.time = server_time;
		}

		// If solo, finish session
		if (session.type === "solo") {
			session.results[username] = result;
			session.state = "complete";
			await this.storeSession(session);
			this.notifyUser(username, {
				type: "SESSION_UPDATE",
				payload: session,
			});
		}
	}

	async handlePenalty(
		username: string,
		penalty: "DNF" | "plus2" | "none" = "none",
	) {
		const session = this.activeSessions.get(username);
		if (!session || session.state !== "complete") {
			this.notifyUser(username, {
				type: "ERROR",
				payload:
					`User ${username} is not in a session to apply a penalty`,
			});
			return;
		}

		session.results[username].penalty = penalty;
		await this.storeSession(session);
	}

	private notifyUser(username: string, payload: WebSocketMessage) {
		console.log(`to ${username}: ${payload}`);
		const ws = this.connections.get(username);
		if (ws) {
			ws.send(JSON.stringify(payload));
		}
	}

	private async storeSession(
		session: CompetitionState,
	) {
		// Store session
		await SessionDB.upsert({
			id: session.id,
			type: session.type,
			player_one: session.participants[0],
			player_two: session.participants[1] || null,
			winner: this.getWinner(session),
			cube_type: session.cube_type,
		});

		// Store all solves
		Object.entries(session.results).forEach(async ([username, result]) => {
			await SolveDB.upsert({
				username,
				id: result.id!,
				session_id: session.id,
				scramble: session.scramble,
				time: result.time,
				penalty: result.penalty,
			});
		});
	}

	private getWinner(session: CompetitionState): string | null {
		let winner = null;
		for (const [username, result] of Object.entries(session.results)) {
			if (result.penalty === "DNF") continue;
			if (!winner || result.time < session.results[winner].time) {
				winner = username;
			}
		}
		return winner;
	}
}
