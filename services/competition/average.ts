import { Op, Sequelize } from "sequelize";
import { SolveDB } from "./models.ts";

interface AverageResult {
	average_time: string | null;
}

async function computeUserAverage(username: string) {
	try {
		const result = await SolveDB.findOne({
			attributes: [
				[
					Sequelize.fn(
						"AVG",
						Sequelize.literal(`
              "time"
            `),
					),
					"average_time",
				],
			],
			where: {
				username: username,
				penalty: {
					[Op.ne]: "DNF", // Exclude DNF solves from the average
				},
			},
			raw: true,
		}) as unknown as AverageResult;

		if (result && result.average_time !== null) {
			console.log(
				`Average time for user ${username}: ${
					parseFloat(result.average_time).toFixed(
						2,
					)
				} milliseconds`,
			);
			return parseFloat(result.average_time);
		} else {
			console.log(
				`No valid solves found for user ${username}.`,
			);
			return null;
		}
	} catch (error) {
		console.error("Error computing average time:", error);
		throw error;
	}
}

export { computeUserAverage };
