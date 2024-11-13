import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { MultiManager } from "../multi_manager.ts";
import { SessionDB, SolveDB } from "../models.ts";

// Mock WebSocket
class MockWebSocket {
  readyState = 1;
  messages: string[] = [];
  send(data: string) {
    this.messages.push(data);
  }
}

// Mock database
const mockSessionDB = {
  upsert: async (data: any) => data,
};

const mockSolveDB = {
  upsert: async (data: any) => data,
};

// Replace actual DB with mocks
SessionDB.upsert = mockSessionDB.upsert;
SolveDB.upsert = mockSolveDB.upsert;

Deno.test("MultiManager - Queue and Matching", async (t) => {
  await t.step("should handle single player queue", () => {
    const manager = new MultiManager();
    const ws = new MockWebSocket();
    const username = "player1";

    manager.addConnection(username, ws as unknown as WebSocket);
    manager.handleQueue(username, "3x3");

    const message = JSON.parse(ws.messages[0]);
    assertEquals(message.type, "SESSION_UPDATE");
    assertEquals(message.payload.state, "queuing");
    assertEquals(message.payload.type, "multi");
    assertEquals(Array.from(message.payload.participants).length, 1);
  });

  await t.step("should match two players", () => {
    const manager = new MultiManager();
    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();
    const player1 = "player1";
    const player2 = "player2";

    manager.addConnection(player1, ws1 as unknown as WebSocket);
    manager.addConnection(player2, ws2 as unknown as WebSocket);

    manager.handleQueue(player1, "3x3");
    manager.handleQueue(player2, "3x3");

    // Check both players' messages
    const message1 = JSON.parse(ws1.messages[1]); // Second message after initial queue
    const message2 = JSON.parse(ws2.messages[1]);

    assertEquals(message1.type, "SESSION_UPDATE");
    assertEquals(message1.payload.state, "scrambling");
    assertEquals(Array.from(message1.payload.participants).length, 2);
    assertExists(message1.payload.scramble);

    assertEquals(message2.type, "SESSION_UPDATE");
    assertEquals(message2.payload.state, "scrambling");
    assertEquals(Array.from(message2.payload.participants).length, 2);
    assertExists(message2.payload.scramble);
  });
});

Deno.test("MultiManager - Session Flow", async (t) => {
  await t.step("should handle ready state synchronization", () => {
    const manager = new MultiManager();
    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();
    const player1 = "player1";
    const player2 = "player2";

    // Setup match
    manager.addConnection(player1, ws1 as unknown as WebSocket);
    manager.addConnection(player2, ws2 as unknown as WebSocket);
    manager.handleQueue(player1, "3x3");
    manager.handleQueue(player2, "3x3");

    // First player ready
    manager.handleReady(player1);
    let message1 = JSON.parse(ws1.messages[2]);
    let message2 = JSON.parse(ws2.messages[2]);
    assertEquals(message1.payload.state, "scrambling");
    assertEquals(message2.payload.state, "scrambling");

    // Second player ready
    manager.handleReady(player2);
    message1 = JSON.parse(ws1.messages[3]);
    message2 = JSON.parse(ws2.messages[3]);
    assertEquals(message1.payload.state, "solving");
    assertEquals(message2.payload.state, "solving");
    assertExists(message1.payload.start_time);
    assertExists(message2.payload.start_time);
  });

  await t.step("should handle solve completion", async () => {
    const manager = new MultiManager();
    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();
    const player1 = "player1";
    const player2 = "player2";

    // Setup match
    manager.addConnection(player1, ws1 as unknown as WebSocket);
    manager.addConnection(player2, ws2 as unknown as WebSocket);
    manager.handleQueue(player1, "3x3");
    manager.handleQueue(player2, "3x3");
    manager.handleReady(player1);
    manager.handleReady(player2);

    // First player completes
    await manager.handleSolveComplete(player1, { time: 10000, penalty: "none" });
    let message1 = JSON.parse(ws1.messages[4]);
    let message2 = JSON.parse(ws2.messages[4]);
    assertEquals(message1.payload.state, "solving");
    assertEquals(message2.payload.state, "solving");

    // Second player completes
    await manager.handleSolveComplete(player2, { time: 12000, penalty: "none" });
    message1 = JSON.parse(ws1.messages[5]);
    message2 = JSON.parse(ws2.messages[5]);
    assertEquals(message1.payload.state, "complete");
    assertEquals(message2.payload.state, "complete");
  });

  await t.step("should handle penalties", async () => {
    const manager = new MultiManager();
    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();
    const player1 = "player1";
    const player2 = "player2";

    // Setup complete match
    manager.addConnection(player1, ws1 as unknown as WebSocket);
    manager.addConnection(player2, ws2 as unknown as WebSocket);
    manager.handleQueue(player1, "3x3");
    manager.handleQueue(player2, "3x3");
    manager.handleReady(player1);
    manager.handleReady(player2);
    await manager.handleSolveComplete(player1, { time: 10000, penalty: "none" });
    await manager.handleSolveComplete(player2, { time: 12000, penalty: "none" });

    // Apply penalty
    await manager.handlePenalty(player1, "plus2");
    const message1 = JSON.parse(ws1.messages[6]);
    const message2 = JSON.parse(ws2.messages[6]);
    assertEquals(message1.payload.results[player1].penalty, "plus2");
    assertEquals(message2.payload.results[player1].penalty, "plus2");
  });
});

Deno.test("MultiManager - Error Cases", async (t) => {
  await t.step("should handle disconnect during match", () => {
    const manager = new MultiManager();
    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();
    const player1 = "player1";
    const player2 = "player2";

    manager.addConnection(player1, ws1 as unknown as WebSocket);
    manager.addConnection(player2, ws2 as unknown as WebSocket);
    manager.handleQueue(player1, "3x3");
    manager.handleQueue(player2, "3x3");

    manager.handleDisconnect(player1);
    const message = JSON.parse(ws2.messages[2]); // Message after match and disconnect
    assertEquals(message.type, "ERROR");
  });

  await t.step("should prevent double queueing", () => {
    const manager = new MultiManager();
    const ws = new MockWebSocket();
    const username = "player1";

    manager.addConnection(username, ws as unknown as WebSocket);
    manager.handleQueue(username, "3x3");
    manager.handleQueue(username, "2x2"); // Try to queue for another type

    const message = JSON.parse(ws.messages[1]);
    assertEquals(message.type, "ERROR");
  });

  await t.step("should handle invalid ready state", () => {
    const manager = new MultiManager();
    const ws = new MockWebSocket();
    const username = "player1";

    manager.addConnection(username, ws as unknown as WebSocket);
    manager.handleReady(username); // Try ready without being in a match

    const message = JSON.parse(ws.messages[0]);
    assertEquals(message.type, "ERROR");
  });

  await t.step("should handle invalid solve complete", async () => {
    const manager = new MultiManager();
    const ws = new MockWebSocket();
    const username = "player1";

    manager.addConnection(username, ws as unknown as WebSocket);
    await manager.handleSolveComplete(username, { time: 10000, penalty: "none" });

    const message = JSON.parse(ws.messages[0]);
    assertEquals(message.type, "ERROR");
  });
});
