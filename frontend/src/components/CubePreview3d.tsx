import React, { useState, useCallback, useEffect } from 'react';

type Color = string;
type FaceKey = 'F' | 'B' | 'R' | 'L' | 'U' | 'D';
type FaceName = 'front' | 'back' | 'right' | 'left' | 'top' | 'bottom';

interface Colors {
  F: Color;
  B: Color;
  R: Color;
  L: Color;
  U: Color;
  D: Color;
}

interface FaceMap {
  F: FaceName;
  B: FaceName;
  R: FaceName;
  L: FaceName;
  U: FaceName;
  D: FaceName;
}

interface AffectedFace {
  face: FaceName;
  indices: number[];
}

interface FacePattern {
  rotating: FaceName;
  affected: AffectedFace[];
  clockwise: FaceName[];
  counterClockwise: FaceName[];
}

type FacePatterns = Record<FaceKey, FacePattern>;

interface CubeState {
  front: Color[];
  back: Color[];
  right: Color[];
  left: Color[];
  top: Color[];
  bottom: Color[];
}

interface Position {
  x: number;
  y: number;
}

interface FaceProps {
  colors: Color[];
  transform: string;
}

interface RubiksCube3DProps {
  scramble?: string;
}

const COLORS: Colors = {
  F: '#00ff00',  // Green (Front)
  B: '#0000ff',  // Blue (Back)
  R: '#ff0000',  // Red (Right)
  L: '#ffa500',  // Orange (Left)
  U: '#ffffff',  // White (Up/Top)
  D: '#ffff00',  // Yellow (Down/Bottom)
};

const FACE_MAP: FaceMap = {
  F: 'front',
  B: 'back',
  R: 'right',
  L: 'left',
  U: 'top',
  D: 'bottom'
};

const FACE_PATTERNS: FacePatterns = {
  R: {
    rotating: 'right',
    affected: [
      { face: 'front', indices: [2, 5, 8] },
      { face: 'top', indices: [2, 5, 8] },
      { face: 'back', indices: [6, 3, 0] },
      { face: 'bottom', indices: [2, 5, 8] }
    ],
    clockwise: ['front', 'bottom', 'back', 'top'],
    counterClockwise: ['front', 'top', 'back', 'bottom']
  },
  L: {
    rotating: 'left',
    affected: [
      { face: 'front', indices: [0, 3, 6] },
      { face: 'bottom', indices: [0, 3, 6] },
      { face: 'back', indices: [8, 5, 2] },
      { face: 'top', indices: [0, 3, 6] }
    ],
    clockwise: ['front', 'top', 'back', 'bottom'],
    counterClockwise: ['front', 'bottom', 'back', 'top']
  },
  U: {
    rotating: 'top',
    affected: [
      { face: 'front', indices: [0, 1, 2] },
      { face: 'right', indices: [0, 1, 2] },
      { face: 'back', indices: [0, 1, 2] },
      { face: 'left', indices: [0, 1, 2] }
    ],
    clockwise: ['front', 'right', 'back', 'left'],
    counterClockwise: ['front', 'left', 'back', 'right']
  },
  D: {
    rotating: 'bottom',
    affected: [
      { face: 'front', indices: [6, 7, 8] },
      { face: 'left', indices: [6, 7, 8] },
      { face: 'back', indices: [6, 7, 8] },
      { face: 'right', indices: [6, 7, 8] }
    ],
    clockwise: ['front', 'left', 'back', 'right'],
    counterClockwise: ['front', 'right', 'back', 'left']
  },
  F: {
    rotating: 'front',
    affected: [
      { face: 'top', indices: [6, 7, 8] },
      { face: 'right', indices: [0, 3, 6] },
      { face: 'bottom', indices: [2, 1, 0] },
      { face: 'left', indices: [8, 5, 2] }
    ],
    clockwise: ['top', 'left', 'bottom', 'right'],
    counterClockwise: ['top', 'right', 'bottom', 'left']
  },
  B: {
    rotating: 'back',
    affected: [
      { face: 'top', indices: [2, 1, 0] },
      { face: 'left', indices: [0, 3, 6] },
      { face: 'bottom', indices: [6, 7, 8] },
      { face: 'right', indices: [8, 5, 2] }
    ],
    clockwise: ['top', 'right', 'bottom', 'left'],
    counterClockwise: ['top', 'left', 'bottom', 'right']
  }
};

const VALID_MOVES = new Set(['F', "F'", 'B', "B'", 'R', "R'", 'L', "L'", 'U', "U'", 'D', "D'", 
                            'F2', 'B2', 'R2', 'L2', 'U2', 'D2']);

const initialCubeState: CubeState = {
  front: Array(9).fill(COLORS.F),
  back: Array(9).fill(COLORS.B),
  right: Array(9).fill(COLORS.R),
  left: Array(9).fill(COLORS.L),
  top: Array(9).fill(COLORS.U),
  bottom: Array(9).fill(COLORS.D),
};

