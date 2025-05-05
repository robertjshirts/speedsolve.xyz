import { createAuth0 } from "@auth0/auth0-vue";
// import authConfig from "../auth_config.json";

export default defineNuxtPlugin((nuxtApp: any) => {
  const config = useRuntimeConfig();
  const auth0 = createAuth0({
    domain: config.public.domain as string,
    clientId: config.public.clientId as string,
    authorizationParams: {
      redirect_uri: config.public.redirectUri as string,
      audience: config.public.audience as string,
      scope: "openid profile email",
    },
    cacheLocation: "localstorage",
  });
  nuxtApp.vueApp.use(auth0);
  nuxtApp.provide("auth0", auth0);
});
