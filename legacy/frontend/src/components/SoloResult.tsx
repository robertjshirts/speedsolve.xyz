import { useTimeFormat } from '../hooks/useTimeFormat';
import { useSoloStore } from '../store';

export const SoloResult = ({ applyPenalty, startSession }: {
  applyPenalty: (penalty: "none" | "plus2" | "DNF") => void;
  startSession: () => void;
}) => {
  const { formatTime } = useTimeFormat();
  const result = useSoloStore(state => state.result);

  const getFormattedTime = (time: number, penalty: "none" | "plus2" | "DNF"): string => {
    const baseTime = formatTime(time);
    switch (penalty) {
      case 'plus2':
        return `${formatTime(time + 2000)}+`;
      case 'DNF':
        return `DNF(${baseTime})`;
      default:
        return baseTime;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h2 className="text-4xl font-bold text-skin-base text-center mb-8">Solve Result</h2>
      
      <div className="p-6 rounded-lg border-2 border-skin-accent">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium text-xl text-skin-base">
            Your Time
          </span>
          <span className="text-3xl font-mono text-skin-base">
            {getFormattedTime(result!.time, result!.penalty)}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center mt-8">
        <span className="text-xl font-medium text-skin-base mb-4">Adjust penalty</span>
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => applyPenalty('none')}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            N/A
          </button>
          <button
            onClick={() => applyPenalty('plus2')}
            className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
          >
            +2
          </button>
          <button
            onClick={() => applyPenalty('DNF')}
            className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            DNF
          </button>
        </div>
      </div>

      <div className="flex justify-center mt-8">
        <button 
          onClick={() => startSession()}
          className="px-8 py-4 bg-skin-accent text-skin-base rounded-lg hover:opacity-90 transition-opacity text-xl"
        >
          Solve Again
        </button>
      </div>
    </div>
  );
};