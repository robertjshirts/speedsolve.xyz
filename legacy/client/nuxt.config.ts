// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: {
    enabled: true,

    timeline: {
      enabled: true,
    },
  },
  modules: ["@nuxthub/core", "@nuxt/ui", "@pinia/nuxt"],
  ssr: false,
  runtimeConfig: {
    public: {
      domain: "",
      clientId: "",
      redirectUri: "",
      audience: "",
      apiUrl: "",
      apiProtocol: "https",
      wsProtocol: "wss",
    },
  },
});
