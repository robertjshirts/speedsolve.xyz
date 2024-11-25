// components/Scramble.tsx
import { useEffect } from 'react';

interface ScrambleProps {
  scramble: string;
}

export function Scramble({ scramble }: ScrambleProps) {
  return (
    <div className="w-full px-2 py-2 rounded shadow-sm bg-skin-off border border-skin-accent">
      <p className="text-center text-skin-base font-mono text-4xl tracking-tight">
        {scramble}
      </p>
    </div>
  );
}
