type MockWebSocketEvent = MessageEvent | Event | Error;

export interface MockWebSocketOptions {
  enableLogging?: boolean;
  enableMessageTracking?: boolean;
}

const DEFAULT_OPTIONS: Required<MockWebSocketOptions> = {
  enableLogging: false,
  enableMessageTracking: true,
}

class MockWebSocket {
  events: Record<string, ((event?: MockWebSocketEvent) => void)[]> = {};
  receivedMessages: string[] = [];
  sentMessages: string[] = [];
  onmessage: ((event?: MockWebSocketEvent) => void) = () => {};
  onopen: ((event?: MockWebSocketEvent) => void) = () => {};
  onclose: ((event?: MockWebSocketEvent) => void) = () => {};
  onerror: ((event?: MockWebSocketEvent) => void) = () => {};
  private readonly options: Required<MockWebSocketOptions>;

  constructor(options: MockWebSocketOptions = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    }
  }

  // Mock method to add an event listener
  addEventListener(event: string, callback: (event?: MockWebSocketEvent) => void) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  // Mock method to simulate sending a message
  // Messages are stored in reverse order to simulate the actual WebSocket behavior
  send(message: string) {
    if (this.options.enableLogging) console.log('received message in mock websocket', message)
    if (this.options.enableMessageTracking) this.sentMessages.unshift(message);
  }

  // Mock method to close the connection
  close() {}

  // Mock method to simulate receiving a message
  simulateMessage(data: string) {
    if (this.events["message"]) {
      this.events["message"].forEach((callback) => callback(new MessageEvent("message", { data })));
    }
    this.onmessage(new MessageEvent("message", { data }));
  }

  // Mock method to simulate opening the connection
  simulateOpen() {
    if (this.events["open"]) {
      this.events["open"].forEach((callback) => callback());
    }
    this.onopen();
  }

  // Mock method to simulate closing the connection
  simulateClose() {
    if (this.events["close"]) {
      this.events["close"].forEach((callback) => callback());
    }
    this.onclose()
  }

  // Mock method to simulate an error
  simulateError() {
    if (this.events["error"]) {
      this.events["error"].forEach((callback) => callback(new Error("MockWebSocket error")));
    }
    this.onerror();
  }
}

export { MockWebSocket };
