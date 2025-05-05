import { useTimeFormat } from '../hooks/useTimeFormat';
import { useAuth } from '../hooks/useAuth';
import { useMultiStore } from '../store';

export const MultiResult = ({ applyPenalty, startQueue }: {
  applyPenalty: (penalty: "none" | "plus2" | "DNF") => void;
  startQueue: () => void;
}) => {
  const { formatTime } = useTimeFormat();
  const { user } = useAuth();
  const results = useMultiStore(state => state.results);

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

  const determineWinner = (): string | null => {
    if (Object.keys(results).length < 2) return null;

    const resultsArray = Object.entries(results);
    const [player1, player2] = resultsArray;

    if (player1[1].penalty === 'DNF') return player2[0];
    if (player2[1].penalty === 'DNF') return player1[0];

    const time1 = player1[1].penalty === 'plus2' ? player1[1].time + 2000 : player1[1].time;
    const time2 = player2[1].penalty === 'plus2' ? player2[1].time + 2000 : player2[1].time;

    if (time1 < time2) return player1[0];
    if (time2 < time1) return player2[0];
    return 'tie';
  };

  const winner = determineWinner();

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h2 className="text-4xl font-bold text-skin-base text-center mb-8">Race Results</h2>
      
      <div className="space-y-6">
        {Object.entries(results).map(([username, result]) => {
          const isSelf = username === user?.username;
          const isWinner = winner === username;

          return (
            <div 
              key={username}
              className={`p-6 rounded-lg border-2 ${
                isWinner 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : 'border-skin-accent'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-xl">
                  {isSelf ? 'You' : username}
                  {isWinner && ' 🏆'}
                </span>
                <span className="text-3xl font-mono">
                  {getFormattedTime(result.time, result.penalty)}
                </span>
              </div>
            </div>
          );
        })}

        {winner === 'tie' && (
          <div className="text-center text-xl font-medium text-skin-accent">
            It's a tie!
          </div>
        )}
      </div>

      {user?.username && results[user.username] && (
        <div className="flex flex-col items-center mt-8">
          <span className="text-xl font-medium text-skin-base mb-4">Adjust your penalty</span>
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
      )}

      <div className="flex justify-center mt-8">
        <button 
          onClick={() => startQueue()}
          className="px-8 py-4 bg-skin-accent text-skin-base rounded-lg hover:opacity-90 transition-opacity text-xl"
        >
          Queue Again
        </button>
      </div>
    </div>
  );
};