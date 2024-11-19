import { SoloManager } from "../solo_manager.ts";
import { MockWebSocket } from "./mock_websocket.ts";
import {
  assertEquals,
  assertExists,
} from "jsr:@std/assert";

const mockCubeType = "3x3";
const username = "test";


Deno.test("Regular solo solve", async (t) => {
  // Stub database initialization
  const manager = new SoloManager(true);

  const ws = new MockWebSocket();
  await t.step("add connection", () => {
    // Arrange
    ws.simulateOpen();

    // Act
    manager.addConnection(username, (ws as any));

    // Assert 
    assertEquals(manager.getActiveSessions().length, 0);
  });

  await t.step("create session", () => {
    // Arrange
    // Act
    ws.simulateMessage(JSON.stringify({
      type: "create_session",
      payload: { cube_type: mockCubeType },
    }));

    // Assert
    // manager
    assertEquals(manager.getActiveSessions().length, 1);
    assertEquals(manager.getActiveSession(username)?.state, "scrambling");

    // ws
    const sentMessage = JSON.parse(ws.sentMessages[0]);
    assertEquals(sentMessage.type, "session_created");
    assertEquals(sentMessage.payload.state, "scrambling");
    assertEquals(sentMessage.payload.scramble!.split(" ").length, 20);
  });

  await t.step("start solve", () => {
    // Arrange
    // Act
    ws.simulateMessage(JSON.stringify({
      type: "start_solve",
    }));

    // Assert
    // manager
    assertEquals(manager.getActiveSessions().length, 1);
    assertEquals(manager.getActiveSession(username)?.state, "solving");

    // ws
    const sentMessage = JSON.parse(ws.sentMessages[0]);
    assertEquals(sentMessage.type, "solve_started");
    assertExists(sentMessage.payload.start_time);
  });

  await t.step("complete solve", () => {
    // Arrange
    // Act
    ws.simulateMessage(JSON.stringify({
      type: "complete_solve",
      payload: { time: 0 },
    }));

    // Assert
    // manager
    assertEquals(
      manager.getActiveSessions().length,
      1,
      "manager should have 1 active session",
    );
    assertEquals(
      manager.getActiveSession(username)?.state,
      "results",
      "user should be in results state",
    );
  });

  await t.step("apply penalty", async () => {
    // Arrange
    // Act
    ws.simulateMessage(JSON.stringify({
      type: "apply_penalty",
      payload: { penalty: "DNF" },
    }));
    await Promise.resolve();

    // Assert
    // manager
    assertEquals(manager.getActiveSessions().length, 1);
    assertEquals(manager.getActiveSession(username)?.state, "results");
    assertEquals(manager.getActiveSession(username)?.result?.penalty, "DNF");

    // ws
    const sentMessage = JSON.parse(ws.sentMessages[0]);
    console.log(ws.sentMessages);
    assertEquals(sentMessage.type, "penalty_applied");
    assertEquals(sentMessage.payload.result.penalty, "DNF");
  });

  await t.step("close connection", () => {
    // Arrange
    // Act
    ws.simulateClose();

    // Assert
    assertEquals(manager.getActiveSessions().length, 0);
  });
});
