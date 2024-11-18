import { SoloManager } from "../solo_manager.ts";
import { MockWebSocket } from "./mock_websocket.ts";
import Database from "../models.ts";
import {
  assertEquals,
  assertArrayIncludes,
} from "jsr:@std/assert";
import { stub } from "jsr:@std/testing/mock";



Deno.test("SoloManager", async (t) => {
  using _databaseInitializeStub = stub(Database, "initialize");
  const manager = new SoloManager();  
  const ws = new MockWebSocket();
  ws.simulateOpen();
  manager.addConnection('user1', (ws as any));
  // TODO: rewrite manager to interface directly with websocket events
});