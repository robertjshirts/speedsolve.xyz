import { MultiManager } from "../multi_manager.ts";
import { MockWebSocket, MockWebSocketOptions } from "./mock_websocket.ts";

const wsOptions: MockWebSocketOptions = {
  enableLogging: false,
  enableMessageTracking: false,
}

// Simulates a complete solving session for two users
async function simulateMultiSolveSession(
  manager: MultiManager, 
  username1: string, 
  username2: string, 
  cubeType: string = "3x3"
): Promise<void> {
  const ws1 = new MockWebSocket(wsOptions);
  const ws2 = new MockWebSocket(wsOptions);

  // Setup connections
  ws1.simulateOpen();
  ws2.simulateOpen();
  await Promise.resolve();

  manager.addConnection(username1, ws1 as any);
  manager.addConnection(username2, ws2 as any);

  // Start queueing
  ws1.simulateMessage(JSON.stringify({
    type: "start_q",
    payload: { cube_type: cubeType },
  }));
  ws2.simulateMessage(JSON.stringify({
    type: "start_q",
    payload: { cube_type: cubeType },
  }));

  // Exchange WebRTC signals
  ws2.simulateMessage(JSON.stringify({
    type: "rtc_offer",
    payload: { offer: "offer" },
  }));
  
  ws1.simulateMessage(JSON.stringify({
    type: "rtc_answer",
    payload: { answer: "answer" },
  }));

  // Exchange candidates
  for (let i = 0; i < 2; i++) {
    ws2.simulateMessage(JSON.stringify({
      type: "rtc_candidate",
      payload: { candidate: `candidate${i}` },
    }));
    ws1.simulateMessage(JSON.stringify({
      type: "rtc_candidate",
      payload: { candidate: `candidate${i}` },
    }));
  }

  // Mark connection as ready
  ws2.simulateMessage(JSON.stringify({ type: "rtc_connected" }));
  ws1.simulateMessage(JSON.stringify({ type: "rtc_connected" }));

  // Complete scrambling phase
  ws1.simulateMessage(JSON.stringify({ type: "finish_scramble" }));
  ws2.simulateMessage(JSON.stringify({ type: "finish_scramble" }));
  await Promise.resolve();

  // Start and complete countdown
  ws1.simulateMessage(JSON.stringify({ type: "start_countdown" }));
  ws2.simulateMessage(JSON.stringify({ type: "start_countdown" }));

  // Simulate solving
  const solveTime = 10000
  
  ws1.simulateMessage(JSON.stringify({
    type: "finish_solve",
    payload: { time: solveTime },
  }));

  ws2.simulateMessage(JSON.stringify({
    type: "finish_solve",
    payload: { time: solveTime },
  }));
}

// Main stress test function
async function runStressTest(
  numPairs: number,
  concurrentPairs: number = 5,
) {
  const manager = new MultiManager(true);
  const startTime = Date.now();
  let numResults = 0;
  let avgTime = 0;

  try {
    // Process pairs in batches
    for (let i = 0; i < numPairs; i += concurrentPairs) {
      const batch = [];
      const batchSize = Math.min(concurrentPairs, numPairs - i);

      for (let j = 0; j < batchSize; j++) {
        const pairIndex = i + j;
        batch.push(
          simulateMultiSolveSession(
            manager,
            `user${pairIndex * 2}`,
            `user${pairIndex * 2 + 1}`
          ).then(() => {
            const time = Date.now() - startTime;
            numResults++;
            avgTime = avgTime + (time - avgTime) / numResults;
            return true;
          }).catch(error => {
            console.error(`Error in pair ${pairIndex}:`, error);
            Deno.exit(1);
          })
        );
      }

      // Wait for batch to complete
      await Promise.all(batch);

      // Log progress
      console.log(`Completed ${i + batchSize}/${numPairs} pairs`);
      
      // Wait before starting next batch
      if (i + batchSize < numPairs) {
        await Promise.resolve();
      }
    }

    console.log('\nStress Test Results:');
    console.log(`Total pairs: ${numPairs}`);
    console.log(`Completed pairs: ${numResults}`);
    console.log(`Average time per pair: ${avgTime.toFixed(2)}ms`);

  } finally {
    manager.cleanup();
  }
}

// Example usage
Deno.test("Multi solve stress test", async () => {
  await runStressTest(
    100000,      // Total number of pairs to test
    10000,       // Number of concurrent pairs
  );
});
