export const generateScramble = (cube_type: CubeType) => {
	if (
		cube_type === CubeType.TWO_BY_TWO ||
		cube_type === CubeType.THREE_BY_THREE
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
