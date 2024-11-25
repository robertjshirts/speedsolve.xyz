export const SoloIdle = ({ startSession }: { startSession: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <button
        onClick={startSession}
        className="bg-skin-accent text-skin-base px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
      >
        Start Session
      </button>
    </div>
  );
}