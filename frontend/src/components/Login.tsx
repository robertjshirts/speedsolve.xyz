import { Link } from '@tanstack/react-router'
import { useAuth } from '../hooks/useAuth'

export function Login() {
  const { isAuthenticated, loginWithRedirect, user, logout, isLoading } = useAuth()
  console.log('Checking auth status...')

  if (isLoading) {
    return <div>Loading...</div>
  }

  // if not authenticated, show login button
  if (!isAuthenticated) {
    return (
      <button
        onClick={() => loginWithRedirect()}
        className="px-4 py-2 bg-skin-accent text-skin-base rounded hover:bg-skin-primary transition duration-150 ease-in-out"
      >
        Login
      </button>
    );
  }

  // else, show logout button and username
  return (
    <div className="flex items-center space-x-4">
      <Link
        to={`/p/${user!["username"]}`}
        className="font-bold text-skin-base hover:text-skin-accent"
      >
        {String(user!["username"])}
      </Link>
      <button
        onClick={logout}
        className="px-4 py-2 bg-skin-accent text-skin-base rounded hover:bg-skin-primary transition duration-150 ease-in-out"
      >
        Logout
      </button>
    </div>
  );
}
