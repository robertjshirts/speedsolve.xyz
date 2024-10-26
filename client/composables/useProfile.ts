import { ref } from 'vue';
import { useAuthenticatedFetch } from './useAuthenticatedFetch';

export const useProfile = () => {
  const config = useRuntimeConfig();
  const { authenticatedFetch } = useAuthenticatedFetch();
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const profile = ref<Profile | null>(null);

  const getProfile = async (username: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await authenticatedFetch(`${config.public.apiUrl}profile/${username}`);

      if (!response.ok) {
        throw createError({
          statusCode: response.status,
          statusMessage: await response.text(),
        });
      }
      profile.value = await response.json();
    } catch (e) {
      error.value = e as Error;
      throw e;
    } finally {
      loading.value = false;
    }

    return profile.value;
  };

  const updateProfile = async (username: string, updates: Partial<Profile>) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await authenticatedFetch(`${config.public.apiUrl}profile/${username}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw createError({
          statusCode: response.status,
          statusMessage: await response.text(),
        });
      }

      profile.value = await response.json();
    } catch (e) {
      error.value = e as Error;
      throw e;
    } finally {
      loading.value = false;
    }

    return profile.value;
  };

  const deleteProfile = async (username: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await authenticatedFetch(`${config.public.apiUrl}profile/${username}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw createError({
          statusCode: response.status,
          statusMessage: await response.text(),
        });
      }

      profile.value = null;
    } catch (e) {
      error.value = e as Error;
      throw e;
    } finally {
      loading.value = false;
    }
  };

  return {
    profile,
    loading,
    error,
    getProfile,
    updateProfile,
    deleteProfile,
  };
};
