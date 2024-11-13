import { generateScramble } from "./scrambler.ts";
import { SessionDB, SolveDB } from "./models.ts";

export class MultiManager {
    private activeSessions: Map<string, CompetitionState> = new Map();
    private connections: Map<string, WebSocket> = new Map();
    private userQueues: Map<string, Set<string>> = new Map(); // cube_type -> set(username)

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
                if (participant !== username) {
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

    handleQueue(username: string, cube_type: CubeType) {
        console.log(`User ${username} enqueued for ${cube_type}`);
        
        // Check if user is in an active session
        const session = this.activeSessions.get(username);
        if (session && session.state !== "complete") {
            this.notifyUser(username, {
                type: "ERROR",
                payload: "Cannot queue while in an active session",
            });
            return;
        }

        this.activeSessions.delete(username);

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
            scramble: "",
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

    handleReady(username: string) {
        const session = this.activeSessions.get(username);
        if (!session || session.state !== "scrambling") {
            this.notifySession(session!, {
                type: "ERROR",
                payload: `Invalid state, user ${username} is not in a valid state to start solving`,
            });
            return;
        }

        if (!session.readyParticipants) {
            session.readyParticipants = new Set<string>();
        }
        
        session.readyParticipants?.add(username);

        if (session.readyParticipants?.size === session.participants.size) {
            session.state = "solving";
            session.start_time = Date.now();
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

    async handlePenalty(username: string, penalty: "DNF" | "plus2" | "none" = "none") {
        const session = this.activeSessions.get(username);
        if (!session || !session.results[username]) {
            this.notifySession(session!, {
                type: "ERROR",
                payload: `User ${username} is not in a session to apply a penalty`,
            });
            return;
        }

        session.results[username].penalty = penalty;
        await this.storeSession(session);
        
        this.notifySession(session, {
            type: "SESSION_UPDATE",
            payload: session,
        });
    }

    handleLeave(username: string) {
        this.activeSessions.delete(username);
        this.removeFromQueue(username);
    }

    private removeFromQueue(username: string) {
        for (const queue of this.userQueues.values()) {
            if (queue.has(username)) {
                queue.delete(username);
            }
        }
    }

    private notifySession(session: CompetitionState, payload: MultiWebSocketMessage) {
        if (session.participants.size === 0) return;

        for (const username of session.participants) {
            this.notifyUser(username, payload);
        }
    }

    private notifyUser(username: string, payload: MultiWebSocketMessage) {
        const ws = this.connections.get(username);
        if (ws && ws.readyState === 1) {
            if (payload.type === "SESSION_UPDATE") {
                const sessionPayload = { ...payload.payload };
                sessionPayload.participants = Array.from(sessionPayload.participants);
                if (sessionPayload.readyParticipants) {
                    sessionPayload.readyParticipants = Array.from(sessionPayload.readyParticipants);
                }
                ws.send(JSON.stringify({ ...payload, payload: sessionPayload }));
            } else {
                ws.send(JSON.stringify(payload));
            }
        }
    }

    private getWinner(session: CompetitionState): string | null {
        let winner = null;
        let bestTime = Infinity;
        
        for (const [username, result] of Object.entries(session.results)) {
            if (result.penalty === "DNF") continue;
            const finalTime = result.penalty === "plus2" ? result.time + 2000 : result.time;
            if (finalTime < bestTime) {
                winner = username;
                bestTime = finalTime;
            }
        }
        return winner;
    }

    private async storeSession(session: CompetitionState) {
        const participants = Array.from(session.participants);
        
        // Store session
        await SessionDB.upsert({
            id: session.id,
            type: session.type,
            player_one: participants[0],
            player_two: participants[1],
            winner: this.getWinner(session),
            cube_type: session.cube_type,
        });

        // Store all solves
        for (const [username, result] of Object.entries(session.results)) {
            await SolveDB.upsert({
                username,
                id: result.id!,
                session_id: session.id,
                scramble: session.scramble,
                time: result.time,
                penalty: result.penalty,
            });
        }
    }
}
