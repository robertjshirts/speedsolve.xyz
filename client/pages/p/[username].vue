<script setup lang="ts">

const route = useRoute();
const { profile, loading, error, getProfile } = useProfile();

await getProfile(route.params.username as string);

</script>

<template>
  <div>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else-if="profile">
      <img :src="profile.pfp" :alt="profile.username" class="max-w-20" />
      <p>Username: {{ profile.username }}</p>
      <p>Email: {{ profile.email }}</p>
      <p>Member since: {{ new Date(profile.createdAt).toLocaleDateString() }}</p>
    </div>
  </div>
</template>
