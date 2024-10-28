<script setup lang="ts">
const route = useRoute();
const { profile, loading, error, getProfile, updateProfile } = useProfile();
const { authenticated, username } = useAuth();
const isModalOpen = ref(false);
const editForm = ref({
  pfp: profile.value?.pfp || '',
  bio: profile.value?.bio || ''
});

const toggleModal = () => {
  isModalOpen.value = !isModalOpen.value;
  if (isModalOpen.value) {
    editForm.value = {
      pfp: profile.value?.pfp || '',
      bio: profile.value?.bio || ''
    };
  }
};

const isSubmitting = ref(false);
const submitError = ref<Error | null>(null);

const handleSubmit = async () => {
  if (!profile.value?.username) return;

  submitError.value = null;
  isSubmitting.value = true;

  try {
    await updateProfile(profile.value.username, {
      pfp: editForm.value.pfp,
      bio: editForm.value.bio
    });

    toggleModal();
  } catch (e) {
    submitError.value = e as Error;
  } finally {
    isSubmitting.value = false;
  }
};
await getProfile(route.params.username as string);
</script>

<template>
  <div class="max-w-2xl mx-auto p-6">
    <!-- Profile Card -->
    <div v-if="loading" class="text-center py-8">
      <div class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
    </div>
    <div v-else-if="error" class="text-red-500 text-center py-8">Error: {{ error.message }}</div>
    <div v-else class="bg-white rounded-lg shadow-md p-6">
      <div class="flex items-start justify-between mb-6">
        <div class="flex items-center space-x-4">
          <img :src="profile?.pfp" :alt="profile?.username" class="w-24 h-24 rounded-full object-cover" />
          <div>
            <h1 class="text-2xl font-bold">{{ profile?.username }}</h1>
            <p class="text-gray-600">{{ profile?.email }}</p>
            <p class="text-sm text-gray-500">Member since {{ new Date(profile?.createdAt || '').toLocaleDateString() }}
            </p>
          </div>
        </div>
        <button v-if="authenticated && (profile?.username === username)" @click="toggleModal"
          class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
          Edit Profile
        </button>
      </div>
      <div class="mt-4">
        <p class="text-gray-700">{{ profile?.bio || 'No bio yet' }}</p>
      </div>
    </div>

    <!-- Edit Modal -->
    <Teleport to="body">
      <div v-if="isModalOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg w-full max-w-md p-6" @click.stop>
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">Edit Profile</h2>
            <button @click="toggleModal" :disabled="isSubmitting" class="text-gray-500 hover:text-gray-700">
              <span class="sr-only">Close</span>
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Profile Picture URL</label>
              <input v-model="editForm.pfp" type="url" :disabled="isSubmitting"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter image URL" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea v-model="editForm.bio" :disabled="isSubmitting"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="4" placeholder="Write a short bio..."></textarea>
            </div>
            <div v-if="submitError" class="text-red-500 text-sm">
              {{ submitError.message }}
            </div>
            <div class="flex justify-end space-x-3">
              <button type="button" @click="toggleModal" :disabled="isSubmitting"
                class="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" :disabled="isSubmitting"
                class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center space-x-2">
                <div v-if="isSubmitting"
                  class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>{{ isSubmitting ? 'Saving...' : 'Save Changes' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
