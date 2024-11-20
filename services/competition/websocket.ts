import { STATUS_CODE } from "status";
import { Router, type RouterContext } from "oak";
import { verifyAndParseJWT } from "./auth.ts";
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
    },
);

export default router;
