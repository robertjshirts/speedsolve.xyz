class MockWebSocket {
  events: Record<string, Function[]> = {};

  // Mock method to add an event listener
  addEventListener(event: string, callback: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  // Mock method to simulate sending a message
  send(message: string) {
    console.log(`MockWebSocket sent: ${message}`);
  }

  // Mock method to simulate receiving a message
  simulateMessage(data: string) {
    if (this.events["message"]) {
      this.events["message"].forEach((callback) => callback({ data }));
    }
  }

  // Mock method to simulate opening the connection
  simulateOpen() {
    if (this.events["open"]) {
      this.events["open"].forEach((callback) => callback());
    }
  }

  // Mock method to simulate closing the connection
  simulateClose() {
    if (this.events["close"]) {
      this.events["close"].forEach((callback) => callback());
    }
  }

  // Mock method to simulate an error
  simulateError() {
    if (this.events["error"]) {
      this.events["error"].forEach((callback) => callback(new Error("MockWebSocket error")));
    }
  }
}

export { MockWebSocket };
