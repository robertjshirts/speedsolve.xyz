export type {
  SessionType,
  SessionState,
  CubeType,
  ConnectionState,
  WebSocketMessageType,
  WebSocketMessage,
  Penalty,
  Result,
  CompetitionState,
};

interface WebSocketHandlers {
  onConnectionStateChange: (state: ConnectionState) => void;
  onError: (error: string) => void;
  onSessionUpdate: (session: CompetitionState) => void;
}

export class SoloCompetitionApi {
  private ws: WebSocket | null = null;
  private handlers: WebSocketHandlers;
  private static readonly WS_URL = `${import.meta.env.VITE_WS_PROTOCOL}://${import.meta.env.VITE_API_URL}/solo`;

  constructor(handlers: WebSocketHandlers) {
    this.handlers = handlers;
  }

  async initialize(getAuthToken: () => Promise<string>) {
    this.handlers.onConnectionStateChange('connecting');

    try {
      const token = await getAuthToken();
      const url = new URL(SoloCompetitionApi.WS_URL);
      url.searchParams.append('token', token);

      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        console.log('Connection opened');
        this.handlers.onConnectionStateChange('connected');
        this.startSession();
      };
      
      this.ws.onclose = () => {
        console.log('Connection closed');
        this.handlers.onConnectionStateChange('disconnected');
      };
      
      this.ws.onerror = () => {
        this.handlers.onError('Connection error occurred');
      };
      
      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data) as WebSocketMessage;
        console.log('Received message:', message);
        this.handleWebSocketMessage(message);
      };
    } catch (error) {
      this.handlers.onError('Failed to connect');
      this.handlers.onConnectionStateChange('disconnected');
    }
  }

  private handleWebSocketMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'SESSION_UPDATE':
        this.handlers.onSessionUpdate(message.payload);
        break;
      case 'ERROR':
        this.handlers.onError(message.payload.message);
        break;
    }
  }

  private sendMessage(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  startSession() {
    this.sendMessage({
      type: 'SOLO_START',
      payload: { cube_type: "3x3" }
    });
  }

  startSolve() {
    this.sendMessage({
      type: 'READY'
    });
  }

  completeSolve(time: number) {
    console.log('Completing solve:', time); 
    this.sendMessage({
      type: 'SOLVE_COMPLETE',
      payload: { time }
    });
  }

  updatePenalty(penalty: Penalty) {
    console.log('Updating penalty:', penalty);
    this.sendMessage({
      type: 'PENALTY',
      payload: { penalty }
    });
  }

  disconnect() {
    this.ws?.close();
  }
}
