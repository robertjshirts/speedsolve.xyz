import { MultiManager } from "../multi_manager_new.ts";
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
  const manager = new MultiManager(true);
  const time = new FakeTime();

  const ws1 = new MockWebSocket();
  const ws2 = new MockWebSocket();

  try {
    await t.step("add connections", () => {
      ws1.simulateOpen();
      ws2.simulateOpen();

      manager.addConnection(username1, (ws1 as any));
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
      assertEquals(
        queueMessage1.type,
        "state_change",
        "User1 should be notified of queue start",
      );
      assertEquals(
        queueMessage1.payload.state,
        "queuing",
        "User1 should be notified with the correct state",
      );
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
      assertEquals(
        session1!.state,
        "connecting",
        "session should be in connecting state",
      );
      assertArrayIncludes(
        Array.from(session1!.participants),
        [username1, username2],
        "both participants should be in the session",
      );

      const matchMessage1 = JSON.parse(ws1.sentMessages[0]);
      assertEquals(
        matchMessage1.type,
        "state_change",
        "User1 should be notified of match found",
      );
      assertEquals(
        matchMessage1.payload.state,
        "connecting",
        "User1 should be notified with the correct state",
      );
      assertEquals(
        matchMessage1.payload.isOfferer,
        false,
        "User1 should be notified as the answerer",
      );

      const matchMessage2 = JSON.parse(ws2.sentMessages[0]);
      assertEquals(
        matchMessage2.type,
        "state_change",
        "User2 should be notified of match found",
      );
      assertEquals(
        matchMessage2.payload.isOfferer,
        true,
        "User2 should be notified as the offerer",
      );

      // Look back one message to check if user2 was notified of queue start
      const queueMessage2 = JSON.parse(ws2.sentMessages[1]);
      assertEquals(
        queueMessage2.type,
        "state_change",
        "User2 should be notified of queue start",
      );
      assertEquals(
        queueMessage2.payload.state,
        "queuing",
        "User2 should be notified with the correct state",
      );
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

        // ensure user1 received the offer
        const offerMessage = JSON.parse(ws1.sentMessages[0]);
        assertEquals(
          offerMessage.type,
          "rtc_offer",
          "user1 should receive offer from user2",
        );
        assertEquals(
          offerMessage.payload.offer,
          "offer",
          "user1 should receive the same payload as sent",
        );
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

        // ensure user2 received the answer
        const answerMessage = JSON.parse(ws2.sentMessages[0]);
        assertEquals(
          answerMessage.type,
          "rtc_answer",
          "user2 should receive answer from user1",
        );
        assertEquals(
          answerMessage.payload.answer,
          "answer",
          "user2 should receive the same payload as sent",
        );
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

          // ensure user1 received the candidate
          const candidateMessage = JSON.parse(ws1.sentMessages[0]);
          assertEquals(
          candidateMessage.type,
            "rtc_candidate",
            "user1 should receive candidate from user2",
          );
          assertEquals(
            candidateMessage.payload.candidate,
            `candidate${step}`,
            "user1 should receive the same payload as sent",
          );
        });

        await t.step(`user1 sends ${step} candidate`, async () => {
          ws1.simulateMessage(JSON.stringify({
            type: "rtc_candidate",
            payload: {
              candidate: `candidate${step}`,
            },
          }));
          await Promise.resolve();

          // ensure user2 received the candidate
          const candidateMessage = JSON.parse(ws2.sentMessages[0]);
          assertEquals(
            candidateMessage.type,
            "rtc_candidate",
            "user2 should receive candidate from user1",
          );
          assertEquals(
            candidateMessage.payload.candidate,
            `candidate${step}`,
            "user2 should receive the same payload as sent",
          );
        });
      }

      // Fourth step: peers send connection ready
      await t.step("user2 sends connection ready", async () => {
        ws2.simulateMessage(JSON.stringify({
          type: "rtc_connected",
        }));
        await Promise.resolve();

        // assert match not started
        const session = manager.getActiveSessions().get(username1);
        assertEquals(session!.state, "connecting");
      });

      await t.step("user1 sends connection ready", async () => {
        ws1.simulateMessage(JSON.stringify({
          type: "rtc_connected",
        }));
        await Promise.resolve();

        // assert match started (and therefore message is processed)
        const session = manager.getActiveSessions().get(username1);
        assertEquals(session!.state, "scrambling");
      });
    });

    await t.step("start scrambling", () => {
      // assert match started
      const session = manager.getActiveSessions().get(username1)
      assertEquals(session!.state, "scrambling");

      // assert messages are sent
      const scrambleMessage1 = JSON.parse(ws1.sentMessages[0]);
      assertEquals(
        scrambleMessage1.type,
        "state_change",
        "user1 should be notified of state change",
      );
      assertEquals(
        scrambleMessage1.payload.state,
        "scrambling",
        "user1 should be notified with the correct state",
      );
      assertExists(scrambleMessage1.payload.scramble, "user1 should receive scramble");

      const scrambleMessage2 = JSON.parse(ws2.sentMessages[0]);
      assertEquals(
        scrambleMessage2.type,
        "state_change",
        "user2 should be notified of state change",
      );
      assertEquals(
        scrambleMessage2.payload.state,
        "scrambling",
        "user2 should be notified with the correct state",
      );
      assertExists(scrambleMessage2.payload.scramble, "user2 should receive scramble");
    });

    await t.step("user1 finishes scrambling", async () => {
      // simulate scramble finish
      ws1.simulateMessage(JSON.stringify({
        type: "finish_scramble",
      }));
      await Promise.resolve();

      // assert scrambling state
      const session = manager.getActiveSessions().get(username1);
      assertEquals(session!.state, "scrambling");

      // assert user2 is notified
      const scrambleFinishedMessage = JSON.parse(ws2.sentMessages[0]);
      assertEquals(
        scrambleFinishedMessage.type,
        "peer_ready",
        "user2 should be notified of peer readiness",
      );
    });

    await t.step("user2 finishes scrambling", async () => {
      // simulate scramble finish
      ws2.simulateMessage(JSON.stringify({
        type: "finish_scramble",
      }));
      await Promise.resolve();

      // assert countdown state
      const session = manager.getActiveSessions().get(username1);
      assertEquals(session!.state, "countdown");

      // assert user1 is notified
      const scrambleFinishedMessage = JSON.parse(ws1.sentMessages[0]);
      assertEquals(
        scrambleFinishedMessage.type,
        "state_change",
        "user1 should be notified of state change",
      );
      assertEquals(
        scrambleFinishedMessage.payload.state,
        "countdown",
        "user1 should be notified with the correct state",
      );

      // assert user2 is notified
      const scrambleFinishedMessage2 = JSON.parse(ws2.sentMessages[0]);
      assertEquals(
        scrambleFinishedMessage2.type,
        "state_change",
        "user2 should be notified of state change",
      );  
      assertEquals(
        scrambleFinishedMessage2.payload.state,
        "countdown",
        "user2 should be notified with the correct state",
      );
    });

    await t.step("user1 starts countdown", async () => {
      // simulate countdown start
      ws1.simulateMessage(JSON.stringify({
        type: "start_countdown",
      }));
      await Promise.resolve();

      // assert still in countdown state
      const session = manager.getActiveSessions().get(username1);
      assertEquals(session!.state, "countdown");

      // assert user2 is notified of peer readiness
      const readyMessage = JSON.parse(ws2.sentMessages[0]);
      assertEquals(
        readyMessage.type,
        "peer_ready",
        "user2 should be notified of peer readiness",
      );
      assertEquals(
        readyMessage.payload.peer,
        username1,
        "user2 should be notified which peer is ready",
      );
    });

    await t.step("user2 starts countdown", async () => {
      // simulate countdown start
      ws2.simulateMessage(JSON.stringify({
        type: "start_countdown",
      }));
      await Promise.resolve();

      // assert countdown started notification
      const countdownStartedMessage1 = JSON.parse(ws1.sentMessages[0]);
      assertEquals(
        countdownStartedMessage1.type,
        "countdown_started",
        "user1 should be notified countdown started",
      );

      const countdownStartedMessage2 = JSON.parse(ws2.sentMessages[0]);
      assertEquals(
        countdownStartedMessage2.type,
        "countdown_started",
        "user2 should be notified countdown started",
      );
    });

    await t.step("countdown cancellation", async () => {
      const session = manager.getActiveSessions().get(username1);

      // User1 cancels countdown
      ws1.simulateMessage(JSON.stringify({
        type: "cancel_countdown",
      }));
      await Promise.resolve();

      // assert still in countdown state
      assertEquals(session!.state, "countdown");

      // assert user2 is notified of peer unready
      const unreadyMessage = JSON.parse(ws2.sentMessages[1]);
      assertEquals(
        unreadyMessage.type,
        "peer_unready",
        "user2 should be notified of peer unready",
      );
      assertEquals(
        unreadyMessage.payload.peer,
        username1,
        "user2 should be notified which peer is unready",
      );

      // assert both users are notified countdown canceled
      const cancelMessage1 = JSON.parse(ws1.sentMessages[0]);
      assertEquals(
        cancelMessage1.type,
        "countdown_canceled",
        "user1 should be notified countdown canceled",
      );

      const cancelMessage2 = JSON.parse(ws2.sentMessages[0]);
      assertEquals(
        cancelMessage2.type,
        "countdown_canceled",
        "user2 should be notified countdown canceled",
      );
    });

  } finally {
    manager.cleanup();
  }
});
