<script setup lang="ts">
import { useAuth0 } from "@auth0/auth0-vue";
import { useAuth } from '~/composables/useAuth';
import { useAuthenticatedWebSocket } from '~/composables/useAuthenticatedWebSocket';
import { ref, onMounted, watch } from 'vue';
import { useRuntimeConfig } from "#app";
const config = useRuntimeConfig()

const { authenticated, } = useAuth();
const { getAccessTokenSilently } = useAuth0();

if (!authenticated) {
  navigateTo({ path: '/' })
}

const token = await getAccessTokenSilently();
console.log(token)

const socket = new WebSocket(`wss://${config.public.apiUrl}/competition/ws?token=${token}`);

</script>

<template>
  <div>
    <p>solo page</p>
  </div>
</template>
