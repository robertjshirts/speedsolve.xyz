import { generateScramble } from "./scrambler.ts";
import Database from "./models.ts";

const { SessionDB, SolveDB } = Database.defineModels();

type SoloClientMessageType = "create_session" | "start_solve" | "complete_solve" | "apply_penalty" | "end_session";
type SoloServerMessageType = "session_created" | "solve_started" | "solve_completed" | "penalty_applied" | "error";

interface SoloSession {
    id: string;
    state: SessionState;
    cube_type: CubeType;
    participant: string;
    scramble: string;
    start_time: number | null;
    result: Result | null;
}

interface SoloServerMessage {
    type: SoloServerMessageType;
    payload?: any;
}

interface SoloClientMessage {
    type: SoloClientMessageType;
    payload?: any;
}

export class SoloManager {
    private activeSessions: Map<string, SoloSession> = new Map();
    private connections: Map<string, WebSocket> = new Map();
    private testing = false;

    constructor(testing = false) {
        this.testing = testing;
    }

    addConnection(username: string, ws: WebSocket) {
        this.connections.set(username, ws);
        this.activeSessions.delete(username);
        ws.onmessage = (event) => this.handleMessage(username, event);
        ws.onclose = () => this.handleDisconnect(username);
        ws.onerror = () => this.handleDisconnect(username);
    }

    handleDisconnect(username: string) {
        console.log(`User ${username} disconnected`);
        this.activeSessions.delete(username);
        this.connections.delete(username);
    }

    getActiveSessions() {
        return Array.from(this.activeSessions.values());
    }

    getActiveSession(username: string) {
        return this.activeSessions.get(username);
    }

    private handleMessage(username: string, event: MessageEvent) {
        const message = JSON.parse(event.data as string) as SoloClientMessage;
        switch (message.type) {
            case "create_session": this.handleCreateSession(username, message.payload.cube_type); break;
            case "start_solve": this.handleStartSolve(username); break;
            case "complete_solve": this.handleSolveComplete(username, message.payload.time); break;
            case "apply_penalty": this.handlePenalty(username, message.payload.penalty); break;
            case "end_session": this.handleDisconnect(username); break;
        }
    }

    private handleCreateSession(username: string, cube_type: CubeType) {
        const session: SoloSession = {
            id: crypto.randomUUID(),
            state: "scrambling",
            cube_type: cube_type,
            scramble: generateScramble(cube_type),
            participant: username,
            result: null,
            start_time: null,
        };

        this.activeSessions.set(username, session);
        this.notifyUser(username, {
            type: "session_created",
            payload: {
                state: session.state,
                scramble: session.scramble,
            }
        });
    }

    private handleStartSolve(username: string) {
        const session = this.activeSessions.get(username);
        if (!session || session.state !== "scrambling") {
            this.notifyUser(username, {
                type: "error",
                payload: `Invalid state, user ${username} is not in a valid state to start solving`,
            });
            return;
        }

        session.state = "solving";
        session.start_time = Date.now();

        this.notifyUser(username, {
            type: "solve_started",
            payload: {
                state: session.state,
                start_time: session.start_time,
            },
        });
    }

    private async handleSolveComplete(username: string, time: number) {
        const session = this.activeSessions.get(username);
        if (!session || !session.start_time) {
            this.notifyUser(username, {
                type: "error",
                payload: `Invalid state, user ${username} is not in a valid state to complete a solve`,
            });
            return;
        }

        const result: Result = {
            id: crypto.randomUUID(),
            time: time,
            penalty: "none",
        };

        const server_time = Date.now() - session.start_time;
        const time_diff = Math.abs(server_time - result.time);

        // Basic validation, if time_diff greater than 2 seconds, use server_time instead
        if (time_diff > 2000) {
            result.time = server_time;
        }

        session.result = result;
        session.state = "results";
        await this.storeSession(session);

        const message: SoloServerMessage = {
            type: "solve_completed",
            payload: {
                state: session.state,
                result: result,
            },
        };
        this.notifyUser(username, message);
    }

    private async handlePenalty(username: string, penalty: "DNF" | "plus2" | "none" = "none") {
        const session = this.activeSessions.get(username);
        if (!session || !session.result) {
            this.notifyUser(username, {
                type: "error",
                payload: `User ${username} is not in a session to apply a penalty`,
            });
            return;
        }

        session.result.penalty = penalty;
        await this.storeSession(session);
        this.notifyUser(username, {
            type: "penalty_applied",
            payload: {
                state: session.state,
                result: session.result,
            },
        });
    }

    private notifyUser(username: string, message: SoloServerMessage) {
        const ws = this.connections.get(username);
        if (!ws) return this.handleDisconnect(username);
        ws.send(JSON.stringify(message));
    }

    private async storeSession(session: SoloSession) {
        // Skip storing in testing
        // I love deno but FUCK YOU this is stupid
        if (this.testing) return;

        const result = session.result;
        if (!result) {
            this.notifyUser(session.participant, {
                type: "error",
                payload: "No result to store",
            });
            return;
        }

        // Store session
        await SessionDB.upsert({
            id: session.id,
            type: "solo",
            player_one: session.participant,
            player_two: null,   
            winner: session.participant,
            cube_type: session.cube_type,
        });

        await SolveDB.upsert({
            id: result.id!,
            username: session.participant,
            type: 'solo',
            session_id: session.id,
            scramble: session.scramble,
            time: result.time,
            penalty: result.penalty,
        });
    }

}
