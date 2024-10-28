import { STATUS_CODE } from "status";
import { generateScramble } from "./scrambler.ts";

export class CompetitionStateManager {
	// Session keys are usernames, because users can only be in one session at a time
	// and it allows for easier parsing via jwt instead of session id
	private activeSessions: Map<string, CompetitionState> = new Map();
	private connections: Map<string, WebSocket> = new Map();
	// Queues for multiplayer, when implemented
	// private userQueues: Map<string, string[]> = new Map(); // cubeType -> usernames[]

	addConnection(username: string, ws: WebSocket) {
		this.connections.set(username, ws);
		this.activeSessions.delete(username);
		// TODO: remove user from any queues
	}

	handleDisconnect(username: string) {
		// TODO: handle multiplayer disconnect with websocket message
		// Remove user from queues
		this.activeSessions.delete(username);
		this.connections.delete(username);
	}

	// Solo session management
	handleSoloStart(username: string, cube_type: CubeType) {
		const session: CompetitionState = {
			id: crypto.randomUUID(),
			type: SessionType.SOLO,
			state: SessionState.SCRAMBLING,
			cube_type: cube_type,
			participants: [username],
			scramble: generateScramble(cube_type),
			results: [],
			start_time: null,
		};

		this.activeSessions.set(username, session);
		this.notifyUser(username, {
			type: "SESSION_UPDATE",
			payload: session,
		});
	}

	// Start solve
	handleReady(username: string) {
		const session = this.activeSessions.get(username);
		if (!session || session.state !== SessionState.SCRAMBLING) return null;

		if (session.type === SessionType.SOLO) {
			session.state = SessionState.SOLVING;
			session.start_time = Date.now();
			this.notifyUser(username, {
				type: "SESSION_UPDATE",
				payload: session,
			});
		} else {
			// TODO: implement this
		}
	}

	handleSolveComplete(username: string, result: any) {
		const session = this.activeSessions.get(username);
		if (!session || !session.start_time) return;

		const server_time = Date.now() - session.start_time;
		const time_diff = Math.abs(server_time - result.time);

		// Basic validation, if time_diff greater than 2 seconds, use server_time instead
		if (time_diff > 2000) {
			result.time = server_time;
		}

		// If solo, finish session
		if (session.type === SessionType.SOLO) {
			session.results = result;
			session.state = SessionState.COMPLETE;
			this.notifyUser(username, {
				type: "SESSION_UPDATE",
				payload: session,
			});
		}
	}

	private notifyUser(username: string, payload: any) {
		console.log(`to ${username}: ${payload}`);
		const ws = this.connections.get(username);
		if (ws) {
			ws.send(JSON.stringify(payload));
		}
	}

	private storeSolve(
		username: string,
		session: CompetitionState,
		payload: any,
	) {
		//TODO: impelement DAL
	}
}

//const competitions = new map<string, competition>();
//
//router.post("/comp", async (ctx: routercontext<"/comp">) => {
//	const body = await ctx.request.body.json();
//
//	if (!body.participants || body.participants.length !== 2) {
//		ctx.response.status = status_code.badrequest;
//		ctx.response.body = { error: "exactly 2 participants required" };
//		return;
//	}
//
//	const competition: competition = {
//		id: crypto.randomuuid(),
//		participants: body.participants,
//		readyparticipants: new set(),
//		scramble: generatescramble(),
//		state: "scrambling",
//		results: [],
//		createdat: new date(),
//	};
//
//	competitions.set(competition.id, competition);
//
//	ctx.response.body = competition;
//});
//
//router.get("/comp/:id", (ctx: routercontext<"/comp/:id">) => {
//	const competition = competitions.get(ctx.params.id);
//
//	if (!competition) {
//		ctx.response.status = status_code.notfound;
//		ctx.response.body = { error: "competition not found" };
//		return;
//	}
//
//	ctx.response.body = competition;
//});
//
//router.post(
//	"/comp/:id/ready",
//	async (ctx: routercontext<"/comp/:id/ready">) => {
//		const competition = competitions.get(ctx.params.id);
//		const body = await ctx.request.body.json();
//
//		if (!competition) {
//			ctx.response.status = status_code.notfound;
//			ctx.response.body = { error: "competition not found" };
//			return;
//		}
//
//		if (!body.userid) {
//			ctx.response.status = status_code.badrequest;
//			ctx.response.body = { error: "userid required" };
//			return;
//		}
//
//		if (competition.state !== "scrambling") {
//			ctx.response.status = status_code.badrequest;
//			ctx.response.body = { error: "competition not in scramble state!" };
//			return;
//		}
//
//		if (!competition.participants.includes(body.userid)) {
//			ctx.response.status = status_code.forbidden;
//			ctx.response.body = { error: "user not in competition" };
//			return;
//		}
//
//		// mark user as ready
//		competition.readyparticipants.add(body.userid);
//
//		if (
//			competition.readyparticipants.size ===
//				competition.participants.length
//		) {
//			competition.state = "solving";
//		} else {
//			competition.state = "scrambling";
//		}
//
//		ctx.response.status = status_code.ok;
//		ctx.response.body = {
//			...competition,
//			readyparticipants: array.from(competition.readyparticipants),
//		};
//	},
//);
//
//router.post(
//	"/comp/:id/results",
//	async (ctx: routercontext<"/comp/:id/results">) => {
//		const competition = competitions.get(ctx.params.id);
//		const body = await ctx.request.body.json();
//
//		if (!competition) {
//			ctx.response.status = 404;
//			ctx.response.body = { error: "competition not found" };
//			return;
//		}
//
//		if (!body.userid || !body.time) {
//			ctx.response.status = 400;
//			ctx.response.body = { error: "userid and time required" };
//			return;
//		}
//
//		if (competition.state !== "solving") {
//			ctx.response.status = status_code.badrequest;
//			ctx.response.body = {
//				error: "competition must be in solving state!",
//			};
//			return;
//		}
//
//		if (!competition.participants.includes(body.userid)) {
//			ctx.response.status = 403;
//			ctx.response.body = { error: "user not in competition" };
//			return;
//		}
//
//		if (
//			competition.results.some((result) => result.userid === body.userid)
//		) {
//			ctx.response.status = status_code.badrequest;
//			ctx.response.body = { error: "user already submitted time!" };
//			return;
//		}
//
//		competition.results.push({
//			userid: body.userid,
//			time: body.time,
//		});
//
//		if (competition.results.length === 2) {
//			competition.state = "complete";
//		}
//
//		ctx.response.body = competition;
//	},
//);
//
//export default router;
