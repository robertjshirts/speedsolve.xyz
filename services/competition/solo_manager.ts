import { generateScramble } from "./scrambler.ts";
import Database from "./models.ts";
const { SessionDB, SolveDB } = Database.defineModels();

export class SoloManager {
    private activeSessions: Map<string, CompetitionState> = new Map();
    private connections: Map<string, WebSocket> = new Map();

    addConnection(username: string, ws: WebSocket) {
        this.connections.set(username, ws);
        this.activeSessions.delete(username);
    }

    handleDisconnect(username: string) {
        this.activeSessions.delete(username);
        this.connections.delete(username);
    }

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
        this.notifyUser(username, {
            type: "SESSION_UPDATE",
            payload: session,
        });
    }

    handleReady(username: string) {
        const session = this.activeSessions.get(username);
        if (!session || session.state !== "scrambling") {
            this.notifyUser(username, {
                type: "ERROR",
                payload: `Invalid state, user ${username} is not in a valid state to start solving`,
            });
            return;
        }

        session.state = "solving";
        session.start_time = Date.now();

        this.notifyUser(username, {
            type: "SESSION_UPDATE",
            payload: session,
        });
    }

    async handleSolveComplete(username: string, result: Result) {
        const session = this.activeSessions.get(username);
        if (!session || !session.start_time) {
            this.notifyUser(username, {
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
        session.state = "complete";
        await this.storeSession(session);
        
        this.notifyUser(username, {
            type: "SESSION_UPDATE",
            payload: session,
        });
    }

    async handlePenalty(username: string, penalty: "DNF" | "plus2" | "none" = "none") {
        const session = this.activeSessions.get(username);
        if (!session || !session.results[username]) {
            this.notifyUser(username, {
                type: "ERROR",
                payload: `User ${username} is not in a session to apply a penalty`,
            });
            return;
        }

        session.results[username].penalty = penalty;
        await this.storeSession(session);
        
        this.notifyUser(username, {
            type: "SESSION_UPDATE",
            payload: session,
        });
    }

    private notifyUser(username: string, payload: SoloWebSocketMessage) {
        const ws = this.connections.get(username);
        if (ws && ws.readyState === 1) {
            if (payload.type === "SESSION_UPDATE") {
                const sessionPayload = { ...payload.payload };
                sessionPayload.participants = Array.from(sessionPayload.participants);
                ws.send(JSON.stringify({ ...payload, payload: sessionPayload }));
            } else {
                ws.send(JSON.stringify(payload));
            }
        }
    }

    private async storeSession(session: CompetitionState) {
        const participant = Array.from(session.participants)[0];
        
        // Store session
        await SessionDB.upsert({
            id: session.id,
            type: session.type,
            player_one: participant,
            player_two: null,
            winner: participant,
            cube_type: session.cube_type,
        });

        // Store solve
        const result = session.results[participant];
        await SolveDB.upsert({
            username: participant,
            id: result.id!,
            session_id: session.id,
            scramble: session.scramble,
            time: result.time,
            penalty: result.penalty,
        });
    }
}
