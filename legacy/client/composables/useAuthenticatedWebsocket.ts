import { useAuth0 } from "@auth0/auth0-vue";

export const useAuthenticatedWebsocket = () => {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  const createWebSocket = async (url: string): Promise<WebSocket> => {
    if (!isAuthenticated.value) {
      throw new Error('User is not authenticated. Please authenticate first.');
    }

    let token: string;
    try {
      token = await getAccessTokenSilently();
      console.log("Access token retrieved:", token);
    } catch (error) {
      console.error("Failed to get access token:", error);
      throw error;
    }

    // Append the token to the WebSocket URL
    const wsUrl = `${url}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);

    return ws;
  };

  return { createWebSocket };
};
