import { createAuth0 } from '@auth0/auth0-vue'
import authConfig from "../auth_config.json";

export default defineNuxtPlugin(nuxtApp => {
  const auth0 = createAuth0({
    domain: authConfig.domain,
    clientId: authConfig.clientId,
    authorizationParams: {
      redirect_uri: 'http://localhost:3000',
    },
  });
  nuxtApp.vueApp.use(auth0);
  nuxtApp.provide('auth0', auth0);
});

