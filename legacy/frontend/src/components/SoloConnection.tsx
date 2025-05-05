import { useSoloStore } from '../store'

export const SoloConnection = ({
  connect,
  disconnect,
}: {
  connect: () => void;
  disconnect: () => void;
}) => {
  const wsStatus = useSoloStore(state => state.wsStatus);
  if (wsStatus === 'disconnected') {
    return (
      <div className="flex flex-col items-center justify-center h-[59vh]">
        <p className="text-xl text-skin-base mb-5">Connection lost to server</p>
        <button
          onClick={connect}
          className="bg-skin-accent text-skin-base px-7 py-3 rounded-lg hover:opacity-90 transition-opacity"
        >
          Reconnect
        </button>
      </div>
    );
  }

  if (wsStatus === 'connecting') {
    return (
      <div className="flex flex-col items-center justify-center h-[59vh]">
        <div className="w-13 h-12 border-4 border-skin-accent border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xl text-skin-base mb-5">Connecting to server...</p>
        <button
          onClick={disconnect}
          className="bg-skin-accent text-skin-base px-7 py-3 rounded-lg hover:opacity-90 transition-opacity"
        >
          Cancel connection
        </button>
      </div>
    );
  }

  return null
}