export const generateScramble = () => {
	const moves = ["R", "L", "U", "D", "F", "B"];
	const modifiers = ["", "'", "2"];
	return Array.from({ length: 20 }, () => {
		const move = moves[Math.floor(Math.random() * moves.length)];
		const modifier =
			modifiers[Math.floor(Math.random() * modifiers.length)];
		return move + modifier;
	}).join(" ");
};
