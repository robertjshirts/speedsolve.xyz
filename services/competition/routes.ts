import { STATUS_CODE } from "status";
import { Router, type RouterContext } from "oak";
import { generateScramble } from "./scrambler.ts";
import { error } from "console";

const router = new Router();

const competitions = new Map<string, Competition>();

// TODO: add a proper queueing system
router.post("/comp", async (ctx: RouterContext<"/comp">) => {
	const body = await ctx.request.body.json();

	if (!body.participants || body.participants.length !== 2) {
		ctx.response.status = STATUS_CODE.BadRequest;
		ctx.response.body = { error: "Exactly 2 participants required" };
		return;
	}

	const competition: Competition = {
		id: crypto.randomUUID(),
		participants: body.participants,
		readyParticipants: new Set(),
		scramble: generateScramble(),
		state: "scrambling",
		results: [],
		createdAt: new Date(),
	};

	competitions.set(competition.id, competition);

	ctx.response.body = competition;
});

router.get("/comp/:id", (ctx: RouterContext<"/comp/:id">) => {
	const competition = competitions.get(ctx.params.id);

	if (!competition) {
		ctx.response.status = STATUS_CODE.NotFound;
		ctx.response.body = { error: "competition not found" };
		return;
	}

	ctx.response.body = competition;
});

router.post(
	"/comp/:id/ready",
	async (ctx: RouterContext<"/comp/:id/ready">) => {
		const competition = competitions.get(ctx.params.id);
		const body = await ctx.request.body.json();

		if (!competition) {
			ctx.response.status = STATUS_CODE.NotFound;
			ctx.response.body = { error: "competition not found" };
			return;
		}

		if (!body.userId) {
			ctx.response.status = STATUS_CODE.BadRequest;
			ctx.response.body = { error: "userId required" };
			return;
		}

		if (competition.state !== "scrambling") {
			ctx.response.status = STATUS_CODE.BadRequest;
			ctx.response.body = { error: "competition not in scramble state!" };
			return;
		}

		if (competition.participants.includes(body.userId)) {
			ctx.response.status = STATUS_CODE.Forbidden;
			ctx.response.body = { error: "User not in competition" };
			return;
		}

		// mark user as ready
		competition.readyParticipants.add(body.userId);

		if (
			competition.readyParticipants.size ===
				competition.participants.length
		) {
			competition.state = "solving";
		} else {
			competition.state = "scrambling";
		}

		ctx.response.status = STATUS_CODE.OK;
		ctx.response.body = {
			...competition,
			readyParticipants: Array.from(competition.readyParticipants),
		};
	},
);

router.post(
	"/comp/:id/results",
	async (ctx: RouterContext<"/comp/:id/results">) => {
		const competition = competitions.get(ctx.params.id);
		const body = await ctx.request.body.json();

		if (!competition) {
			ctx.response.status = 404;
			ctx.response.body = { error: "Competition not found" };
			return;
		}

		if (!body.userId || !body.time) {
			ctx.response.status = 400;
			ctx.response.body = { error: "userId and time required" };
			return;
		}

		if (competition.state !== "solving") {
			ctx.response.status = STATUS_CODE.BadRequest;
			ctx.response.body = {
				error: "Competition must be in solving state!",
			};
			return;
		}

		if (!competition.participants.includes(body.userId)) {
			ctx.response.status = 403;
			ctx.response.body = { error: "User not in competition" };
			return;
		}

		if (
			competition.results.some((result) => result.userId === body.userId)
		) {
			ctx.response.status = STATUS_CODE.BadRequest;
			ctx.response.body = { error: "User already submitted time!" };
			return;
		}

		competition.results.push({
			userId: body.userId,
			time: body.time,
		});

		if (competition.results.length === 2) {
			competition.state = "complete";
		}

		ctx.response.body = competition;
	},
);

export default router;
