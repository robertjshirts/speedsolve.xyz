import { Auth0Client } from "@auth0/nextjs-auth0/server"

console.log(process.env.AUTH0_DOMAIN)
const options = {
  domain: 'https://auth.speedsolve.xyz',
  clientId: String(process.env.AUTH0_CLIENT_ID),
  clientSecret: String(process.env.AUTH0_CLIENT_SECRET),
  secret: String(process.env.AUTH0_SECRET),
  appBaseUrl: 'http://localhost:3000',
}

export const auth0 = new Auth0Client(options)