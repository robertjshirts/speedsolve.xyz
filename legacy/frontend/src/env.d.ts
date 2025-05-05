/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WS_PROTOCOL: string
  readonly VITE_API_PROTOCOL: string
  readonly VITE_AUTH_DOMAIN: string
  readonly VITE_AUTH_CLIENT_ID: string
  readonly VITE_AUTH_AUDIENCE: string
  readonly VITE_ICE_SERVERS_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
