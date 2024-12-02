import { useState } from 'react'
import { createFileRoute, useLoaderData } from '@tanstack/react-router'
import { getProfile, updateProfile } from '../api/profile'
import { ProfileCard } from '../components/ProfileCard'
import { useAuthFetch } from '../hooks/useAuthFetch'
import { useRouter } from '@tanstack/react-router'

interface Profile {
  id: string;
  username: string;
  email: string;
  bio?: string;
  pfp?: string;
  created_at: string;
}

interface Solve {
  solve_id: string;
  username: string;
  time: number;
  scramble: string;
  cube: '3x3' | '2x2';
  penalty: 'DNF' | 'plus2' | 'none';
  created_at: string;
}

interface SolveResponse {
  pagination: any;
  records: Solve[];
  average: number | null;
}

const API_URL = `${import.meta.env.VITE_API_PROTOCOL}://${import.meta.env.VITE_API_URL}`;

async function fetchProfile(username: string): Promise<Profile> {
  const response = await fetch(`${API_URL}/profile/${username}`);
  if (!response.ok) throw new Error('Failed to fetch profile');
  return response.json();
}

async function fetchSolves(username: string): Promise<SolveResponse> {
  const response = await fetch(`${API_URL}/competition/solves/${username}`);
  if (!response.ok) throw new Error('Failed to fetch solves');
  return response.json();
}

export const Route = createFileRoute('/p/$username')({
  loader: async ({ params }) => {
    const [profile, solves] = await Promise.all([
      fetchProfile(params.username),
      fetchSolves(params.username)
    ]);
    return { profile, solves };
  },
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, solves } = Route.useLoaderData();
  const [cubeType, setCubeType] = useState<'3x3' | '2x2'>('3x3');
  const [sortBy, setSortBy] = useState<'time' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredSolves = solves.records
    .filter(solve => solve.cube === cubeType)
    .sort((a, b) => {
      const aValue = sortBy === 'time' ? a.time : new Date(a.created_at).getTime();
      const bValue = sortBy === 'time' ? b.time : new Date(b.created_at).getTime();
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <div className="flex items-center gap-4">
          {profile.pfp && (
            <img 
              src={profile.pfp} 
              alt={profile.username} 
              className="w-16 h-16 rounded-full"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{profile.username}</h1>
            <p className="text-sm text-gray-500">
              Joined {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <p className="mt-4">{profile.bio || 'No bio provided'}</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold mb-2">Total Solves</h2>
          <p className="text-2xl font-bold">{solves.records.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold mb-2">Best Time</h2>
          <p className="text-2xl font-bold">
            {Math.min(...solves.records.filter(s => s.penalty !== 'DNF')
              .map(s => s.penalty === 'plus2' ? s.time + 2000 : s.time)) / 1000}s
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold mb-2">Average Time</h2>
          <p className="text-2xl font-bold">
            {solves.average ? `${(solves.average / 1000).toFixed(2)}s` : '-'}
          </p>
        </div>
      </div>

      {/* Solve History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Solve History</h2>
          <div className="flex gap-4">
            <select 
              value={cubeType} 
              onChange={(e) => setCubeType(e.target.value as '3x3' | '2x2')}
              className="p-2 rounded border dark:bg-gray-700"
            >
              <option value="3x3">3x3</option>
              <option value="2x2">2x2</option>
            </select>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'time' | 'created_at')}
              className="p-2 rounded border dark:bg-gray-700"
            >
              <option value="time">Time</option>
              <option value="created_at">Date</option>
            </select>
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="p-2 rounded border dark:bg-gray-700"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredSolves.map((solve) => (
            <div 
              key={solve.solve_id}
              className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded"
            >
              <div>
                <p className="font-medium">
                  {(solve.time / 1000).toFixed(2)}s 
                  {solve.penalty !== 'none' && 
                    <span className="text-red-500 ml-2">({solve.penalty})</span>
                  }
                </p>
                <p className="text-sm text-gray-500">{solve.scramble}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {new Date(solve.created_at).toLocaleDateString()}
                </p>
                <p className="text-sm">{solve.cube}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;

/** 
export const Route = createFileRoute('/p/$username')({
  loader: async ({ params }) => {
    const { username } = params;
    const profile = await getProfile(username)
    return { profile }
  },
  component: ProfileComponent,
})


function ProfileComponent() {
  const authFetch = useAuthFetch()
  const { username } = Route.useParams();
  const { profile } = useLoaderData({ from: '/p/$username' });
  const router = useRouter()

  const handleProfileUpdate = async (updatedData: Partial<Profile>) => {
    const response = await authFetch(`https://api.speedsolve.xyz/profile/${username}`, {
      method: 'PATCH',
      body: JSON.stringify(updatedData),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    console.log("data", data)
    await router.invalidate()

  }
  return <>
    <ProfileCard user={profile} onProfileUpdate={handleProfileUpdate} />
  </>
}
*/