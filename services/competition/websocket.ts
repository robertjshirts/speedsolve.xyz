import { STATUS_CODE } from "status";
import { Router, type RouterContext } from "oak";
import { generateScramble } from "./scrambler.ts";
import { verifyAndParseJWT } from "./auth.ts";
import { CompetitionStateManager } from "./competition_manager.ts";

const router = new Router();
const stateManager = new CompetitionStateManager();

router.get(
	"/competition/health",
	(ctx: RouterContext<"/competition/health">) => {
		console.log("health endpoint reached");
		ctx.response.status = STATUS_CODE.OK;
		return;
	},
);

router.get(
	"/competition/ws",
	verifyAndParseJWT,
	async (ctx: RouterContext<"/competition/ws">) => {
		if (!ctx.isUpgradable) {
			ctx.throw(
				STATUS_CODE.BadRequest,
				"Connection must upgrade to websocket!",
			);
		}

		const ws = ctx.upgrade();
		const username = ctx.state.username;
		stateManager.addConnection(username, ws);

		console.log(`websocket connection established for ${username}`);

		ws.onclose = (event) => {
			console.log(
				`websocket connection closed for ${username}. reason: ${event.reason}`,
			);
			stateManager.handleDisconnect(username);
		};

		ws.onmessage = (event) => {
			try {
				const message: WebSocketMessage = JSON.parse(event.data);

				// Log incoming messages for debugging
				console.log(`Received message from ${username}:`, message.type);

				switch (message.type) {
					case "SOLO_START":
						stateManager.handleSoloStart(
							username,
							message.payload.cubeType,
						);
						break;
					case "READY":
						stateManager.handleReady(username);
						break;
					case "SOLVE_COMPLETE":
						stateManager.handleSolveComplete(
							username,
							message.payload,
						);
						break;
					//case "MULTI_QUEUE":
					//  stateManager.handleMultiQueue(username, message.payload.cubeType);
					//  break;
					//case "LEAVE":
					//  stateManager.handleLeave(username);
					//  break;
					//case "REMATCH":
					//  stateManager.handleRematch(username);
					//  break;
					default:
						console.warn(
							`Unknown message type from ${username}:`,
							message.type,
						);
				}
			} catch (err) {
				console.error(
					`Error processing message from ${username}:`,
					err,
				);
				ws.send(JSON.stringify({
					type: "ERROR",
					payload: { message: "Invalid message format" },
				}));
			}
		};
	},
);

export default router;
