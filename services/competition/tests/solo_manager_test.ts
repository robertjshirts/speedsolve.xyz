import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { SoloManager } from "../solo_manager.ts";
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

Deno.test("SoloManager - Basic Flow", async (t) => {
  await t.step("should handle new connection", () => {
    const manager = new SoloManager();
    const ws = new MockWebSocket();
    const username = "testUser";

    manager.addConnection(username, ws as unknown as WebSocket);
    // Verify connection was added (indirectly by starting a session)
    manager.handleSoloStart(username, "3x3");
    
    const message = JSON.parse(ws.messages[0]);
    assertEquals(message.type, "SESSION_UPDATE");
    assertEquals(message.payload.type, "solo");
    assertEquals(message.payload.state, "scrambling");
    assertEquals(message.payload.cube_type, "3x3");
    assertEquals(Array.from(message.payload.participants)[0], username);
  });

  await t.step("should handle solo start", () => {
    const manager = new SoloManager();
    const ws = new MockWebSocket();
    const username = "testUser";

    manager.addConnection(username, ws as unknown as WebSocket);
    manager.handleSoloStart(username, "3x3");

    const message = JSON.parse(ws.messages[0]);
    assertEquals(message.type, "SESSION_UPDATE");
    assertEquals(message.payload.state, "scrambling");
    assertExists(message.payload.scramble);
  });

  await t.step("should handle ready state", () => {
    const manager = new SoloManager();
    const ws = new MockWebSocket();
    const username = "testUser";

    manager.addConnection(username, ws as unknown as WebSocket);
    manager.handleSoloStart(username, "3x3");
    manager.handleReady(username);

    const message = JSON.parse(ws.messages[1]); // Second message after start
    assertEquals(message.type, "SESSION_UPDATE");
    assertEquals(message.payload.state, "solving");
    assertExists(message.payload.start_time);
  });

  await t.step("should handle solve complete", async () => {
    const manager = new SoloManager();
    const ws = new MockWebSocket();
    const username = "testUser";
    const result: Result = {
      time: 10000, // 10 seconds
      penalty: "none",
    };

    manager.addConnection(username, ws as unknown as WebSocket);
    manager.handleSoloStart(username, "3x3");
    manager.handleReady(username);
    await manager.handleSolveComplete(username, result);

    const message = JSON.parse(ws.messages[2]); // Third message after start and ready
    assertEquals(message.type, "SESSION_UPDATE");
    assertEquals(message.payload.state, "complete");
    assertEquals(message.payload.results[username].time, 10000);
    assertEquals(message.payload.results[username].penalty, "none");
  });

  await t.step("should handle penalty", async () => {
    const manager = new SoloManager();
    const ws = new MockWebSocket();
    const username = "testUser";
    const result: Result = {
      time: 10000,
      penalty: "none",
    };

    manager.addConnection(username, ws as unknown as WebSocket);
    manager.handleSoloStart(username, "3x3");
    manager.handleReady(username);
    await manager.handleSolveComplete(username, result);
    await manager.handlePenalty(username, "plus2");

    const message = JSON.parse(ws.messages[3]); // Fourth message
    assertEquals(message.type, "SESSION_UPDATE");
    assertEquals(message.payload.results[username].penalty, "plus2");
  });

  await t.step("should handle disconnection", () => {
    const manager = new SoloManager();
    const ws = new MockWebSocket();
    const username = "testUser";

    manager.addConnection(username, ws as unknown as WebSocket);
    manager.handleSoloStart(username, "3x3");
    manager.handleDisconnect(username);

    // Try to perform action after disconnect
    manager.handleReady(username);
    
    const message = JSON.parse(ws.messages[1]); // Second message after session update
    assertEquals(message.type, "ERROR");
  });
});

Deno.test("SoloManager - Error Cases", async (t) => {
  await t.step("should handle invalid ready state", () => {
    const manager = new SoloManager();
    const ws = new MockWebSocket();
    const username = "testUser";

    manager.addConnection(username, ws as unknown as WebSocket);
    // Try ready without starting
    manager.handleReady(username);

    const message = JSON.parse(ws.messages[0]);
    assertEquals(message.type, "ERROR");
  });

  await t.step("should handle invalid solve complete", async () => {
    const manager = new SoloManager();
    const ws = new MockWebSocket();
    const username = "testUser";
    const result: Result = {
      time: 10000,
      penalty: "none",
    };

    manager.addConnection(username, ws as unknown as WebSocket);
    // Try complete without starting/ready
    await manager.handleSolveComplete(username, result);

    const message = JSON.parse(ws.messages[0]);
    assertEquals(message.type, "ERROR");
  });

  await t.step("should handle invalid penalty", async () => {
    const manager = new SoloManager();
    const ws = new MockWebSocket();
    const username = "testUser";

    manager.addConnection(username, ws as unknown as WebSocket);
    // Try penalty without solve
    await manager.handlePenalty(username, "plus2");

    const message = JSON.parse(ws.messages[0]);
    assertEquals(message.type, "ERROR");
  });
});
