import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { Auth0Provider } from '@auth0/auth0-react';    
import { routeTree } from './routeTree.gen'
import './global.css'

// Set up a Router instance
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

// Register things for typesafety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('app')!

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <Auth0Provider
        domain={import.meta.env.VITE_AUTH_DOMAIN}
        clientId={import.meta.env.VITE_AUTH_CLIENT_ID}
        authorizationParams={{
          redirect_uri: window.location.origin,
          audience: import.meta.env.VITE_AUTH_AUDIENCE
        }}
        cacheLocation="localstorage"
      >
        <RouterProvider router={router} />
      </Auth0Provider>
    </React.StrictMode>
  )
}
