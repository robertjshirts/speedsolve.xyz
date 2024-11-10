// components/Scramble.tsx
import { useEffect } from 'react';

interface ScrambleProps {
  scramble: string;
}

export function Scramble({ scramble }: ScrambleProps) {
  return (
    <div className="w-full p-2 rounded shadow-sm bg-gray-800">
      <p className="text-center text-gray-800 dark:text-white font-mono text-4xl">
        {scramble}
      </p>
    </div>
  );
}