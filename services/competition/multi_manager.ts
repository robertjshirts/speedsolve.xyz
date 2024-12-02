import { generateScramble } from "./scrambler.ts";
import { SpeedcubeQueue, QueueMatch } from "./speedcube_queue.ts";
import type { MultiSession, MultiClientMessage, MultiServerMessage, Result, SessionState, CubeType, PeerStatus } from "./types.ts";
import { upsertMultiSession, upsertMultiSessionSolve, upsertSolve } from "./db/db.ts";
import { logger } from "./logger.ts";

export class MultiManager {
  private activeSessions: Map<string, MultiSession> = new Map();
  private connections: Map<string, WebSocket> = new Map();
  private queues: SpeedcubeQueue;
  private testing = false;

  constructor(testing = false) {
    this.queues = new SpeedcubeQueue();
    this.queues.addListener("match", this.handleMatchMade.bind(this));
    this.testing = testing;
    logger.info("MultiManager initialized", { testing });
  }

  cleanup() {
    this.activeSessions.clear();
    this.connections.clear();
    this.queues.cleanup();
    logger.debug("MultiManager cleaned up");
  }

  addConnection(username: string, ws: WebSocket) {
    this.activeSessions.delete(username);
    this.connections.set(username, ws);
    ws.onmessage = (event) => this.handleMessage(username, event);
    ws.onclose = () => {
      logger.warn("Connection closed", { username });
      this.handleDisconnect(username);
    };
    ws.onerror = () => {
      logger.error("Connection error", { username });
      this.handleDisconnect(username);
    };
    logger.info("New connection added", { username });
  }


  handleDisconnect(username: string) {
    const session = this.activeSessions.get(username);
    const ws = this.connections.get(username);
    if (ws) {
      ws.close();
      this.connections.delete(username);
    }

    if (!session) {
      logger.debug("User disconnected without active session", { username });
      return;
    }

    logger.info("User disconnected", { username, sessionId: session.id });
    this.queues.removeFromQueue(username, session.cube_type);
    this.updatePeer(username, 'disconnected');
    this.activeSessions.delete(username);
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
    logger.debug("Received message", { username, messageType: message.type });

    switch (message.type) {
      case "start_q":
        if (!message.payload?.cube_type) {
          logger.warn("Invalid start_q message - missing cube_type", { username });
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
        this.endSession(username);
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
          logger.warn("Invalid finish_solve message - missing time", { username });
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
          logger.warn("Invalid apply_penalty message - missing penalty", { username });
          this.notifyUser(username, {
            type: "error",
            payload: { message: "No penalty provided" },
          });
          return;
        }
        this.applyPenalty(username, message.payload.penalty);
        break;
      case "rtc_offer":
      case "rtc_answer":
      case "rtc_candidate":
      case "chat_message":
        this.forwardMessage(username, message);
        break;
      default:
        logger.warn("Unknown message type received", { username, messageType: message.type });
        this.notifyUser(username, {
          type: "error",
          payload: { message: `Unknown message type ${message.type}` },
        });
    }
  }

  private startQueue(username: string, cube_type: CubeType) {
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
    logger.info("User started queuing", { username, cubeType: cube_type });
    this.notifyUser(username, {
      type: "state_change",
      payload: { state: "queuing" },
    });
    this.queues.addToQueue(username, 0, cube_type);
  }

  private handleMatchMade(matchResult: QueueMatch) {
    const { user, match, cube_type } = matchResult;
    logger.info("Match made", { user, match, cubeType: cube_type });

    const userSession = this.activeSessions.get(user);
    const matchSession = this.activeSessions.get(match);
    if (userSession?.state !== "queuing" || matchSession?.state !== "queuing") {
      logger.warn("Invalid match state", { 
        user, 
        match, 
        userState: userSession?.state, 
        matchState: matchSession?.state 
      });
      this.notifyUser(user, {
        type: "error",
        payload: { message: `${userSession?.state !== "queuing" ? user : match} is not queuing. Cannot make match` },
      });
      this.handleDisconnect(user);
      this.handleDisconnect(match);
      return;
    }

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
    const session = this.activeSessions.get(username);
    if (!session) {
      logger.error("RTC connection without active session", { username });
      return;
    }

    if (session.state !== "connecting") {
      logger.warn("Invalid RTC connection attempt", { username, sessionState: session?.state });
    }

    logger.debug("RTC connected", { username, sessionId: session.id });
    this.updatePeer(username, "ready");
    if (session.readyParticipants.size === session.participants.size) {
      this.changeState(session, "scrambling", {
        scramble: generateScramble(session.cube_type),
      });
    }
  }

  private finishScramble(username: string) {
    const session = this.activeSessions.get(username);
    if (!session || session.state !== "scrambling") {
      logger.warn("Invalid scramble finish attempt", { username, sessionState: session?.state });
      this.notifyUser(username, {
        type: "error",
        payload: { message: "Not in scrambling state. Cannot finish scrambling." },
      });
      return;
    }

    logger.debug("User finished scrambling", { username, sessionId: session.id });
    this.updatePeer(username, "ready");
    if (session.readyParticipants.size === session.participants.size) {
      this.changeState(session, "countdown");
    }
  }

  private startCountdown(username: string) {
    const session = this.activeSessions.get(username);
    if (!session || session.state !== "countdown") {
      logger.warn("Invalid countdown start attempt", { username, sessionState: session?.state });
      this.notifyUser(username, {
        type: "error",
        payload: { message: "Not in countdown state. Cannot start countdown." },
      });
      return;
    }

    if (session.timeoutId) clearTimeout(session.timeoutId);

    logger.debug("User ready for countdown", { username, sessionId: session.id });
    this.updatePeer(username, "ready");
    if (session.readyParticipants.size === session.participants.size) {
      this.notifySession(session, {
        type: "countdown_started",
      });
      session.timeoutId = setTimeout(() => {
        this.handleStartSolving(session);
      }, 3000);
    }
  }

