import { STATUS_CODE } from "status";
import { Router, type RouterContext } from "oak";
import { verifyAndParseJWT } from "./auth.ts";
import { computeUserAverage } from "./average.ts";
import { SoloManager } from "./solo_manager.ts";
import { MultiManager } from "./multi_manager.ts";

const router = new Router();
const soloManager = new SoloManager();
const multiManager = new MultiManager();

router.get(
    "/competition/health",
    (ctx: RouterContext<"/competition/health">) => {
        console.log("health endpoint reached");
        ctx.response.status = STATUS_CODE.OK;
        return;
    },
);

router.get(
    "/competition/stats/:username",
    async (ctx: RouterContext<"/competition/stats/:username">) => {
        const username = ctx.params.username;
        const stats = await computeUserAverage(username);
        console.log("stats in handler", stats);
        ctx.response.status = STATUS_CODE.OK;
        ctx.response.body = {
            average_time: stats,
        };
        return;
    },
);

// Solo websocket endpoint
router.get("/competition/ws/solo",
    verifyAndParseJWT,
    (ctx: RouterContext<"/competition/ws/solo">) => {
        if (!ctx.isUpgradable) {
            ctx.throw(
                STATUS_CODE.BadRequest,
                "Connection must upgrade to websocket!",
            );
        }

        const ws = ctx.upgrade();
        const username = ctx.state.username;
        soloManager.addConnection(username, ws);

        console.log(`solo websocket connection established for ${username}`);

        ws.onclose = (event) => {
            console.log(
                `solo websocket connection closed for ${username}. reason: ${event.reason}`,
            );
            soloManager.handleDisconnect(username);
        };

        ws.onerror = (event) => {
            console.error(
                `solo websocket error for ${username}:`,
                event,
            );
            soloManager.handleDisconnect(username);
        };

        ws.onmessage = async (event) => {
            try {
                const message: SoloWebSocketMessage = JSON.parse(event.data);
                console.log(`Received solo message from ${username}:`, message.type);

                switch (message.type) {
                    case "SOLO_START":
                        soloManager.handleSoloStart(
                            username,
                            message.payload.cube_type,
                        );
                        break;
                    case "READY":
                        soloManager.handleReady(username);
                        break;
                    case "SOLVE_COMPLETE":
                        soloManager.handleSolveComplete(
                            username,
                            message.payload,
                        );
                        break;
                    case "PENALTY":
                        await soloManager.handlePenalty(
                            username,
                            message.payload.penalty,
                        );
                        break;
                    default:
                        console.warn(
                            `Unknown message type from ${username}:`,
                            message.type,
                        );
                        ws.send(JSON.stringify({
                            type: "ERROR",
                            payload: { message: "Unknown message type" },
                        }));
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

// Multi websocket endpoint
router.get("/competition/ws/multi",
    verifyAndParseJWT,
    (ctx: RouterContext<"/competition/ws/multi">) => {
        if (!ctx.isUpgradable) {
            ctx.throw(
                STATUS_CODE.BadRequest,
                "Connection must upgrade to websocket!",
            );
        }

        const ws = ctx.upgrade();
        const username = ctx.state.username;
        multiManager.addConnection(username, ws);

        console.log(`multi websocket connection established for ${username}`);

        ws.onclose = (event) => {
            console.log(
                `multi websocket connection closed for ${username}. reason: ${event.reason}`,
            );
            multiManager.handleDisconnect(username);
        };

        ws.onerror = (event) => {
            console.error(
                `multi websocket error for ${username}:`,
                event,
            );
            multiManager.handleDisconnect(username);
        };

        ws.onmessage = async (event) => {
            try {
                const message: MultiWebSocketMessage = JSON.parse(event.data);
                console.log(`Received multi message from ${username}:`, message.type);

                switch (message.type) {
                    case "QUEUE":
                        multiManager.handleQueue(
                            username,
                            message.payload.cube_type,
                        );
                        break;
                    case "READY":
                        multiManager.handleReady(username);
                        break;
                    case "SOLVE_COMPLETE":
                        multiManager.handleSolveComplete(
                            username,
                            message.payload,
                        );
                        break;
                    case "PENALTY":
                        await multiManager.handlePenalty(
                            username,
                            message.payload.penalty,
                        );
                        break;
                    case "LEAVE":
                        multiManager.handleLeave(username);
                        break;
                    case "RTC_OFFER":
                        multiManager.handleRTCOffer(username, message.payload);
                        break;
                    default:
                        console.warn(
                            `Unknown message type from ${username}:`,
                            message.type,
                        );
                        ws.send(JSON.stringify({
                            type: "ERROR",
                            payload: { message: "Unknown message type" },
                        }));
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
