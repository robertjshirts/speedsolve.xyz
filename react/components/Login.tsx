/* eslint-disable @next/next/no-html-link-for-pages */

import { auth0 } from '@/lib/auth0'

export async function Login() {
  const session = await auth0.getSession();

  // if not session, show login button
  if (!session) {
    return (
      <a
        href="/api/auth/login"
        className="px-4 py-2 bg-skin-accent text-skin-base rounded hover:bg-skin-primary transition duration-150 ease-in-out"
      >
        Login
      </a>
    );
  }

  const user = session.user;
  // else, show logout button and username
  return (
    <>
      <div className="flex items-center space-x-4">
        <a
          href={`/p/${user['username']}`}
          className="font-bold text-skin-base hover:text-skin-accent"
        >
          {String(user['username'])}
        </a>
        <a
          href="/api/auth/logout"
          className="px-4 py-2 bg-skin-accent text-skin-base rounded hover:bg-skin-primary transition duration-150 ease-in-out"
        >
          Logout
        </a>
      </div>
    </>
  );
} 