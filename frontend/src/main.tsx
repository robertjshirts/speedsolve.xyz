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
        domain="https://auth.speedsolve.xyz"
        clientId="yc7X6OmH4PCaAtjlOkQ6YlrukiycNgGj"
        authorizationParams={{
          redirect_uri: window.location.origin,
          audience: 'gcloud-instance'
        }}
        cacheLocation="localstorage"
      >
        <RouterProvider router={router} />
      </Auth0Provider>
    </React.StrictMode>
  )
}
