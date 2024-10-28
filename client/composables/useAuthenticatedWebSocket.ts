import { useAuth0 } from "@auth0/auth0-vue";
import { ref, onUnmounted } from "vue";

interface WebSocketMessage {
  type: string;
  payload?: any;
}

export const useAuthenticatedWebSocket = () => {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const socket = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const lastMessage = ref<WebSocketMessage | null>(null);
  const error = ref<Error | null>(null);

  const connect = async () => {
    if (!isAuthenticated.value) {
      console.error("User not authenticated");
      return;
    }

    try {
      const token = await getAccessTokenSilently();
      console.log("Connecting to WebSocket with token:", token);

      // Using secure WebSocket with authentication token
      socket.value = new WebSocket(`wss://api.speedsolve.xyz/competition/ws?token=${token}`);

      socket.value.onopen = () => {
        console.log("WebSocket connected");
        isConnected.value = true;
        error.value = null;
      };

      socket.value.onmessage = (event) => {
        console.log("WebSocket message received:", event.data);
        try {
          lastMessage.value = JSON.parse(event.data);
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      socket.value.onerror = (event) => {
        console.error("WebSocket error:", event);
        error.value = new Error("WebSocket connection error");
      };

      socket.value.onclose = () => {
        console.log("WebSocket disconnected");
        isConnected.value = false;
      };

    } catch (e) {
      console.error("Failed to establish WebSocket connection:", e);
      error.value = e as Error;
    }
  };

  const disconnect = () => {
    if (socket.value) {
      console.log("Closing WebSocket connection");
      socket.value.close();
      socket.value = null;
      isConnected.value = false;
    }
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (!socket.value || !isConnected.value) {
      console.error("Cannot send message: WebSocket not connected");
      return;
    }

    console.log("Sending WebSocket message:", message);
    socket.value.send(JSON.stringify(message));
  };

  onUnmounted(() => {
    disconnect();
  });

  return {
    isConnected,
    lastMessage,
    error,
    connect,
    disconnect,
    sendMessage
  };
};
