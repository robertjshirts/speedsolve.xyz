import { generateScramble } from "./scrambler.ts";
import { SpeedcubeQueue, QueueMatch } from "./speedcube_queue.ts";
import type { MultiSession, MultiClientMessage, MultiServerMessage, Result, SessionState, CubeType } from "./types.ts";
import { upsertMultiSession, upsertMultiSessionSolve, upsertSolve } from "./db/db.ts";

export class MultiManager {
  private activeSessions: Map<string, MultiSession> = new Map();
  private connections: Map<string, WebSocket> = new Map();
  private queues: SpeedcubeQueue;
  private testing = false;

  constructor(testing = false) {
    this.queues = new SpeedcubeQueue();
    this.queues.addListener("match", this.handleMatchMade.bind(this));
    this.testing = testing;
    // temporary to test db ops
    this.saveSession({
      id: crypto.randomUUID(),
      cube_type: "3x3",
      participants: new Set(["shirts", "rob"]),
      readyParticipants: new Set(),
      state: "results",
      scramble: "R U R' U'",
      results: {
        shirts: {
          id: crypto.randomUUID(),
          time: 1000,
          penalty: "none",
        },
        rob: {
          id: crypto.randomUUID(),
          time: 1000,
          penalty: "plus2",
        },
      },
      start_time: Date.now() - 10000,
      timeoutId: null,
    });
  }

  cleanup() {
    this.activeSessions.clear();
    this.connections.clear();
    this.queues.cleanup();
  }

  addConnection(username: string, ws: WebSocket) {
    this.connections.set(username, ws);
    this.activeSessions.delete(username);
    ws.onmessage = (event) => this.handleMessage(username, event);
    ws.onclose = () => this.handleDisconnect(username);
    ws.onerror = () => this.handleDisconnect(username);
  }

  handleDisconnect(username: string) {
    const session = this.activeSessions.get(username);
    this.connections.delete(username);

    if (!session) return;

    this.queues.removeFromQueue(username, session.cube_type);
    this.notifyPeers(username, {
      type: "peer_disconnected",
      payload: { peer: username },
    });
    for (const participant of session.participants) {
      this.activeSessions.delete(participant);
    }
  }

  getActiveSessions() {
    return structuredClone(this.activeSessions);
  }

  getQueueStatus(username: string) {
    const session = this.activeSessions.get(username);
    if (!session) return false;
    const queue = this.queues.getQueue(session.cube_type);
    return queue.find(user => user.username === username);
  }

  private handleMessage(username: string, event: MessageEvent) {
    const message = JSON.parse(event.data) as MultiClientMessage;
    switch (message.type) {
      case "start_q":
        // Check to make sure cube type is a valid cube type
        if (!message.payload?.cube_type) {
          this.notifyUser(username, {
            type: "error",
            payload: { message: "No cube_type provided" },
          });
          return;
        }
        this.startQueue(username, message.payload.cube_type);
        break;
      case "cancel_q":
      case "leave_session":
        this.handleDisconnect(username);
        break;
      case "rtc_connected":
        this.handleRtcConnected(username);
        break;
      case "finish_scramble":
        this.finishScramble(username);
        break;
      case "start_countdown":
        this.startCountdown(username);
        break;
      case "cancel_countdown":
        this.cancelCountdown(username);
        break;
      case "finish_solve":
        if (!message.payload?.time) {
          this.notifyUser(username, {
            type: "error",
            payload: { message: "No time provided" },
          });
          return;
        }
        this.finishSolve(username, message.payload.time);
        break;
      case "apply_penalty":
        if (!message.payload?.penalty) {
          this.notifyUser(username, {
            type: "error",
            payload: { message: "No penalty provided" },
          });
          return;
        }
        this.applyPenalty(username, message.payload.penalty);
        break;
      // 'Channels' are forwarded to all participants except the sender
      // For WebRTC and chat
      case "rtc_offer":
      case "rtc_answer":
      case "rtc_candidate":
      case "chat_message":
        this.forwardMessage(username, message);
        break;
      default:
        this.notifyUser(username, {
          type: "error",
          payload: { message: "Unknown message type" },
        });
    }
  }

