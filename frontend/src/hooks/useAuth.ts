import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { useUserStore } from '../store';

export const useAuth = () => {
  const { isAuthenticated, user, isLoading, loginWithRedirect, logout: auth0Logout, getAccessTokenSilently } = useAuth0();
  const { setAuth, setLoading } = useUserStore();

  useEffect(() => {
    setAuth(isAuthenticated, user);
    setLoading(isLoading);
  }, [isAuthenticated, user, isLoading, setAuth, setLoading]);

  const logout = () => {
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  };

  return {
    isAuthenticated: useUserStore(state => state.isAuthenticated),
    isLoading: useUserStore(state => state.isLoading),
    user: useUserStore(state => state.user),
    getAccessToken: getAccessTokenSilently,
    loginWithRedirect,
    logout,
  };
};
