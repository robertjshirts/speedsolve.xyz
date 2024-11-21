import { MultiManager } from "../multi_manager.ts";
import { MockWebSocket } from "./mock_websocket.ts";
import {
  assert,
  assertEquals,
  assertExists,
  assertArrayIncludes,
} from "jsr:@std/assert";
import { FakeTime } from "jsr:@std/testing/time";

const mockCubeType = "3x3";
const username1 = "test1";
const username2 = "test2";

Deno.test("Regular multi solve", async (t) => {
  const time = new FakeTime();
  const manager = new MultiManager(true);

  const ws1 = new MockWebSocket();
  const ws2 = new MockWebSocket();

  try {
    await t.step("add connections", () => {
      ws1.simulateOpen();
      ws2.simulateOpen();

      // deno-lint-ignore no-explicit-any
      manager.addConnection(username1, (ws1 as any));
      // deno-lint-ignore no-explicit-any
      manager.addConnection(username2, (ws2 as any));

      // Assert
      assertEquals(
        manager.getActiveSessions().size,
        0,
        "no session should be created yet",
      );
    });

    await t.step("user1 starts queueing", async () => {
      ws1.simulateMessage(JSON.stringify({
        type: "start_q",
        payload: { cube_type: mockCubeType },
      }));
      await Promise.resolve();

      // Assert
      assertExists(manager.getActiveSessions().get(username1));
      assertEquals(manager.getActiveSessions().size, 1);
      assertEquals(manager.getActiveSessions().get(username1)!.state, "queuing");
      assert(manager.getQueueStatus(username1));

      const queueMessage1 = JSON.parse(ws1.sentMessages[0]);
      assertEquals(queueMessage1.type, "state_change");
      assertEquals(queueMessage1.payload.state, "queuing");
    });

    await t.step("user2 starts queueing (instant match)", async () => {
      ws2.simulateMessage(JSON.stringify({
        type: "start_q",
        payload: { cube_type: mockCubeType },
      }));
      await Promise.resolve();

      // Assert
      const session1 = manager.getActiveSessions().get(username1);
      const session2 = manager.getActiveSessions().get(username2);
      assertEquals(session1, session2, "both sessions should be the same");
      assertEquals(session1!.state, "connecting");
      assertArrayIncludes(
        Array.from(session1!.participants),
        [username1, username2],
      );

      const matchMessage1 = JSON.parse(ws1.sentMessages[0]);
      const matchMessage2 = JSON.parse(ws2.sentMessages[0]);
      assertEquals(matchMessage1.type, "state_change");
      assertEquals(matchMessage2.type, "state_change");
      assertEquals(matchMessage1.payload.state, "connecting");
      assertEquals(matchMessage2.payload.state, "connecting");
      assertEquals(matchMessage1.payload.isOfferer, false);
      assertEquals(matchMessage2.payload.isOfferer, true);

      // Look back one message to check if user2 was notified of queue start
      const queueMessage2 = JSON.parse(ws2.sentMessages[1]);
      assertEquals(queueMessage2.type, "state_change");
      assertEquals(queueMessage2.payload.state, "queuing");
    });

    await t.step("chat messages get forwarded", async () => {
      ws1.simulateMessage(JSON.stringify({
        type: "chat_message",
        payload: { message: "hello" },
      }));

      ws2.simulateMessage(JSON.stringify({
        type: "chat_message",
        payload: { message: "world" },
      }));
      await Promise.resolve();

      const chatMessage1 = JSON.parse(ws1.sentMessages[0]);
      const chatMessage2 = JSON.parse(ws2.sentMessages[0]);
      assertEquals(chatMessage1.type, "chat_message");
      assertEquals(chatMessage1.payload.message, "world");
      assertEquals(chatMessage2.type, "chat_message");
      assertEquals(chatMessage2.payload.message, "hello");
    });

    // User 2 is the offerer
    await t.step("establish webrtc connection and exchange candidates", async (t) => {
      // First step: offerer sends webrtc offer
      await t.step("user2 sends offer", async () => {
        ws2.simulateMessage(JSON.stringify({
          type: "rtc_offer",
          payload: {
            offer: "offer",
          },
        }));
        await Promise.resolve();

        const offerMessage = JSON.parse(ws1.sentMessages[0]);
        assertEquals(offerMessage.type, "rtc_offer");
        assertEquals(offerMessage.payload.offer, "offer");
      });

      // Second step: answerer sends webrtc answer
      await t.step("user1 sends answer", async () => {
        ws1.simulateMessage(JSON.stringify({
          type: "rtc_answer",
          payload: {
            answer: "answer",
          },
        }));
        await Promise.resolve();

        const answerMessage = JSON.parse(ws2.sentMessages[0]);
        assertEquals(answerMessage.type, "rtc_answer");
        assertEquals(answerMessage.payload.answer, "answer");
      });
      
      // Third step: peers send candidates
      for (const step of ['first', 'second']) {
        await t.step(`user2 sends ${step} candidate`, async () => {
          ws2.simulateMessage(JSON.stringify({
            type: "rtc_candidate",
            payload: {
              candidate: `candidate${step}`,
            },
          }));
          await Promise.resolve();

          const candidateMessage = JSON.parse(ws1.sentMessages[0]);
          assertEquals(candidateMessage.type, "rtc_candidate");
          assertEquals(candidateMessage.payload.candidate, `candidate${step}`);
        });

        await t.step(`user1 sends ${step} candidate`, async () => {
          ws1.simulateMessage(JSON.stringify({
            type: "rtc_candidate",
            payload: {
              candidate: `candidate${step}`,
            },
          }));
          await Promise.resolve();

          const candidateMessage = JSON.parse(ws2.sentMessages[0]);
          assertEquals(candidateMessage.type, "rtc_candidate");
          assertEquals(candidateMessage.payload.candidate, `candidate${step}`);
        });
      }

      // Fourth step: peers send connection ready
      await t.step("user2 sends connection ready", async () => {
        ws2.simulateMessage(JSON.stringify({
          type: "rtc_connected",
        }));
        await Promise.resolve();

        const session = manager.getActiveSessions().get(username1);
        assertEquals(session!.state, "connecting");
      });

      await t.step("user1 sends connection ready", async () => {
        ws1.simulateMessage(JSON.stringify({
          type: "rtc_connected",
        }));
        await Promise.resolve();

        const session = manager.getActiveSessions().get(username1);
        assertEquals(session!.state, "scrambling");
      });
    });

    await t.step("start scrambling", () => {
      const session = manager.getActiveSessions().get(username1)
      assertEquals(session!.state, "scrambling");

      const scrambleMessage1 = JSON.parse(ws1.sentMessages[0]);
      const scrambleMessage2 = JSON.parse(ws2.sentMessages[0]);
      assertEquals(scrambleMessage1, scrambleMessage2, "both users should receive identical state change messages");
      assertEquals(scrambleMessage1.type, "state_change");
      assertEquals(scrambleMessage1.payload.state, "scrambling");
      assertExists(scrambleMessage1.payload.scramble);
    });

    await t.step("user1 finishes scrambling", async () => {
      ws1.simulateMessage(JSON.stringify({
        type: "finish_scramble",
      }));
      await Promise.resolve();

      const session = manager.getActiveSessions().get(username1);
      assertEquals(session!.state, "scrambling");

      const scrambleFinishedMessage = JSON.parse(ws2.sentMessages[0]);
      assertEquals(scrambleFinishedMessage.type, "peer_ready");
    });

    await t.step("user2 finishes scrambling", async () => {
      ws2.simulateMessage(JSON.stringify({
        type: "finish_scramble",
      }));
      await Promise.resolve();

      const session = manager.getActiveSessions().get(username1);
      assertEquals(session!.state, "countdown");

      const scrambleFinishedMessage1 = JSON.parse(ws1.sentMessages[0]);
      const scrambleFinishedMessage2 = JSON.parse(ws2.sentMessages[0]);
      assertEquals(scrambleFinishedMessage1, scrambleFinishedMessage2, "both users should receive identical state change messages");
      assertEquals(scrambleFinishedMessage1.type, "state_change");
      assertEquals(scrambleFinishedMessage1.payload.state, "countdown");

      const readyMessage1 = JSON.parse(ws1.sentMessages[1]);
      assertEquals(readyMessage1.type, "peer_ready");
      assertEquals(readyMessage1.payload.peer, username2);
    });

    await t.step("user1 starts countdown", async () => {
      ws1.simulateMessage(JSON.stringify({
        type: "start_countdown",
      }));
      await Promise.resolve();

      const session = manager.getActiveSessions().get(username1);
      assertEquals(session!.state, "countdown");

      const readyMessage = JSON.parse(ws2.sentMessages[0]);
      assertEquals(readyMessage.type, "peer_ready");
      assertEquals(readyMessage.payload.peer, username1);
    });

    await t.step("user2 starts countdown", async () => {
      ws2.simulateMessage(JSON.stringify({
        type: "start_countdown",
      }));
      await Promise.resolve();

      const countdownStartedMessage1 = JSON.parse(ws1.sentMessages[0]);
      const countdownStartedMessage2 = JSON.parse(ws2.sentMessages[0]);
      assertEquals(countdownStartedMessage1, countdownStartedMessage2, "both users should receive identical countdown started messages");
      assertEquals(countdownStartedMessage1.type, "countdown_started");

      const readyMessage1 = JSON.parse(ws1.sentMessages[1]);
      assertEquals(readyMessage1.type, "peer_ready");
      assertEquals(readyMessage1.payload.peer, username2);
    });

    await t.step("user1 cancels countdown", async () => {
      const session = manager.getActiveSessions().get(username1);
      time.tick(1500);

      ws1.simulateMessage(JSON.stringify({
        type: "cancel_countdown",
      }));
      await Promise.resolve();

      assertEquals(session!.state, "countdown");

      const unreadyMessage = JSON.parse(ws2.sentMessages[1]);
      assertEquals(unreadyMessage.type, "peer_unready");
      assertEquals(unreadyMessage.payload.peer, username1);

      const cancelMessage1 = JSON.parse(ws1.sentMessages[0]);
      const cancelMessage2 = JSON.parse(ws2.sentMessages[0]);
      assertEquals(cancelMessage1, cancelMessage2, "both users should receive identical countdown canceled messages");
      assertEquals(cancelMessage1.type, "countdown_canceled");
    });

    await t.step("user1 (re)starts countdown", async () => {
      ws1.simulateMessage(JSON.stringify({
        type: "start_countdown",
      }));
      await Promise.resolve();

      const countdownStartedMessage1 = JSON.parse(ws1.sentMessages[0]);
      const countdownStartedMessage2 = JSON.parse(ws2.sentMessages[0]);
      assertEquals(countdownStartedMessage1, countdownStartedMessage2, "both users should receive identical countdown started messages");
      assertEquals(countdownStartedMessage1.type, "countdown_started");

      const readyMessage2 = JSON.parse(ws2.sentMessages[1]);
      assertEquals(readyMessage2.type, "peer_ready");
      assertEquals(readyMessage2.payload.peer, username1);
    });

    await t.step("countdown ends", () => {
      time.tick(3100);

      const session = manager.getActiveSessions().get(username1);
      assertEquals(session!.state, "solving");

      const stateChangeMessage1 = JSON.parse(ws1.sentMessages[0]);
      const stateChangeMessage2 = JSON.parse(ws2.sentMessages[0]);
      assertEquals(stateChangeMessage1, stateChangeMessage2, "both users should receive identical state change messages");
      assertEquals(stateChangeMessage1.type, "state_change");
      assertEquals(stateChangeMessage1.payload.state, "solving");
      assertExists(stateChangeMessage1.payload.start_time);
    });

    await t.step("user1 finishes solve", async () => {
      time.tick(10000);
      ws1.simulateMessage(JSON.stringify({
        type: "finish_solve",
        payload: {
          time: 10000,
        }
      }));
      await Promise.resolve();

      const session = manager.getActiveSessions().get(username1);
      assertEquals(session!.state, "solving");
      assertExists(session!.results[username1]);
      assertEquals(session!.results[username1]!.penalty, "none");
      assertEquals(session!.results[username1]!.time, 10000);

      const readyMessage = JSON.parse(ws2.sentMessages[0]);
      assertEquals(readyMessage.type, "peer_ready");
    });

    await t.step("user2 finishes solve", async () => {
      time.tick(1000);
      ws2.simulateMessage(JSON.stringify({
        type: "finish_solve",
        payload: {
          time: 11000,
        }
      }));
      await Promise.resolve();

      const session = manager.getActiveSessions().get(username1);
      assertEquals(session!.state, "results");

      const resultsMessage1 = JSON.parse(ws1.sentMessages[0]);
      const resultsMessage2 = JSON.parse(ws2.sentMessages[0]);
      assertEquals(resultsMessage1, resultsMessage2, "both users should receive identical results messages");
      assertEquals(resultsMessage1.type, "state_change");
      assertEquals(resultsMessage1.payload.state, "results");
      assertExists(resultsMessage1.payload.results);
      assertArrayIncludes(
        Object.keys(resultsMessage1.payload.results),
        [username1, username2],
      );
    });

    await t.step("user1 applies penalty", async () => {
      ws1.simulateMessage(JSON.stringify({
        type: "apply_penalty",
        payload: { penalty: "DNF" },
      }));
      await Promise.resolve();

      const session = manager.getActiveSessions().get(username1);
      assertEquals(session!.state, "results");
      assertEquals(session!.results[username1]!.penalty, "DNF");

      const resultsUpdateMessage1 = JSON.parse(ws1.sentMessages[0]);
      const resultsUpdateMessage2 = JSON.parse(ws2.sentMessages[0]);
      assertEquals(resultsUpdateMessage1, resultsUpdateMessage2, "both users should receive identical results update messages");
      assertEquals(resultsUpdateMessage1.type, "results_update");
      assertEquals(resultsUpdateMessage1.payload.results[username1].penalty, "DNF");
    });

    await t.step("user2 applies penalty", async () => {
      ws2.simulateMessage(JSON.stringify({
        type: "apply_penalty",
        payload: { penalty: "plus2" },
      }));
      await Promise.resolve();

      const session = manager.getActiveSessions().get(username1);
      assertEquals(session!.state, "results");
      assertEquals(session!.results[username2]!.penalty, "plus2");

      const resultsUpdateMessage1 = JSON.parse(ws1.sentMessages[0]);
      const resultsUpdateMessage2 = JSON.parse(ws2.sentMessages[0]);
      assertEquals(resultsUpdateMessage1, resultsUpdateMessage2, "both users should receive identical results update messages");
      assertEquals(resultsUpdateMessage1.type, "results_update");
      assertEquals(resultsUpdateMessage1.payload.results[username2].penalty, "plus2");
    });
  } finally {
    manager.cleanup();
    time.restore();
  }
});

