import { generateScramble } from "./scrambler.ts";
import { SessionDB, SolveDB } from "./models.ts";

export class MultiManagerNew {
  private activeSessions: Map<string, CompetitionState> = new Map();
  private connections: Map<string, WebSocket> = new Map();
  private queues = new SpeedcubeQueue();
}