  private startQueue(username: string, cube_type: CubeType) {
    // add minimal session info, just for cube type.
    const session: MultiSession = {
      id: username,
      cube_type,
      participants: new Set(),
      readyParticipants: new Set(),
      state: "queuing",
      scramble: "",
      results: {},
      start_time: null,
      timeoutId: null,
    };
    this.activeSessions.set(username, session);
    this.notifyUser(username, {
      type: "state_change",
      payload: { state: "queuing" },
    });
    // Add to queue after notifying user, to not break flow
    this.queues.addToQueue(username, 0, cube_type);
  }

  private handleMatchMade(matchResult: QueueMatch) {
    const { user, match, cube_type } = matchResult;

    // Check state of both users
    const userSession = this.activeSessions.get(user);
    const matchSession = this.activeSessions.get(match);
    if (userSession?.state !== "queuing" || matchSession?.state !== "queuing") {
      this.notifyUser(user, {
        type: "error",
        payload: { message: `${userSession?.state !== "queuing" ? user : match} is not queuing. Cannot make match` },
      });
      // Only disconnect users bc this is called from queue listener, not from possibly erroneous user
      this.handleDisconnect(user);
      this.handleDisconnect(match);
      return;
    }

    // Unify sessions and change state to connecting
    const session: MultiSession = {
      id: crypto.randomUUID(),
      cube_type,
      participants: new Set([user, match]),
      readyParticipants: new Set(),
      state: "connecting",
      scramble: "",
      results: {},
      start_time: null,
      timeoutId: null,
    };
    this.activeSessions.set(user, session);
    this.activeSessions.set(match, session);

    // Notify users of state change
    [user, match].forEach(username => {
      this.notifyUser(username, {
        type: "state_change",
        payload: {
          state: "connecting",
          isOfferer: username === user,
        },
      });
    });
  }

  private handleRtcConnected(username: string) {
    // Check state
    const session = this.activeSessions.get(username);
    if (!session || session.state !== "connecting") {
      this.notifyUser(username, {
        type: "error",
        payload: { message: "Not in connecting state. Cannot connect to peer." },
      });
      return;
    }

    // Add to connected participants and start scrambling if both are connected
    session.readyParticipants.add(username);
    if (session.readyParticipants.size === session.participants.size) {
      this.changeState(session, "scrambling", {
        scramble: generateScramble(session.cube_type),
      });
    }
  }

  private finishScramble(username: string) {
    // Check state
    const session = this.activeSessions.get(username);
    if (!session || session.state !== "scrambling") {
      this.notifyUser(username, {
        type: "error",
        payload: { message: "Not in scrambling state. Cannot finish scrambling." },
      });
      return;
    }

    // Add user to ready participants and check if all participants are ready
    this.readyPeer(username);
    if (session.readyParticipants.size === session.participants.size) {
      this.changeState(session, "countdown");
    }
  }

  private startCountdown(username: string) {
    const session = this.activeSessions.get(username);
    if (!session || session.state !== "countdown") {
      this.notifyUser(username, {
        type: "error",
        payload: { message: "Not in countdown state. Cannot start countdown." },
      });
      return;
    }

    // Clear timeout if it exists
    if (session.timeoutId) clearTimeout(session.timeoutId);

    // Add user to ready participants and check if all participants are ready
    this.readyPeer(username);
    if (session.readyParticipants.size === session.participants.size) {
      this.notifySession(session, {
        type: "countdown_started",
      });
      // Start solving after 3 seconds
      session.timeoutId = setTimeout(() => {
        this.handleStartSolving(session);
      }, 3000);
    }
  }

  private cancelCountdown(username: string) {
    const session = this.activeSessions.get(username);
    if (!session || session.state !== "countdown") {
      this.notifyUser(username, {
        type: "error",
        payload: { message: "Not in countdown state. Cannot cancel countdown." },
      });
      return;
    }

    // Update state
    if (session.timeoutId) clearTimeout(session.timeoutId);
    session.readyParticipants.delete(username);

    // Notify peers that user is not ready
    this.notifyPeers(username, {
      type: "peer_unready",
      payload: { peer: username },
    });

    // Notify session that countdown was canceled
    this.notifySession(session, {
      type: "countdown_canceled",
    });
  }

  private handleStartSolving(session: MultiSession) {
    // Update start time
    session.start_time = Date.now();

    // Change state to solving
    this.changeState(session, "solving", {
      start_time: session.start_time,
    });
  }

