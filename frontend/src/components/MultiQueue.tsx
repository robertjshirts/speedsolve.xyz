export const MultiQueue = ({ cancelQueue }: { cancelQueue: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <div className="w-12 h-12 border-4 border-skin-accent border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-xl text-skin-base">Finding opponent...</p>
      <button 
        onClick={cancelQueue}
        className="mt-4 bg-red-500 text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
      >
        Cancel Queue
      </button>
    </div>
  );
};