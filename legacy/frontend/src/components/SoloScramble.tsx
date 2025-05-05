import { useEffect } from "react";
import { useSoloStore } from "../store";
import { Scramble } from "./Scramble";
import { CubePreview3d } from "./CubePreview3d";

export const SoloScramble = ({ finishScramble }: { finishScramble: () => void }) => {
  const scramble = useSoloStore(state => state.scramble);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        finishScramble();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [finishScramble]);

  return (
    <div className="flex flex-col items-center gap-8">
      <Scramble scramble={scramble!} />
      <div className="h-[400px] w-[400px]">
        <CubePreview3d scramble={scramble!} />
      </div>
      <span>Press space to start solve</span>
    </div>
  );
};