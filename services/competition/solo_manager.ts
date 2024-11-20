import { generateScramble } from "./scrambler.ts";
import type { CubeType, SoloSession, SoloClientMessage, SoloServerMessage, Result, SessionState } from "./types.ts";


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
        this.activeSessions.delete(username);
        this.connections.delete(username);
    }

    getActiveSessions() {
        return structuredClone(this.activeSessions);
    }

    private handleMessage(username: string, event: MessageEvent) {
        const message = JSON.parse(event.data as string) as SoloClientMessage;
        switch (message.type) {
            case "start_session":
                if (!message.payload?.cube_type) {
                    this.notifyUser(username, {
                        type: "error",
                        payload: "No cube_type provided",
                    });
                    return;
                }
                this.startSession(username, message.payload.cube_type); 
                break; 
            case "finish_scramble": 
                this.finishScramble(username); 
                break;
            case "finish_solve": 
                if (!message.payload?.time) {
                    this.notifyUser(username, {
                        type: "error",
                        payload: "No time provided",
                    });
                    return;
                }
                this.finishSolve(username, message.payload.time); 
                break;
            case "apply_penalty": 
                if (!message.payload?.penalty) {
                    this.notifyUser(username, {
                        type: "error",
                        payload: "No penalty provided",
                    });
                    return;
                }
                this.handlePenalty(username, message.payload.penalty); 
                break;
            case "leave_session": this.handleDisconnect(username); break;
        }
    }

    private startSession(username: string, cube_type: CubeType) {
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

        this.changeState(session, "scrambling", {
            scramble: session.scramble,
        });
    }

    private finishScramble(username: string) {
        const session = this.activeSessions.get(username);
        if (!session || session.state !== "scrambling") {
            this.notifyUser(username, {
                type: "error",
                payload: "Not in scrambling state. Cannot finish scrambling.",
            });
            return;
        }

        session.state = "solving";
        session.start_time = Date.now();

        this.changeState(session, "solving", {
            start_time: session.start_time,
        });
    }

    private async finishSolve(username: string, time: number) {
        const session = this.activeSessions.get(username);
        if (!session || session.state !== "solving") {
            this.notifyUser(username, {
                type: "error",
                payload: "Not in solving state. Cannot finish solve.",
            });
            return;
        }

        const result: Result = {
            id: crypto.randomUUID(),
            time: time,
            penalty: "none",
        };

        const server_time = Date.now() - session.start_time!;
        const time_diff = Math.abs(server_time - result.time);

        // Basic validation, if time_diff greater than 2 seconds, use server_time instead
        if (time_diff > 2000) {
            result.time = server_time;
        }

        session.result = result;
        await this.storeSession(session);

        this.changeState(session, "results", {
            result: result,
        });
    }

    private async handlePenalty(username: string, penalty: "DNF" | "plus2" | "none" = "none") {
        const session = this.activeSessions.get(username);
        if (!session || session.state !== "results") {
            this.notifyUser(username, {
                type: "error",
                payload: "Not in solving state. Cannot apply penalty.",
            });
            return;
        }

        session.result!.penalty = penalty;
        await this.storeSession(session);
        this.notifyUser(username, {
            type: "results_update",
            payload: {
                result: session.result,
            },
        });
    }

    private changeState(session: SoloSession, state: SessionState, payload?: Record<string, any>) {
        session.state = state;
        payload = payload || {};
        payload.state = state;
        this.notifyUser(session.participant, {
            type: "state_change",
            payload,
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
        // TODO: store session
    }

}
