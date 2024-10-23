import { ref, watch } from 'vue'
import { useAuth0 } from '@auth0/auth0-vue'

export const useAuth = () => {
  const { isLoading, isAuthenticated, loginWithRedirect, logout, idTokenClaims } = useAuth0()
  const username = ref(idTokenClaims.value?.username || '')

  watch(idTokenClaims, (newClaims) => {
    username.value = newClaims?.username || ''
  })

  const login = async () => {
    await loginWithRedirect()
  }

  const logoutUser = async () => {
    await logout({
      logoutParams: {
        returnTo: window.location.href,
      }
    })
  }

  return {
    loading: isLoading,
    authenticated: isAuthenticated,
    username,
    login,
    logout: logoutUser,
  }
}
