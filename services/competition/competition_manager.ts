import { generateScramble } from "./scrambler.ts";
import { SessionDB, SolveDB } from "./models.ts";
export class CompetitionStateManager {
	// Session keys are usernames, because users can only be in one session at a time
	// and it allows for easier parsing via jwt instead of session id
	private activeSessions: Map<string, CompetitionState> = new Map();
	private connections: Map<string, WebSocket> = new Map();
	// Queues for multiplayer, when implemented
	private userQueues: Map<string, string[]> = new Map(); // cube_type -> usernames[]

	addConnection(username: string, ws: WebSocket) {
		this.connections.set(username, ws);
		this.activeSessions.delete(username);
		this.removeFromQueue(username);
	}

	handleDisconnect(username: string) {
		const session = this.activeSessions.get(username);
		if (session) {
			this.notifySession(session, {
				type: "ERROR",
				payload: `User ${username} disconnected`,
			});
			for (const participant of session.participants) {
				this.activeSessions.delete(participant);
			}
		}
		this.connections.delete(username);
		this.removeFromQueue(username);
	}

	// Handle enqueueing for multiplayer
	handleMultiQueue(username: string, cube_type: CubeType) {
		console.log(`User ${username} enqueued for ${cube_type}`);
		const queue = this.userQueues.get(cube_type);
		if (!queue) {
			this.userQueues.set(cube_type, [username]);
		} else {
			queue.push(username);
			if (queue.length === 2) {
				console.log(`Starting session for ${queue[0]} and ${queue[1]}`);
				const session: CompetitionState = {
					id: crypto.randomUUID(),
					type: "multi",
					state: "scrambling",
					cube_type: cube_type,
					participants: new Set([queue[0], queue[1]]),
					readyParticipants: new Set(),
					scramble: generateScramble(cube_type),
					results: {},
					start_time: null,
				};

				for (const participant of session.participants) {
					this.activeSessions.set(participant, session);
				}

				this.notifySession(session, {
					type: "SESSION_UPDATE",
					payload: session,
				});
			}
		}
	}

	// Solo session management
	handleSoloStart(username: string, cube_type: CubeType) {
		const session: CompetitionState = {
			id: crypto.randomUUID(),
			type: "solo",
			state: "scrambling",
			cube_type: cube_type,
			participants: new Set([username]),
			scramble: generateScramble(cube_type),
			results: {},
			start_time: null,
		};

		this.activeSessions.set(username, session);
		this.notifySession(session, {
			type: "SESSION_UPDATE",
			payload: session,
		});
	}

	// Start solve
	handleReady(username: string) {
		const session = this.activeSessions.get(username);
		if (!session || session.state !== "scrambling") {
			this.notifySession(session!, {
				type: "ERROR",
				payload:
					`Invalid state, user ${username} is not in a valid state to start solving`,
			});
			return;
		}

		if (session.type === "solo") {
			session.state = "solving";
			session.start_time = Date.now();
		} else {
			if (!session.readyParticipants) {
				session.readyParticipants = new Set<string>();
			}
			
			session.readyParticipants?.add(username);

			if (session.readyParticipants?.size === session.participants.size) {
				session.state = "solving";
				session.start_time = Date.now();
			}
		}

		this.notifySession(session, {
			type: "SESSION_UPDATE",
			payload: session,
		});
	}

	async handleSolveComplete(username: string, result: Result) {
		const session = this.activeSessions.get(username);
		if (!session || !session.start_time) {
			this.notifySession(session!, {
				type: "ERROR",
				payload: `Invalid state, user ${username} is not in a valid state to complete a solve`,
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
			this.notifySession(session, {
				type: "SESSION_UPDATE",
				payload: session,
			});
		} else {
			// Multiplayer implementation
			session.results[username] = result;
			
			// Check if all participants have completed their solves
			const allCompleted = Array.from(session.participants).every(
				participant => session.results[participant]
			);

			if (allCompleted) {
				session.state = "complete";
				await this.storeSession(session);
			}

			this.notifySession(session, {
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
		if (!session || !session.results[username]) {
			this.notifySession(session!, {
				type: "ERROR",
				payload:
					`User ${username} is not in a session to apply a penalty`,
			});
			return;
		}

		session.results[username].penalty = penalty;
		await this.storeSession(session);
		this.notifySession(session!, {
			type: "SESSION_UPDATE",
			payload: session,
		});
	}

	private removeFromQueue(username: string) {
		for (const queue of this.userQueues.values()) {
			const index = queue.indexOf(username);
			if (index !== -1) {
				queue.splice(index, 1);
			}
		}
	}

	private notifySession(session: CompetitionState, payload: WebSocketMessage) {
		for (const username of session.participants) {
			console.log(`to ${username}: ${payload}`);
			const ws = this.connections.get(username);
			if (ws) {
				ws.send(JSON.stringify(payload));
			}
		}
	}

	private async storeSession(
		session: CompetitionState,
	) {
		const participants = session.participants.values();
		// Store session
		await SessionDB.upsert({
			id: session.id,
			type: session.type,
			player_one: participants.next().value,
			player_two: participants.next().value,
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
