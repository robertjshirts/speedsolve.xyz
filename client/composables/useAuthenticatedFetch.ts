import { useAuth0 } from "@auth0/auth0-vue";

export const useAuthenticatedFetch = () => {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  if (!isAuthenticated) {
    return;
  }

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    try {
      const token = await getAccessTokenSilently();
      console.log(token);
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });
      return response;
    } catch (error) {
      if (error instanceof Error) {
        console.log(error.name);
        console.log(error.message);
        console.log(error.stack);
      }
      throw error;
    }
  };

  return { authenticatedFetch };
};
