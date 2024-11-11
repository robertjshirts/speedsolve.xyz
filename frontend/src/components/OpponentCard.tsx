interface OpponentCardProps {
  opponent: Profile;
}

export function OpponentCard({ opponent }: OpponentCardProps) {
  const { username, pfp } = opponent;
  return (
    <div className="absolute bottom-4 left-4 flex flex-col items-center">
      <span className="text-skin-accent w-full mb-1 text-center font-medium">Opponent</span>
      {/* Opponent Card */}
      <div className="flex items-center gap-3 bg-skin-fill border border-skin-accent rounded-lg p-2 shadow-md">
        <img
          src={pfp || '/default-avatar.png'}
          alt={`${username}'s profile`}
          className="w-10 h-10 rounded-full object-cover border border-skin-accent"
        />
        <span className="text-skin-base font-medium">{username}</span>
      </div>
    </div>
  );
}