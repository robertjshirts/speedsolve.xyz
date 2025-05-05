<script setup lang="ts">
import { useAuth0 } from '@auth0/auth0-vue';

// const { isLoading, isAuthenticated, handleRedirectCallback, user } = await useAuth0();
// const { authenticatedFetch } = useAuthenticatedFetch();
// console.log(user);

// const makeProfile = async () => {
//   if (!user.value) {
//     console.log("User info not available yet");
//     return;
//   }
// 
//   const { nickname, email, sub } = user.value;
//   const checkResponse = await authenticatedFetch(`http://localhost:8000/profile/${nickname}`, {
//     method: "GET"
//   });
// 
//   if (checkResponse.status === 404) {
//     console.log("Profile doesn't exist, creating...");
//     const createResponse = await authenticatedFetch('http://localhost:8000/profile', {
//       method: 'POST',
//       body: JSON.stringify({
//         "id": sub,
//         "username": nickname,
//         "email": email
//       })
//     });
// 
//     if (createResponse.ok) {
//       console.log('Profile created successfully!');
//       return createResponse.json();
//     } else {
//       console.log("Failed to create profile: ", await createResponse.text());
//     }
//   }
// };
// 
// onMounted(async () => {
//   try {
//     await makeProfile();
//   } catch (e) {
//     console.log(e);
//   }
// })

</script>

<template>
  <h1>Loading...</h1>
</template>
