import { createAuth0 } from '@auth0/auth0-vue'
// import authConfig from "../auth_config.json";

export default defineNuxtPlugin(nuxtApp => {
  const config = useRuntimeConfig();
  console.log(`domain: ${config.public.domain}`);

  const auth0 = createAuth0({
    domain: config.public.domain as string,
    clientId: config.public.clientId as string,
    authorizationParams: {
      redirect_uri: config.public.redirectUri as string,
    },
  });
  nuxtApp.vueApp.use(auth0);
  nuxtApp.provide('auth0', auth0);
});

