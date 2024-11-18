import { EventEmitter } from "node:events";

export interface QueueUser {
  username: string;
  avg_solve_time: number;
  queued_at: number;
}

export interface QueueMatch {
  user1: string;
  user2: string;
  cube_type: CubeType;
  max_queue_time: number;
}

export class SpeedcubeQueue extends EventEmitter {
  private queues: Map<CubeType, QueueUser[]> = new Map();
  private readonly TIME_DIFFS = [
    { maxWaitTime: 10000, maxDiff: 5000 }, // 0s - 10s, 5s max diff (lv1)
    { maxWaitTime: 20000, maxDiff: 10000 }, // 10s - 20s, 10s max diff (lv2)
    { maxWaitTime: Infinity, maxDiff: Infinity }, // 20s - inf, no max diff (lv3)
  ];
  private readonly CHECK_INTERVAL_MS = 2500;
  private intervalId: number;

  constructor() {
    super();
    this.queues.set("3x3", []);
    this.intervalId = setInterval(() => {
      this.findMatches("3x3")
    }, this.CHECK_INTERVAL_MS);
  }

  // return a copy so the queue can't be modified
  getQueue(cube_type: CubeType): QueueUser[] {
    return [...this.queues.get(cube_type)!];
  }

  getQueueLength(cube_type: CubeType): number {
    return this.queues.get(cube_type)!.length;
  }

  addToQueue(username: string, avg_solve_time: number, cube_type: CubeType) {
    const queue = this.queues.get(cube_type)!;
    if (queue.find(user => user.username === username)) {
      this.removeFromQueue(username, cube_type);
    }

    const user: QueueUser = {
      username,
      avg_solve_time,
      queued_at: Date.now(),
    };

    // try to find a match for the user immediately
    const match = this.findBestMatch(user, queue, new Set(), this.getMaxTimeDiff(0));
    if (match) {
      this.createMatch(user.username, match.username, cube_type, 0);
      return;
    }

    // if no match, add to end of queue (maintain order, oldest queuers first, newer queuers last)
    queue.push(user);
  }

  removeFromQueue(username: string, cube_type: CubeType) {
    const queue = this.queues.get(cube_type)!;
    const index = queue.findIndex(user => user.username === username);
    if (index !== -1) {
      queue.splice(index, 1);
    }
  }

  // Find matches for a cube type (O(n^2))
  private findMatches(cube_type: CubeType) {
    const queue = this.queues.get(cube_type)!;
    if (queue.length < 2) {
      return null;
    }

    // Check each user for matches
    const matchedUsers: Set<string> = new Set();
    for (const user of queue) {
      if (matchedUsers.has(user.username)) {
        continue;
      }

      const waitTime = Date.now() - user.queued_at;
      const maxTimeDiff = this.getMaxTimeDiff(waitTime);

      // Find the best match for the user
      const match = this.findBestMatch(user, queue, matchedUsers, maxTimeDiff);
      if (match) {
        matchedUsers.add(user.username);
        matchedUsers.add(match.username);
        this.createMatch(user.username, match.username, cube_type, waitTime);
      }
    }
  }

  // Emit a match and remove users from queue
  private createMatch(user1: string, user2: string, cube_type: CubeType, max_queue_time: number) {
    this.removeFromQueue(user1, cube_type);
    this.removeFromQueue(user2, cube_type);
    const matchResult: QueueMatch = {
      user1,
      user2,
      cube_type,
      max_queue_time,
    };
    this.emit("match", matchResult);
  }

  private getMaxTimeDiff(waitTime: number): number {
    for (const diff of this.TIME_DIFFS) {
      if (waitTime < diff.maxWaitTime) {
        return diff.maxDiff;
      }
    }
    return Infinity;
  }

  // Find the best match for a user (O(n))
  private findBestMatch(user: QueueUser, queue: QueueUser[], matchedUsers: Set<string>, maxTimeDiff: number): QueueUser | null {
    let bestMatch: QueueUser | null = null;
    let smallestDiff = Infinity;
    for (const otherUser of queue) {
      // Skip if the user has already been matched or if self
      if (matchedUsers.has(otherUser.username) || otherUser.username === user.username) {
        continue;
      }

      // If either user has no avg solve time, match with them
      if (user.avg_solve_time === 0 || otherUser.avg_solve_time === 0) {
        return otherUser;
      }

      // Check if the time difference is within the max time difference
      const timeDiff = Math.abs(otherUser.avg_solve_time - user.avg_solve_time);
      if (timeDiff > maxTimeDiff) {
        continue;
      }

      // If the time difference is the smallest, set as best match
      if (timeDiff < smallestDiff) {
        bestMatch = otherUser;
        smallestDiff = timeDiff;
      }
    }
    return bestMatch;
  }

  cleanup() {
    clearInterval(this.intervalId);
    this.queues.clear();
    this.removeAllListeners();
  }
}