Deno.test("User disconnects in scramble", async (t) => {
  const manager = new MultiManager(true);

  const ws1 = new MockWebSocket();
  const ws2 = new MockWebSocket();

  try {
    await t.step("setup match", async () => {
      // Connect both users
      ws1.simulateOpen();
      ws2.simulateOpen();

      // deno-lint-ignore no-explicit-any
      manager.addConnection(username1, (ws1 as any));
      // deno-lint-ignore no-explicit-any
      manager.addConnection(username2, (ws2 as any));

      // Start queueing for both users
      ws1.simulateMessage(JSON.stringify({
        type: "start_q",
        payload: { cube_type: mockCubeType },
      }));
      ws2.simulateMessage(JSON.stringify({
        type: "start_q",
        payload: { cube_type: mockCubeType },
      }));
      await Promise.resolve();

      // Exchange WebRTC connection messages
      ws2.simulateMessage(JSON.stringify({
        type: "rtc_offer",
        payload: { offer: "offer" },
      }));
      ws1.simulateMessage(JSON.stringify({
        type: "rtc_answer",
        payload: { answer: "answer" },
      }));
      ws2.simulateMessage(JSON.stringify({
        type: "rtc_candidate",
        payload: { candidate: "candidate" },
      }));
      ws1.simulateMessage(JSON.stringify({
        type: "rtc_candidate",
        payload: { candidate: "candidate" },
      }));
      ws2.simulateMessage(JSON.stringify({ type: "rtc_connected" }));
      ws1.simulateMessage(JSON.stringify({ type: "rtc_connected" }));
      await Promise.resolve();

      const session = manager.getActiveSessions().get(username1);
      assertEquals(session!.state, "scrambling");
    });

    await t.step("user1 disconnects during scramble", async () => {
      // Simulate WebSocket close for user1
      ws1.simulateClose();
      await Promise.resolve();

      // Verify session is cleaned up
      assertEquals(manager.getActiveSessions().size, 0, "session should be removed after disconnect");

      // Verify remaining user gets disconnection notification
      const disconnectMessage = JSON.parse(ws2.sentMessages[0]);
      assertEquals(disconnectMessage.type, "peer_disconnected");
      assertEquals(disconnectMessage.payload.peer, username1);
    });
  } finally {
    manager.cleanup();
  }
});