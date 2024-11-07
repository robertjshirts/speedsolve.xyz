'use client';
/* eslint-disable @next/next/no-html-link-for-pages */

import { useUser } from "@auth0/nextjs-auth0/client";

export function Login() {
  const { user, error, isLoading } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <>
      {user ? (
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
      ) : (
        <a
          href="/api/auth/login"
          className="px-4 py-2 bg-skin-accent text-skin-base rounded hover:bg-skin-primary transition duration-150 ease-in-out"
        >
          Login
        </a>
      )}
    </>
  );
} 