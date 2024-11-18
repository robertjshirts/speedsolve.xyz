// speedcube_queue_test.ts

import {
  assertEquals,
  assertArrayIncludes,
} from "jsr:@std/assert";
import { FakeTime } from "jsr:@std/testing/time";
import { SpeedcubeQueue, QueueMatch } from "../speedcube_queue.ts";

function waitForMatch(queue: SpeedcubeQueue): Promise<QueueMatch> {
  return new Promise((resolve) => {
    queue.on("match", (match: QueueMatch) => {
      resolve(match);
    });
  });
}

Deno.test("0-9999ms wait | 0-4999ms diff | Level 1", async (t) => {
  const time = new FakeTime();
  const queue = new SpeedcubeQueue();
  const testData = {
    user1: "user1",
    user2: "user2",
    cubeType: "3x3" as const,
  };
  let matchPromise: Promise<QueueMatch> | undefined;

  try {

    await t.step("special case: 2 users with 0ms solve time", async () => {
      // add users to queue
      matchPromise = waitForMatch(queue);
      queue.addToQueue(testData.user1, 0, testData.cubeType);
      queue.addToQueue(testData.user2, 0, testData.cubeType);

      // wait for match
      const match = await matchPromise!;
      assertArrayIncludes(
        [match.user1, match.user2],
        [testData.user1, testData.user2],
        "Users should be matched immediately",
      );
      assertEquals(
        queue.getQueueLength(testData.cubeType),
        0,
        "Queue should be empty after match is made",
      );
    });

    await t.step("special case: 1 user with 0ms solve time", async () => {
      // add users to queue
      matchPromise = waitForMatch(queue);
      queue.addToQueue(testData.user1, 0, testData.cubeType);
      queue.addToQueue(testData.user2, 1, testData.cubeType);

      // wait for match
      const match = await matchPromise!;
      assertArrayIncludes(
        [match.user1, match.user2],
        [testData.user1, testData.user2],
        "Users should be matched immediately",
      );
      assertEquals(
        queue.getQueueLength(testData.cubeType),
        0,
        "Queue should be empty after match is made",
      );
    });


    await t.step("special case: identical solve times", async () => {
      // add users to queue
      matchPromise = waitForMatch(queue);
      queue.addToQueue(testData.user1, 1, testData.cubeType);
      queue.addToQueue(testData.user2, 1, testData.cubeType);

      // wait for match
      const match = await matchPromise!;
      assertArrayIncludes(
        [match.user1, match.user2],
        [testData.user1, testData.user2],
        "Users should be matched immediately",
      );
      assertEquals(
        queue.getQueueLength(testData.cubeType),
        0,
        "Queue should be empty after match is made",
      );
    });

    await t.step("lower bound (1ms diff)", async () => {
      // add users to queue
      matchPromise = waitForMatch(queue);
      queue.addToQueue(testData.user1, 1, testData.cubeType);
      queue.addToQueue(testData.user2, 2, testData.cubeType);

      // wait for match
      const match = await matchPromise!;
      assertArrayIncludes(
        [match.user1, match.user2],
        [testData.user1, testData.user2],
        "Users should be matched immediately",
      );
      assertEquals(
        queue.getQueueLength(testData.cubeType),
        0,
        "Queue should be empty after match is made",
      );
    });


    await t.step("upper bound (5000ms diff)", async () => {
      // add users to queue
      matchPromise = waitForMatch(queue);
      queue.addToQueue(testData.user1, 1, testData.cubeType);
      queue.addToQueue(testData.user2, 5001, testData.cubeType);

      // wait for match
      const match = await matchPromise!;
      assertArrayIncludes(
        [match.user1, match.user2],
        [testData.user1, testData.user2],
        "Users should be matched immediately",
      );
      assertEquals(
        queue.getQueueLength(testData.cubeType),
        0,
        "Queue should be empty after match is made",
      );
    });
  } finally {
    // Cleanup
    queue.cleanup();
    time.restore();
  }
});

