import { FakeTime } from "jsr:@std/testing/time";
import { SoloManager } from "../solo_manager.ts";
import { MockWebSocket } from "./mock_websocket.ts";
import {
  assertEquals,
  assertExists,
} from "jsr:@std/assert";

const mockCubeType = "3x3";
const username = "test";

Deno.test("Regular solo solve", async (t) => {
  const time = new FakeTime();
  const manager = new SoloManager(true);
  const ws = new MockWebSocket();

  try {
    await t.step("add connection", () => {
      ws.simulateOpen();
      manager.addConnection(username, (ws as any));
      assertEquals(manager.getActiveSessions().size, 0);
    });

    await t.step("start session", async () => {
      ws.simulateMessage(JSON.stringify({
        type: "start_session",
        payload: { cube_type: mockCubeType },
      }));
      // await after every message sent to ensure the message is processed
      await Promise.resolve();

      // Assert manager state
      const sessions = manager.getActiveSessions();
      assertEquals(sessions.size, 1);
      const session = sessions.get(username);
      assertEquals(session?.state, "scrambling");

      // Assert websocket message
      const stateMessage = JSON.parse(ws.sentMessages[0]);
      assertEquals(stateMessage.type, "state_change");
      assertEquals(stateMessage.payload.state, "scrambling");
      assertEquals(stateMessage.payload.scramble.split(" ").length, 20);
    });

    await t.step("finish scramble", async () => {
      ws.simulateMessage(JSON.stringify({
        type: "finish_scramble",
      }));
      await Promise.resolve();

      // Assert manager state
      const sessions = manager.getActiveSessions();
      const session = sessions.get(username);
      assertEquals(session?.state, "solving");

      // Assert websocket message
      const stateMessage = JSON.parse(ws.sentMessages[0]);
      assertEquals(stateMessage.type, "state_change");
      assertEquals(stateMessage.payload.state, "solving");
      assertExists(stateMessage.payload.start_time);
    });

    await t.step("finish solve", async () => {
      const solveTime = 10000;
      time.tick(10000);
      ws.simulateMessage(JSON.stringify({
        type: "finish_solve",
        payload: { time: solveTime },
      }));
      await Promise.resolve();

      // Assert manager state
      const sessions = manager.getActiveSessions();
      const session = sessions.get(username);
      assertEquals(session?.state, "results");
      assertEquals(session?.result?.time, solveTime);
      assertEquals(session?.result?.penalty, "none");

      // Assert websocket message
      const stateMessage = JSON.parse(ws.sentMessages[0]);
      assertEquals(stateMessage.type, "state_change");
      assertEquals(stateMessage.payload.state, "results");
      assertEquals(stateMessage.payload.result.time, solveTime);
      assertEquals(stateMessage.payload.result.penalty, "none");
    });

    await t.step("apply penalty", async () => {
      ws.simulateMessage(JSON.stringify({
        type: "apply_penalty",
        payload: { penalty: "DNF" },
      }));
      await Promise.resolve();

      // Assert manager state
      const sessions = manager.getActiveSessions();
      const session = sessions.get(username);
      assertEquals(session?.state, "results");
      assertEquals(session?.result?.penalty, "DNF");

      // Assert websocket message
      const stateMessage = JSON.parse(ws.sentMessages[0]);
      assertEquals(stateMessage.type, "results_update");
      assertEquals(stateMessage.payload.result.penalty, "DNF");
    });

    await t.step("leave session", () => {
      ws.simulateMessage(JSON.stringify({
        type: "leave_session",
      }));

      // Assert manager state
      assertEquals(manager.getActiveSessions().size, 0);
    });

    await t.step("disconnect", () => {
      ws.simulateClose();
      assertEquals(manager.getActiveSessions().size, 0);
    });
  } finally {
    time.restore();
  }
});
