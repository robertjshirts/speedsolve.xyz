// ProfileCard.jsx
import React from 'react';
import Image from 'next/image';

const ProfileCard = ({ user }: { user: Profile }) => {
  const { username, email, bio, pfp, createdAt, updatedAt } = user;

  return (
    <div className="max-w-sm mx-auto bg-skin-fill border border-skin-base shadow-lg rounded-lg p-6">
      <Image
        src={pfp}
        alt={`${username}'s profile`}
        className="w-24 h-24 rounded-full mx-auto mb-4"
      />
      <h2 className="text-xl font-semibold text-skin-primary text-center mb-2">{username}</h2>
      <p className="text-skin-base text-center mb-4">{email}</p>
      <p className="text-skin-accent text-center italic mb-4">{bio}</p>
      <div className="text-skin-base text-sm text-center">
        <p>Joined: {new Date(createdAt).toLocaleDateString()}</p>
        <p>Last Updated: {new Date(updatedAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default ProfileCard;
