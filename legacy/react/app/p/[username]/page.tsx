'use client';
import { useEffect, useState } from 'react';
import ProfileCard from '@/components/ProfileCard'; 
import { useParams } from 'next/navigation';
import { getAccessToken } from '@auth0/nextjs-auth0';


export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleProfileUpdate = async (updatedData: Partial<Profile>) => {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`https://api.speedsolve.xyz/profile/${username}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(updatedData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      const updatedProfile = await response.json();
      setProfile(updatedProfile);
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`https://api.speedsolve.xyz/profile/${username}`);
        
        if (!response.ok) {
          // Log the full response for debugging
          console.error('Response:', response);
          throw new Error(`Failed to fetch profile: ${response.status} ${response.statusText}`);
        }
        
        const data: Profile = await response.json();
        setProfile(data);
      } catch (err) {
        console.error('Fetch error:', err); // Log the full error
        setError(err instanceof Error ? err.message : String(err)); // Convert non-Error objects to string
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-skin-fill flex items-center justify-center">
        <div className="text-skin-accent">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-skin-fill flex items-center justify-center">
        <div className="text-skin-accent">Error: {error}</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-skin-fill flex items-center justify-center">
        <div className="text-skin-accent">Profile not found</div>
      </div>
    );
  }

  return <ProfileCard 
    user={profile} 
    onProfileUpdate={handleProfileUpdate}
  />;
}