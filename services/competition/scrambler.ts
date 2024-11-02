export const generateScramble = (cube_type: CubeType) => {
	if (
		cube_type === "3x3" ||
		cube_type === "2x2"
	) {
		const moves = ["R", "L", "U", "D", "F", "B"];
		const modifiers = ["", "'", "2"];
		return Array.from({ length: 20 }, () => {
			const move = moves[Math.floor(Math.random() * moves.length)];
			const modifier =
				modifiers[Math.floor(Math.random() * modifiers.length)];
			return move + modifier;
		}).join(" ");
	}
	return "R U R' U'";
};