  private cancelCountdown(username: string) {
    const session = this.activeSessions.get(username);
    if (!session || session.state !== "countdown") {
      logger.warn("Invalid countdown cancel attempt", { username, sessionState: session?.state });
      this.notifyUser(username, {
        type: "error",
        payload: { message: "Not in countdown state. Cannot cancel countdown." },
      });
      return;
    }

    logger.info("Countdown canceled", { username, sessionId: session.id });
    if (session.timeoutId) clearTimeout(session.timeoutId);
    session.readyParticipants.delete(username);

    this.updatePeer(username, "unready");

    this.notifySession(session, {
      type: "countdown_canceled",
    });
  }

  private handleStartSolving(session: MultiSession) {
    session.start_time = Date.now();
    logger.info("Solve started", { 
      sessionId: session.id, 
      participants: Array.from(session.participants) 
    });

    this.changeState(session, "solving", {
      start_time: session.start_time,
    });
  }

  private async finishSolve(username: string, time: number) {
    const session = this.activeSessions.get(username);
    if (!session || session.state !== "solving") {
      logger.warn("Invalid solve finish attempt", { username, sessionState: session?.state });
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

    const serverTime = Date.now() - session.start_time!;
    const timeDifference = Math.abs(serverTime - time);
    if (timeDifference > 1000) {
      logger.warn("Time discrepancy detected", { 
        username, 
        clientTime: time, 
        serverTime,
        difference: timeDifference 
      });
      result.time = serverTime;
    }

    logger.info("Solve finished", { 
      username, 
      sessionId: session.id, 
      time: result.time 
    });

    session.results[username] = result;
    this.updatePeer(username, "ready");
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
      logger.warn("Invalid penalty application attempt", { username, sessionState: session?.state });
      this.notifyUser(username, {
        type: "error",
        payload: { message: "Not in results state. Cannot apply penalty." },
      });
      return;
    }

    if (session.results[username].penalty === penalty) return;

    logger.info("Penalty applied", { 
      username, 
      sessionId: session.id, 
      penalty,
      time: session.results[username].time 
    });

    session.results[username].penalty = penalty; 
    await this.saveSession(session);

    this.notifySession(session, {
      type: "results_update",
      payload: { results: session.results },
    });
  }

  private endSession(username: string) {
    const session = this.activeSessions.get(username);
    if (!session) return;
    this.queues.removeFromQueue(username, session.cube_type);
    this.activeSessions.delete(username);

    logger.info("Session ended", { 
      username, 
      sessionId: session.id, 
      participants: Array.from(session.participants) 
    });

    this.notifyUser(username, {
      type: "session_ended"
    });

    // TODO: Graceful session end if not in results state. handled by frontend for now, should be handled here too/instead
    this.updatePeer(username, "disconnected");
  }

  //#region Helper functions
  private async saveSession(session: MultiSession) {
    if (this.testing) return;

    const winner = this.determineWinner(session);
    try {
      await upsertMultiSession({
        multi_session_id: session.id,
        winner: winner,
      });

      for (const [username, result] of Object.entries(session.results)) {
        await upsertSolve({
          solve_id: result.id!,
          username: username,
          time: result.time,
          penalty: result.penalty,
          scramble: session.scramble!,
          cube: session.cube_type,
        });

        await upsertMultiSessionSolve({
          multi_session_id: session.id,
          solve_id: result.id!,
        });
      }
      logger.info("Session saved successfully", { 
        sessionId: session.id, 
        winner,
        participants: Array.from(session.participants)
      });
    } catch (error) {
      logger.error("Failed to save session", { 
        sessionId: session.id, 
        error,
      });
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
            if (result.time + 2000 < lowest_time) {
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
    logger.info("Winner determined", { sessionId: session.id, winner: winner_username, participants: Array.from(session.participants) });
    return winner_username;
  }

  private changeState(session: MultiSession, state: SessionState, payload?: Record<string, any>) {
    session.readyParticipants.clear();
    session.state = state;
    if (session.timeoutId) clearTimeout(session.timeoutId);

    logger.info("Session state changed", { 
      sessionId: session.id, 
      newState: state,
      participants: Array.from(session.participants)
    });

    payload = payload || {};
    payload.state = state;
    this.notifySession(session, {
      type: "state_change",
      payload,
    });

    // Reset each peer's status
    for (const participant of session.participants) {
      this.updatePeer(participant, 'unready');
    }
  }

  private notifySession(session: MultiSession, message: MultiServerMessage) {
    logger.debug("Notifying session", { sessionId: session.id, messageType: message.type, messagePayload: message.payload });
    session.participants.forEach(participant => {
      this.notifyUser(participant, message);
    });
  }

  private updatePeer(peer: string, status: PeerStatus) {
    // Update peer's status and notify other participants
    const session = this.activeSessions.get(peer);
    if (!session) return;
    if (status === "ready") {
      session.readyParticipants.add(peer);
    } else {
      session.readyParticipants.delete(peer);
    }

    // Notify all participants of the peer's status change
    session.participants.forEach(otherPeer => {
      if (peer === otherPeer) return;
      this.notifyUser(otherPeer, {
        type: "peer_update",
        payload: { peer, status },
      });
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
