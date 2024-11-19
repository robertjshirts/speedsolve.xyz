import { generateScramble } from "./scrambler.ts";
import { SpeedcubeQueue, QueueMatch } from "./speedcube_queue.ts";
import Database from "./models.ts";

const { SessionDB, SolveDB } = Database.defineModels();

type MultiClientMessageType = 
| "start_q" 
| "cancel_q" 
| "rtc_offer" 
| "rtc_answer" 
| "rtc_candidate" 
| "rtc_connected" 
| "chat_message" 
| "finish_scramble"
| "start_countdown"
| "cancel_countdown";

type MultiServerMessageType = "state_change" | "error" | "peer_ready" | "peer_unready" | "countdown_started" | "countdown_canceled";

interface MultiClientMessage {
  type: MultiClientMessageType;
  payload?: Record<string, any>;
}

interface MultiServerMessage {
  type: MultiServerMessageType;
  payload?: Record<string, any>;
}

interface MultiSession {
  id: string;
  cube_type: CubeType;
  participants: Set<string>;
  readyParticipants: Set<string>;
  state: SessionState;
  scramble: string;
  results: Record<string, Result>;
  start_time: number | null;
  timeoutId: number | null;
}

export class MultiManager {
  private activeSessions: Map<string, MultiSession> = new Map();
  private connections: Map<string, WebSocket> = new Map();
  private queues = new SpeedcubeQueue();
  private testing = false;

  constructor(testing = false) {
    this.queues.addListener("match", this.handleMatchMade.bind(this));
    this.testing = testing;
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
    this.cancelQueue(username);
    this.connections.delete(username);
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
    switch (message.type) {
      case "start_q":
        this.startQueue(username, message.payload);
        break;
      case "cancel_q":
        this.cancelQueue(username);
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

  private startQueue(username: string, payload: any) {
    const cube_type = payload.cube_type;
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

  private cancelQueue(username: string) {
    this.queues.removeFromQueue(username, this.activeSessions.get(username)!.cube_type);
    this.activeSessions.delete(username);
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
    session.readyParticipants.add(username);
    if (session.readyParticipants.size === session.participants.size) {
      this.changeState(session, "countdown");
    } else {
      this.notifyPeers(username, {
        type: "peer_ready",
        payload: { peer: username },
      });
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
    // TODO: Send peer_ready to all participants, no matter what. it is separate from a state change.
    // This helps with separation of concerns on frontend. We were starting testing on this, but will 
    // need an extensive refactor of the test. Still need to implement solve finishes, results, and penalties.
    // GOOD LUCK FUTURE ME
    // good night
    session.readyParticipants.add(username);
    if (session.readyParticipants.size === session.participants.size) {
      this.notifySession(session, {
        type: "countdown_started",
      });
      // Start solving after 3 seconds
      session.timeoutId = setTimeout(() => {
        this.handleStartSolving(session);
      }, 3000);
    } else {
      // Notify peers that user is ready
      this.notifyPeers(username, {
        type: "peer_ready",
        payload: { peer: username },
      });
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

  private changeState(session: MultiSession, state: SessionState, payload?: Record<string, any>) {
    // change session
    session.readyParticipants.clear();
    session.state = state;

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
}
