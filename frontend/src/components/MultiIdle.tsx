export const MultiIdle = ({ startQueue }: { startQueue: () => void}) => {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <button 
        onClick={startQueue}
        className="bg-skin-accent text-skin-base px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
      >
        Start Queue
      </button>
    </div>
  );
};