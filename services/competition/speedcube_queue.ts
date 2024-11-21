import { EventEmitter } from "node:events";
import type { CubeType } from "./types.ts";
import { logger } from "./logger.ts";

export interface QueueUser {
  username: string;
  avg_solve_time: number;
  queued_at: number;
}

export interface QueueMatch {
  user: string;
  match: string;
  cube_type: CubeType;
  max_queue_time: number;
}

export class SpeedcubeQueue extends EventEmitter {
  private queues: Map<CubeType, Set<QueueUser>> = new Map();
  private readonly TIME_DIFFS = [
    { maxWaitTime: 10000, maxDiff: 5000 }, // 0s - 10s, 5s max diff (lv1)
    { maxWaitTime: 20000, maxDiff: 10000 }, // 10s - 20s, 10s max diff (lv2)
    { maxWaitTime: Infinity, maxDiff: Infinity }, // 20s - inf, no max diff (lv3)
  ];
  private readonly CHECK_INTERVAL_MS = 2500;
  private intervalId: number;

  constructor() {
    super();
    this.queues.set("3x3", new Set());
    this.intervalId = setInterval(() => {
      this.findMatches("3x3");
    }, this.CHECK_INTERVAL_MS);
    logger.info("SpeedcubeQueue initialized", { 
      checkInterval: this.CHECK_INTERVAL_MS,
      timeDiffLevels: this.TIME_DIFFS.length
    });
  }

  // Return a copy of the queue as an array
  getQueue(cube_type: CubeType): QueueUser[] {
    return Array.from(this.queues.get(cube_type)!);
  }

  getQueueLength(cube_type: CubeType): number {
    return this.queues.get(cube_type)!.size;
  }

  addToQueue(username: string, avg_solve_time: number, cube_type: CubeType) {
    const queue = this.queues.get(cube_type)!;

    // Remove existing user if present
    const existingUser = Array.from(queue).find(
      (user) => user.username === username,
    );
    if (existingUser) {
      logger.debug("Removing existing user from queue", { 
        username,
        cubeType: cube_type,
        previousQueueTime: Date.now() - existingUser.queued_at
      });
      queue.delete(existingUser);
    }

    const user: QueueUser = {
      username,
      avg_solve_time,
      queued_at: Date.now(),
    };

    logger.info("User added to queue", { 
      username,
      cubeType: cube_type,
      avgSolveTime: avg_solve_time
    });

    // Try to find a match for the user immediately
    const match = this.findBestMatch(user, queue, new Set(), this.getMaxTimeDiff(0));
    if (match) {
      this.createMatch(user.username, match.username, cube_type, 0);
      return;
    }

    // Add to queue (Sets maintain insertion order)
    queue.add(user);
    logger.debug("Queue state updated", { 
      cubeType: cube_type,
      queueSize: queue.size
    });
  }

  removeFromQueue(username: string, cube_type: CubeType) {
    const queue = this.queues.get(cube_type)!;
    const userToRemove = Array.from(queue).find(
      (user) => user.username === username,
    );
    if (userToRemove) {
      queue.delete(userToRemove);
      logger.info("User removed from queue", { 
        username,
        cubeType: cube_type,
        queueTime: Date.now() - userToRemove.queued_at
      });
    }
  }

  // Find matches for a cube type
  private findMatches(cube_type: CubeType) {
    const queue = this.queues.get(cube_type)!;
    if (queue.size < 2) {
      return;
    }

    logger.debug("Starting match finding process", { 
      cubeType: cube_type,
      queueSize: queue.size
    });

    const matchedUsers: Set<string> = new Set();
    for (const user of queue) {
      if (matchedUsers.has(user.username)) {
        continue;
      }

      const waitTime = Date.now() - user.queued_at;
      const maxTimeDiff = this.getMaxTimeDiff(waitTime);

      logger.debug("Searching for match", { 
        username: user.username,
        waitTime,
        maxTimeDiff,
        avgSolveTime: user.avg_solve_time
      });

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
  private createMatch(
    user: string,
    match: string,
    cube_type: CubeType,
    max_queue_time: number,
  ) {
    this.removeFromQueue(user, cube_type);
    this.removeFromQueue(match, cube_type);
    const matchResult: QueueMatch = {
      user,
      match,
      cube_type,
      max_queue_time,
    };
    this.emit("match", matchResult);
    logger.info("Match created", { 
      user,
      match,
      cubeType: cube_type,
      maxQueueTime: max_queue_time
    });
  }

  private getMaxTimeDiff(waitTime: number): number {
    for (const diff of this.TIME_DIFFS) {
      if (waitTime < diff.maxWaitTime) {
        return diff.maxDiff;
      }
    }
    return Infinity;
  }

  // Find the best match for a user
  private findBestMatch(
    user: QueueUser,
    queue: Set<QueueUser>,
    matchedUsers: Set<string>,
    maxTimeDiff: number,
  ): QueueUser | null {
    let bestMatch: QueueUser | null = null;
    let smallestDiff = Infinity;
    for (const otherUser of queue) {
      // Skip if the user has already been matched or if self
      if (
        matchedUsers.has(otherUser.username) ||
        otherUser.username === user.username
      ) {
        continue;
      }

      // If either user has no avg solve time, match with them
      if (user.avg_solve_time === 0 || otherUser.avg_solve_time === 0) {
        logger.debug("Found match with no average solve time", {
          user: user.username,
          match: otherUser.username
        });
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

    if (bestMatch) {
      logger.debug("Found best match", {
        user: user.username,
        match: bestMatch.username,
        timeDifference: smallestDiff
      });
    }

    return bestMatch;
  }

  cleanup() {
    clearInterval(this.intervalId);
    this.queues.clear();
    this.removeAllListeners();
    logger.info("SpeedcubeQueue cleaned up");
  }
}
