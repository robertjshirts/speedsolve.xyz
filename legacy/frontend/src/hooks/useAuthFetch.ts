// hooks/useAuthFetch.ts
import { useAuth0 } from '@auth0/auth0-react';

export function useAuthFetch() {
  const { getAccessTokenSilently } = useAuth0();

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = await getAccessTokenSilently();
    console.log("token", token)

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  };

  return authFetch;
}