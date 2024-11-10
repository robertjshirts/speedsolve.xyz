import * as React from 'react'
import { createFileRoute, useLoaderData } from '@tanstack/react-router'
import { getProfile, updateProfile } from '../api/profile'
import { ProfileCard } from '../components/ProfileCard'
import { useAuthFetch } from '../hooks/useAuthFetch'
import { useRouter } from '@tanstack/react-router'
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