import { ref } from 'vue'
import { useAuth0 } from '@auth0/auth0-vue'

export const useProfile = () => {
  const config = useRuntimeConfig();
  const { getAccessTokenSilently } = useAuth0();
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const profile = ref<Profile | null>(null);

  const getAuthHeader = async () => {
    const token = await getAccessTokenSilently();
    return {
      'Authorization': `Bearer ${token}`,
    }
  }

  const getProfile = async (username: string) => {
    loading.value = true
    error.value = null

    try {
      const headers = await getAuthHeader()
      const response = await fetch(`${config.public.apiUrl}profile/${username}`, {
        headers
      })

      console.log(response);

      if (!response.ok) {
        throw createError({
          statusCode: response.status,
          statusMessage: await response.text()
        })
      }
      profile.value = await response.json()
    } catch (e) {
      error.value = e as Error
      throw e
    } finally {
      loading.value = false
    }

    return profile.value
  }

  const updateProfile = async (username: string, updates: Partial<Profile>) => {
    loading.value = true
    error.value = null

    try {
      const headers = await getAuthHeader()
      const response = await fetch(`${config.public.apiUrl}profile/${username}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw createError({
          statusCode: response.status,
          statusMessage: await response.text()
        })
      }

      profile.value = await response.json()
    } catch (e) {
      error.value = e as Error
      throw e
    } finally {
      loading.value = false
    }

    return profile.value
  }

  const deleteProfile = async (username: string) => {
    loading.value = true
    error.value = null

    try {
      const headers = await getAuthHeader()
      const response = await fetch(`${config.public.apiUrl}profile/${username}`, {
        method: 'DELETE',
        headers
      })

      if (!response.ok) {
        throw createError({
          statusCode: response.status,
          statusMessage: await response.text()
        })
      }

      profile.value = null
    } catch (e) {
      error.value = e as Error
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    profile,
    loading,
    error,
    getProfile,
    updateProfile,
    deleteProfile
  }
}
