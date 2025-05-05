// components/ProfileCard.tsx
import { Pencil } from 'lucide-react';
import { Modal } from './Modal';
import { useAuth } from '../hooks/useAuth';
import { useState } from 'react';
import { ProfileUpdateForm } from './ProfileUpdateForm';

interface ProfileCardProps {
  user: Profile;
  onProfileUpdate?: (updatedData: Partial<Profile>) => Promise<void>;
}

export function ProfileCard({ user, onProfileUpdate }: ProfileCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { user: authUser } = useAuth();
  const { username, email, bio, pfp, createdAt, updatedAt } = user;

  const isOwnProfile = authUser?.email === email;

  return (
    <>
      <div className="max-w-md mx-auto bg-skin-fill border-2 border-skin-accent shadow-xl rounded-xl p-8 transition duration-300 hover:shadow-2xl h-fit relative">
        {/* Edit Button */}
        {isOwnProfile && onProfileUpdate && (
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="absolute top-4 right-4 p-2 text-skin-accent hover:text-skin-primary transition duration-150 rounded-full hover:bg-skin-accent hover:bg-opacity-10"
            aria-label="Edit profile"
          >
            <Pencil className="h-5 w-5" />
          </button>
        )}

        {/* Profile Picture */}
        <div className="w-32 h-32 mx-auto mb-6 relative">
          <img
            src={pfp || '/default-avatar.png'} // Make sure to add a default avatar in your public folder
            alt={`${username}'s profile`}
            className="w-full h-full rounded-full object-cover border-4 border-skin-accent shadow-md"
          />
        </div>

        {/* Profile Info */}
        <h2 className="text-2xl font-bold text-skin-primary text-center mb-3 hover:text-skin-accent transition duration-150">
          {username}
        </h2>
        <p className="text-skin-base text-center mb-4 font-medium">{email}</p>
        
        {/* Decorative Line */}
        <div className="w-16 h-1 bg-skin-accent mx-auto mb-4 rounded-full"></div>
        
        {/* Bio */}
        <p className="text-skin-accent text-center italic mb-6 px-4 leading-relaxed">
          {bio}
        </p>

        {/* Dates */}
        <div className="text-skin-base text-sm text-center space-y-2 border-t border-skin-base pt-4">
          <p className="flex items-center justify-center gap-2">
            <span className="font-medium">Joined:</span>
            <span>{new Date(createdAt).toLocaleDateString()}</span>
          </p>
          <p className="flex items-center justify-center gap-2">
            <span className="font-medium">Last Updated:</span>
            <span>{new Date(updatedAt).toLocaleDateString()}</span>
          </p>
        </div>
      </div>

      {/* Edit Modal */}
      {onProfileUpdate && (
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-skin-primary text-center">
              Edit Profile
            </h2>
            <ProfileUpdateForm
              user={user}
              onClose={() => setIsEditModalOpen(false)}
              onSubmit={onProfileUpdate}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
