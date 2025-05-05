'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface ProfileUpdateFormProps {
  user: Profile;
  onClose: () => void;
  onSubmit?: (updatedData: Partial<Profile>) => Promise<void>;
}

const ProfileUpdateForm: React.FC<ProfileUpdateFormProps> = ({
  user,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    username: user.username,
    email: user.email,
    bio: user.bio,
    pfp: user.pfp
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Profile Picture Preview */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <Image
            src={formData.pfp}
            alt={`${formData.username}'s profile`}
            fill
            className="rounded-full object-cover border-2 border-skin-accent shadow-md"
          />
        </div>

        {/* Profile Picture URL Input */}
        <div className="space-y-2">
          <label htmlFor="pfp" className="block text-sm font-medium text-skin-primary">
            Profile Picture URL
          </label>
          <input
            type="url"
            id="pfp"
            name="pfp"
            value={formData.pfp}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-skin-base bg-skin-fill text-skin-base focus:border-skin-accent focus:ring-1 focus:ring-skin-accent transition duration-200"
          />
        </div>

        {/* Bio Input */}
        <div className="space-y-2">
          <label htmlFor="bio" className="block text-sm font-medium text-skin-primary">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 rounded-lg border border-skin-base bg-skin-fill text-skin-base focus:border-skin-accent focus:ring-1 focus:ring-skin-accent transition duration-200 resize-none"
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-4 border-t border-skin-base">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-skin-base hover:text-skin-accent transition duration-200 font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-skin-accent text-skin-base rounded-lg font-medium transition duration-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Updating...' : 'Update Profile'}
        </button>
      </div>
    </form>
  );
};

export default ProfileUpdateForm;