Deno.test("10000-19999ms wait | 5001-10000ms diff | Level 2", async (t) => {
  const time = new FakeTime();
  const queue = new SpeedcubeQueue();
  const testData = {
    user1: "user1",
    user2: "user2",
    cubeType: "3x3" as const,
  };
  let matchPromise: Promise<QueueMatch> | undefined;

  try {

    await t.step("lower bound (5001ms diff)", async () => {
      // add users to queue
      matchPromise = waitForMatch(queue);
      queue.addToQueue(testData.user1, 1, testData.cubeType);
      queue.addToQueue(testData.user2, 5002, testData.cubeType);

      assertEquals(
        queue.getQueueLength(testData.cubeType),
        2,
        "Queue should have two users before match is made/before tick",
      );

      // tick halfway to threshold
      time.tick(5000)

      // allow event loop to process
      await Promise.resolve();

      // check that no match was made
      let isMatchMade = false;
      matchPromise!.then(() => {
        isMatchMade = true;
      });
      assertEquals(
        isMatchMade,
        false,
        "No match should be made before 10 seconds have passed",
      );
      assertEquals(
        queue.getQueueLength(testData.cubeType),
        2,
        "Queue should have two users before match is made",
      );

      // tick the rest of the way and ensure match was made
      time.tick(5000);

      // wait for match
      const match = await matchPromise!;

      assertArrayIncludes(
        [match.user1, match.user2],
        [testData.user1, testData.user2],
        "Users should be matched after 10 seconds have passed",
      );
      assertEquals(
        queue.getQueueLength(testData.cubeType),
        0,
        "Queue should be empty after match is made",
      );
    });

    await t.step("upper bound (10000ms diff)", async () => {
      // add users to queue
      matchPromise = waitForMatch(queue);
      queue.addToQueue(testData.user1, 1, testData.cubeType);
      queue.addToQueue(testData.user2, 10001, testData.cubeType);
      assertEquals(
        queue.getQueueLength(testData.cubeType),
        2,
        "Queue should have two users before match is made/before tick",
      );

      // tick halfway to threshold  
      time.tick(5000)

      // allow event loop to process
      await Promise.resolve();

      // check that no match was made
      let isMatchMade = false;
      matchPromise!.then(() => {
        isMatchMade = true;
      });
      assertEquals(
        isMatchMade,
        false,
        "No match should be made before 10 seconds have passed",
      );
      assertEquals(
        queue.getQueueLength(testData.cubeType),
        2,
        "Queue should have two users before match is made",
      );

      // tick the rest of the way and ensure match was made
      time.tick(5000);

      // wait for match
      const match = await matchPromise!;
      assertArrayIncludes(
        [match.user1, match.user2],
        [testData.user1, testData.user2],
        "Users should be matched after 10 seconds have passed",
      );
      assertEquals(
        queue.getQueueLength(testData.cubeType),
        0,
        "Queue should be empty after match is made",
      );
    });
  } finally {
    queue.cleanup();
    time.restore();
  }
});

Deno.test("20000-Infinity ms wait | 10001-Infinity ms diff | Level 3", async (t) => {
  const time = new FakeTime();
  const queue = new SpeedcubeQueue();
  const testData = {
    user1: "user1",
    user2: "user2",
    cubeType: "3x3" as const,
  };
  let matchPromise: Promise<QueueMatch> | undefined;

  try {
    await t.step("lower bound (10001ms diff)", async () => {
      matchPromise = waitForMatch(queue);
      queue.addToQueue(testData.user1, 1, testData.cubeType);
      queue.addToQueue(testData.user2, 10002, testData.cubeType);
      assertEquals(
        queue.getQueueLength(testData.cubeType),
        2,
        "Queue should have two users before match is made/before tick",
      );

      // tick halfway to threshold
      time.tick(10000);

      // allow event loop to process
      await Promise.resolve();

      // check that no match was made
      let isMatchMade = false;
      matchPromise!.then(() => {
        isMatchMade = true;
      });
      assertEquals(
        isMatchMade, 
        false,
        "No match should be made before 20 seconds have passed",
      );
      assertEquals(
        queue.getQueueLength(testData.cubeType),
        2,
        "Queue should have two users before match is made",
      );

      // tick the rest of the way and ensure match was made
      time.tick(10000);

      // wait for match
      const match = await matchPromise!;
      assertArrayIncludes(
        [match.user1, match.user2],
        [testData.user1, testData.user2],
        "Users should be matched after 20 seconds have passed",
      );
      assertEquals(
        queue.getQueueLength(testData.cubeType),
        0,
        "Queue should be empty after match is made",
      );
    });

    await t.step("upper bound (MAX_SAFE_INTEGER diff)", async () => {
      matchPromise = waitForMatch(queue);
      queue.addToQueue(testData.user1, 1, testData.cubeType);
      queue.addToQueue(testData.user2, Number.MAX_SAFE_INTEGER, testData.cubeType);
      assertEquals(
        queue.getQueueLength(testData.cubeType),
        2,
        "Queue should have two users before match is made/before tick",
      );

      // tick halfway to threshold
      time.tick(10000);

      // allow event loop to process
      await Promise.resolve();

      // check that no match was made
      let isMatchMade = false;
      matchPromise!.then(() => {
        isMatchMade = true;
      });
      assertEquals(
        isMatchMade,
        false,
        "No match should be made before 20 seconds have passed",
      );
      assertEquals(
        queue.getQueueLength(testData.cubeType),
        2,
        "Queue should have two users before match is made",
      );

      // tick the rest of the way and ensure match was made
      time.tick(10000);

      // wait for match
      const match = await matchPromise!;
      assertArrayIncludes(
        [match.user1, match.user2],
        [testData.user1, testData.user2],
        "Users should be matched after 20 seconds have passed",
      );
      assertEquals(
        queue.getQueueLength(testData.cubeType),
        0,
        "Queue should be empty after match is made",
      );
    });
  } finally {
    queue.cleanup();
    time.restore();
  }
});