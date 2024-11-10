import { generateScramble } from "./scrambler.ts";
import { SessionDB, SolveDB } from "./models.ts";
export class CompetitionStateManager {
	// Session keys are usernames, because users can only be in one session at a time
	// and it allows for easier parsing via jwt instead of session id
	private activeSessions: Map<string, CompetitionState> = new Map();
	private connections: Map<string, WebSocket> = new Map();
	// Queues for multiplayer, when implemented
	private userQueues: Map<string, Set<string>> = new Map(); // cube_type -> usernames[]

	addConnection(username: string, ws: WebSocket) {
		this.connections.set(username, ws);
		this.activeSessions.delete(username);
		this.removeFromQueue(username);
	}

	handleDisconnect(username: string) {
		const session = this.activeSessions.get(username);
		if (session) {
			// Notify only other participants in the session
			for (const participant of session.participants) {
				if (participant !== username) {  // Skip the disconnected user
					this.notifyUser(participant, {
						type: "ERROR",
						payload: `User ${username} disconnected`,
					});
				}
			}
			// Clean up session for all participants
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
		
		// Check if user is in an active session
		if (this.activeSessions.has(username)) {
			this.notifyUser(username, {
				type: "ERROR",
				payload: "Cannot queue while in an active session",
			});
			return;
		}

		// Check if user is already in any queue
		for (const [queueType, queue] of this.userQueues.entries()) {
			if (queue.has(username)) {
				this.notifyUser(username, {
					type: "ERROR",
					payload: `Already queued for ${queueType}`,
				});
				return;
			}
		}

		// Create initial session for queuing user
		const initialSession: CompetitionState = {
			id: crypto.randomUUID(),
			type: "multi",
			state: "queuing",
			cube_type: cube_type,
			participants: new Set([username]),
			readyParticipants: new Set(),
			scramble: "", // Will be generated when players are matched
			results: {},
			start_time: null,
		};

		this.activeSessions.set(username, initialSession);
		this.notifySession(initialSession, {
			type: "SESSION_UPDATE",
			payload: initialSession,
		});

		const queue = this.userQueues.get(cube_type);
		if (!queue) {
			this.userQueues.set(cube_type, new Set([username]));
		} else {
			queue.add(username);
			if (queue.size >= 2) {
				const participants = Array.from(queue.values()).slice(0, 2);
				console.log(`Matching players ${participants[0]} and ${participants[1]}`);
				
				// Get the first player's session and update it with the second player
				const session = this.activeSessions.get(participants[0])!;
				session.participants.add(participants[1]);
				session.state = "scrambling";
				session.scramble = generateScramble(cube_type);

				// Remove matched players from queue
				participants.forEach(participant => {
					queue.delete(participant);
				});

				// Update second player's session reference
				this.activeSessions.set(participants[1], session);

				this.notifySession(session, {
					type: "SESSION_UPDATE",
					payload: session,
				});
			}
		}
	}

	// Solo session management
	handleSoloStart(username: string, cube_type: CubeType) {
		// Check if user is in any queue
		for (const [queueType, queue] of this.userQueues.entries()) {
			if (queue.has(username)) {
				this.notifyUser(username, {
					type: "ERROR",
					payload: `Cannot start a solo session while queued for ${queueType} multi`,
				});
				return;
			}
		}

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
			if (queue.has(username)) {
				queue.delete(username);
			}
		}
	}

	private notifySession(session: CompetitionState, payload: WebSocketMessage) {
		for (const username of session.participants) {
			this.notifyUser(username, payload);
		}
	}

	private notifyUser(username: string, payload: WebSocketMessage) {
		const ws = this.connections.get(username);
		if (ws && ws.readyState === 1) { // Check if WebSocket is OPEN (readyState === 1)
			// Convert Sets to arrays before sending
			if (payload.type === "SESSION_UPDATE") {
				const sessionPayload = { ...payload.payload };
				sessionPayload.participants = Array.from(sessionPayload.participants);
				if (sessionPayload.type === "multi" && sessionPayload.readyParticipants) {
					sessionPayload.readyParticipants = Array.from(sessionPayload.readyParticipants);
				}
				ws.send(JSON.stringify({ ...payload, payload: sessionPayload }));
			} else {
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