export const CubePreview3d: React.FC<RubiksCube3DProps> = ({ scramble = '' }) => {
  const [cubeState, setCubeState] = useState<CubeState>(initialCubeState);
  const [rotation, setRotation] = useState<Position>({ x: -30, y: 45 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [lastPosition, setLastPosition] = useState<Position>({ x: 0, y: 0 });

  const rotateFace = (face: Color[], clockwise: boolean): Color[] => {
    const newFace = [...face];
    if (clockwise) {
      [
        newFace[0], newFace[1], newFace[2],
        newFace[3], newFace[4], newFace[5],
        newFace[6], newFace[7], newFace[8]
      ] = [
        newFace[6], newFace[3], newFace[0],
        newFace[7], newFace[4], newFace[1],
        newFace[8], newFace[5], newFace[2]
      ];
    } else {
      [
        newFace[0], newFace[1], newFace[2],
        newFace[3], newFace[4], newFace[5],
        newFace[6], newFace[7], newFace[8]
      ] = [
        newFace[2], newFace[5], newFace[8],
        newFace[1], newFace[4], newFace[7],
        newFace[0], newFace[3], newFace[6]
      ];
    }
    return newFace;
  };

  const rotateAnyFace = (state: CubeState, face: FaceKey, clockwise: boolean): CubeState => {
    const pattern = FACE_PATTERNS[face];
    if (!pattern) {
      console.error(`Invalid face: ${face}`);
      return state;
    }

    const newState = {
      front: [...state.front],
      back: [...state.back],
      right: [...state.right],
      left: [...state.left],
      top: [...state.top],
      bottom: [...state.bottom],
    };

    const rotatingFace = pattern.rotating;
    newState[rotatingFace] = rotateFace(state[rotatingFace], clockwise);
    const sequence = clockwise ? pattern.clockwise : pattern.counterClockwise;

    const faceIndicesMap = new Map<FaceName, number[]>();
    pattern.affected.forEach(({ face, indices }) => {
      faceIndicesMap.set(face, indices);
    });

    const firstFace = sequence[0];
    const firstIndices = faceIndicesMap.get(firstFace)!;
    const temp = firstIndices.map(i => state[firstFace][i]);

    for (let i = 0; i < sequence.length - 1; i++) {
      const currentFace = sequence[i];
      const nextFace = sequence[i + 1];
      const currentIndices = faceIndicesMap.get(currentFace)!;
      const nextIndices = faceIndicesMap.get(nextFace)!;

      currentIndices.forEach((targetIndex, j) => {
        newState[currentFace][targetIndex] = state[nextFace][nextIndices[j]];
      });
    }

    const lastFace = sequence[sequence.length - 1];
    const lastIndices = faceIndicesMap.get(lastFace)!;
    lastIndices.forEach((targetIndex, j) => {
      newState[lastFace][targetIndex] = temp[j];
    });

    return newState;
  };

  const processMove = useCallback((move: string): void => {
    const isDouble = move.endsWith('2');
    const isPrime = move.includes("'");
    const face = (isDouble ? move.slice(0, -1) : isPrime ? move.slice(0, -1) : move) as FaceKey;
    
    setCubeState(prevState => {
      let newState = rotateAnyFace(prevState, face, !isPrime);
      if (isDouble) {
        newState = rotateAnyFace(newState, face, !isPrime);
      }
      return newState;
    });
  }, []);

  const handleMouseDown = (e: React.MouseEvent): void => {
    setIsDragging(true);
    setLastPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent): void => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastPosition.x;
    const deltaY = e.clientY - lastPosition.y;
    setRotation({
      x: rotation.x - deltaY * 0.5,
      y: rotation.y + deltaX * 0.5
    });
    setLastPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = (): void => {
    setIsDragging(false);
  };

  const Face: React.FC<FaceProps> = ({ colors, transform }) => (
    <div 
      className="absolute grid grid-cols-3 gap-1 w-32 h-32"
      style={{ transform, transformStyle: 'preserve-3d' }}
    >
      {colors.map((color, i) => (
        <div 
          key={i}
          className="border border-black"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );

  useEffect(() => {
    setCubeState(initialCubeState);
    
    if (scramble) {
      const moves = scramble.trim().split(/\s+/);
      const timeouts: number[] = [];
      
      moves.forEach((move, index) => {
        if (!VALID_MOVES.has(move)) {
          console.error(`Invalid move in scramble: ${move}`);
          return;
        }
        const timeoutId = window.setTimeout(() => {
          processMove(move);
        }, index * 100);
        timeouts.push(timeoutId);
      });

      return () => {
        timeouts.forEach(id => window.clearTimeout(id));
      };
    }
  }, [scramble, processMove]);

  return (
    <div className="fixed bottom-4 right-4 w-96 h-96 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border-2 border-blue-500 shadow-xl p-4">
      <div 
        className="relative w-full h-full cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="absolute top-1/2 left-1/2 w-64 h-64"
          style={{
            transform: `rotateX( ${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transformStyle: 'preserve-3d',
            transformOrigin: 'center',
            margin: '-128px 0 0 -128px'
          }}
        >
          <Face colors={cubeState.front} transform="translateZ(64px)" />
          <Face colors={cubeState.back} transform="translateZ(-64px) rotateY(180deg)" />
          <Face colors={cubeState.right} transform="translateX(64px) rotateY(90deg)" />
          <Face colors={cubeState.left} transform="translateX(-64px) rotateY(-90deg)" />
          <Face colors={cubeState.top} transform="translateY(-64px) rotateX(90deg)" />
          <Face colors={cubeState.bottom} transform="translateY(64px) rotateX(-90deg)" />
        </div>
      </div>
    </div>
  );
};