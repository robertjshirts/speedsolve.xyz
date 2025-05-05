import { CubeType } from "./types.ts";

export function generateScramble(cube_type: CubeType): string {
	if (
		cube_type === "3x3" ||
		cube_type === "2x2"
	) {
		return generateScrambleFor3x3();
	}
	return "R U R' U'";
};

function generateScrambleFor3x3(): string {
	const turnMoves = ['U', 'D', 'R', 'L', 'F', 'B'];

    const hasDone: string[] = [];

    const scramble: string[] = [];

    for (let i = 0; i < 20; i += 1) {
        let move = turnMoves[Math.floor(Math.random() * turnMoves.length)];
        
        let y = 0;
            
        while (hasDone.includes(move)) {
            y++;
            move = turnMoves[Math.floor(Math.random() * turnMoves.length)];
        }

        if (move == 'U' || move == 'D' || move == 'F') {
            delete hasDone[hasDone.indexOf('R')];
            delete hasDone[hasDone.indexOf('L')];
        } else if (move == 'R' || move == 'L') {
            delete hasDone[hasDone.indexOf('U')];
            delete hasDone[hasDone.indexOf('D')];
            delete hasDone[hasDone.indexOf('F')];
        }

        if (!hasDone.includes(move)) {
            hasDone.push(move);
        }

        const isPrime = Math.floor(Math.random() * 2);
        const is2 = Math.floor(Math.random() * 2);

        if (isPrime)
            move += '\'';
        else if (is2)
            move += '2';

        scramble.push(move);
    } 

	return scramble.join(' ');
};