// components/Topbar.tsx
import { Link } from '@tanstack/react-router'
import { Login } from "../components/Login";
import { ThemeToggle } from "../components/ThemeToggle";

export function Topbar() {
  return (
    <div className="fixed top-0 z-50 w-full border-b-2 border-skin-accent bg-skin-fill">
      <div className="relative mx-auto flex max-w-screen-xl items-center justify-center px-4 py-3">
        <Link 
          to="/"
          className="absolute left-4 text-xl font-bold text-skin-accent hover:text-skin-primary cursor-pointer"
        >
          Speedsolve.xyz
        </Link>

        <div className="flex justify-center">
          <Link
            to="/solo"
            className="text-skin-base hover:text-skin-accent transition duration-150 ease-in-out px-5"
            activeProps={{
              className: 'text-skin-accent'
            }}
          >
            Solo
          </Link>
          <Link
            to="/multi"
            className="text-skin-base hover:text-skin-accent transition duration-150 ease-in-out px-5"
            activeProps={{
              className: 'text-skin-accent'
            }}
          >
            Multiplayer
          </Link>
          <Link
            to="/"
            className="text-skin-base hover:text-skin-accent transition duration-150 ease-in-out px-5"
            activeProps={{
              className: 'text-skin-accent'
            }}
          >
            Leaderboard
          </Link>
        </div>

        <div className="absolute right-4 flex space-x-4 items-center">
          <Login />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}