import { useAuth0 } from "@auth0/auth0-vue";

export const useAuthenticatedFetch = () => {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    // Clone options to avoid mutating original reference
    const requestOptions = { ...options, headers: { ...options.headers } };

    // TODO: remove this in prod
    console.log("is authenticated?")
    console.log(isAuthenticated.value)

    if (isAuthenticated.value) {
      try {
        const token = await getAccessTokenSilently();
        console.log("access token")
        console.log(token)
        requestOptions.headers = {
          ...requestOptions.headers,
          Authorization: `Bearer ${token}`,
        };
      } catch (error) {
        console.error("Failed to get access token:", error);
        throw error;
      }
    }

    return fetch(url, requestOptions);
  };

  return { authenticatedFetch };
};