  private async finishSolve(username: string, time: number) {
    // Check state
    const session = this.activeSessions.get(username);
    if (!session || session.state !== "solving") {
      this.notifyUser(username, {
        type: "error",
        payload: { message: "Not in solving state. Cannot finish solve." },
      });
      return;
    }

    const result: Result = {
      id: crypto.randomUUID(),
      penalty: "none",
      time, 
    };

    // Basic solve validation
    const serverTime = Date.now() - session.start_time!;
    const timeDifference = Math.abs(serverTime - time);
    if (timeDifference > 1000) {
      result.time = serverTime;
    }

    // Add solve result
    session.results[username] = result;
    this.readyPeer(username);
    if (session.readyParticipants.size === session.participants.size) {
      await this.saveSession(session);
      this.changeState(session, "results", {
        results: session.results,
      });
    }
  }

  private async applyPenalty(username: string, penalty: "none" | "DNF" | "plus2" = "none") {
    const session = this.activeSessions.get(username);
    if (!session || session.state !== "results") {
      this.notifyUser(username, {
        type: "error",
        payload: { message: "Not in results state. Cannot apply penalty." },
      });
      return;
    }

    // if penalty is already applied, do nothing
    if (session.results[username].penalty === penalty) return;

    // apply penalty
    session.results[username].penalty = penalty; 
    await this.saveSession(session);

    this.notifySession(session, {
      type: "results_update",
      payload: { results: session.results },
    });
  }

  //#region Helper functions
  private async saveSession(session: MultiSession) {
    // Skip saving in testing
    if (this.testing) return;

    // Insert multi session so we can relate the solves to it
    const winner = this.determineWinner(session);
    try {
      await upsertMultiSession({
        multi_session_id: session.id,
        winner: winner,
      });

      // Insert solves and relate to multi session
      for (const [username, result] of Object.entries(session.results)) {
        // Insert solve
        await upsertSolve({
          solve_id: result.id!,
          username: username,
          time: result.time,
          penalty: result.penalty,
          scramble: session.scramble,
          cube: session.cube_type,
        });

        // Relate solve to multi session
        await upsertMultiSessionSolve({
          multi_session_id: session.id,
          solve_id: result.id!,
        });
      }
    } catch (error) {
      console.error(error);
      this.notifySession(session, {
        type: "error",
        payload: { message: "Failed to save session." },
      });
    }
  }

  private determineWinner(session: MultiSession) {
    let lowest_time = Infinity;
    let winner_username = "";
    for (const [username, result] of Object.entries(session.results)) {
      if (result.time < lowest_time) {
        switch (result.penalty) {
          case "none":
            lowest_time = result.time;
            winner_username = username;
            break;
          case "plus2":
            if (lowest_time < result.time + 2000) {
              lowest_time = result.time + 2000;
              winner_username = username;
            }
            break;
          case "DNF":
            if (lowest_time === Infinity) {
              lowest_time = result.time;
              winner_username = username;
            }
            break;
        }
      }
    }
    return winner_username;
  }

  private readyPeer(username: string) {
    const session = this.activeSessions.get(username);
    if (!session) return;
    session.readyParticipants.add(username);
    this.notifyPeers(username, {
      type: "peer_ready",
      payload: { peer: username },
    });
  }

  // deno-lint-ignore no-explicit-any
  private changeState(session: MultiSession, state: SessionState, payload?: Record<string, any>) {
    // change session
    session.readyParticipants.clear();
    session.state = state;
    if (session.timeoutId) clearTimeout(session.timeoutId);

    // notify participants
    payload = payload || {};
    payload.state = state;
    this.notifySession(session, {
      type: "state_change",
      payload,
    });
  }

  private notifySession(session: MultiSession, message: MultiServerMessage) {
    session.participants.forEach(participant => {
      this.notifyUser(participant, message);
    });
  }

  private notifyPeers(sender: string, message: MultiServerMessage) {
    const session = this.activeSessions.get(sender);
    if (!session) return;
    session.participants.forEach(peer => {
      if (peer === sender) return;
      this.notifyUser(peer, message);
    });
  }

  private notifyUser(username: string, message: MultiServerMessage) {
    const ws = this.connections.get(username);
    if (!ws) return this.handleDisconnect(username);
    ws.send(JSON.stringify(message));
  }

  private forwardMessage(sender: string, message: MultiClientMessage) {
    const session = this.activeSessions.get(sender);
    if (!session) return;
    session.participants.forEach(participant => {
      if (participant === sender) return;
      const ws = this.connections.get(participant);
      if (!ws) return this.handleDisconnect(participant);
      ws.send(JSON.stringify(message));
    });
  }

  //#endregion
}
