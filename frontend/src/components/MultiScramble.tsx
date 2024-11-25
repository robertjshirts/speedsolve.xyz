import { useMultiStore } from '../store';
import { Scramble } from './Scramble';
import { CubePreview3d } from './CubePreview3d';

export const MultiScramble = ({ finishScramble }: { finishScramble: () => void }) => {
  const scramble = useMultiStore(state => state.scramble);

  return (
    <div className="flex flex-col items-center gap-8">
      <Scramble scramble={scramble!} />
      <div className="h-[400px] w-[400px]">
        <CubePreview3d scramble={scramble!} />
      </div>
      <button
        onClick={finishScramble}
        className="bg-green-500 text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
      >
        Ready to solve
      </button>
    </div>
  );
};
