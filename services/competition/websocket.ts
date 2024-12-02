import { STATUS_CODE } from "status";
import { Router, type RouterContext } from "oak";
import { verifyAndParseJWT } from "./auth.ts";
import * as db from "./db/db.ts";
import { SoloManager } from "./solo_manager.ts";
import { MultiManager } from "./multi_manager.ts";
import { logger } from "./logger.ts";

const router = new Router();
const soloManager = new SoloManager();
const multiManager = new MultiManager();

router.get(
  "/competition/health",
  (ctx: RouterContext<"/competition/health">) => {
    logger.debug("Health check");
    ctx.response.status = STATUS_CODE.OK;
    return;
  },
);

// Get user's solves
router.get(
  "/competition/solves/:username",
  async (ctx: RouterContext<"/competition/solves/:username">) => {
    if (!ctx.params) {
      ctx.response.status = STATUS_CODE.BadRequest;
      ctx.response.body = { error: "Username in path is required" };
      return;
    }

    try {
      const page = parseInt(ctx.request.url.searchParams.get("page") ?? "1");
      const limit = parseInt(ctx.request.url.searchParams.get("limit") ?? "20");
      const sortBy = ctx.request.url.searchParams.get("sortBy") ?? "created_at";
      const sortOrder = ctx.request.url.searchParams.get("sortOrder") ?? "desc";
      const scramble = ctx.request.url.searchParams.get("scramble") ??
        undefined;
      const penaltyType = ctx.request.url.searchParams.get("penaltyType") as
        | "DNF"
        | "plus2"
        | "none"
        | undefined;
      const cubeType = ctx.request.url.searchParams.get("cubeType") as
        | "3x3"
        | "2x2"
        | undefined;

      const solves = await db.getUserSolves(
        ctx.params.username,
        {
          page,
          limit,
          sortBy: sortBy as "time" | "created_at",
          sortOrder: sortOrder as "asc" | "desc",
        },
        { scramble, penaltyType, cubeType },
      );
      const avg = await db.getUserAverageTime(ctx.params.username, {
        scramble,
        penaltyType,
        cubeType,
      });

      ctx.response.status = STATUS_CODE.OK;
      ctx.response.body = {
        average: avg,
        ...solves,
      };
    } catch (e) {
      logger.error("Error getting solves", { error: e });
      ctx.response.status = STATUS_CODE.InternalServerError;
      ctx.response.body = {
        error: "An error occurred while getting solves",
        details: e,
      };
    }
  },
);

// Get solo session details
router.get(
  "/competition/sessions/solo/:sessionId",
  async (ctx: RouterContext<"/competition/sessions/solo/:sessionId">) => {
    if (!ctx.params) {
      ctx.response.status = STATUS_CODE.BadRequest;
      ctx.response.body = { error: "Session ID in path is required" };
      return;
    }

    try {
      const session = await db.getSoloSession(ctx.params.sessionId);

      if (!session) {
        ctx.response.status = STATUS_CODE.NotFound;
        ctx.response.body = { error: "Session not found" };
        return;
      }

      ctx.response.status = STATUS_CODE.OK;
      ctx.response.body = session;
    } catch (e) {
      logger.error("Error getting solo session", { error: e });
      ctx.response.status = STATUS_CODE.InternalServerError;
      ctx.response.body = {
        error: "An error occurred while getting the solo session",
        details: e,
      };
    }
  },
);

// Get multi session details
router.get(
  "/competition/sessions/multi/:sessionId",
  async (ctx: RouterContext<"/competition/sessions/multi/:sessionId">) => {
    if (!ctx.params) {
      ctx.response.status = STATUS_CODE.BadRequest;
      ctx.response.body = { error: "Session ID in path is required" };
      return;
    }

    try {
      const session = await db.getMultiSession(ctx.params.sessionId);

      if (!session) {
        ctx.response.status = STATUS_CODE.NotFound;
        ctx.response.body = { error: "Session not found" };
        return;
      }

      ctx.response.status = STATUS_CODE.OK;
      ctx.response.body = session;
    } catch (e) {
      logger.error("Error getting multi session", { error: e });
      ctx.response.status = STATUS_CODE.InternalServerError;
      ctx.response.body = {
        error: "An error occurred while getting the multi session",
        details: e,
      };
    }
  },
);

// Get solo sessions list
router.get(
  "/competition/sessions/solo",
  async (ctx: RouterContext<"/competition/sessions/solo">) => {
    try {
      const page = parseInt(ctx.request.url.searchParams.get("page") ?? "1");
      const limit = parseInt(ctx.request.url.searchParams.get("limit") ?? "20");
      const sortBy = ctx.request.url.searchParams.get("sortBy") ?? "created_at";
      const sortOrder = ctx.request.url.searchParams.get("sortOrder") ?? "desc";
      const username = ctx.request.url.searchParams.get("username") ??
        undefined;
      const cubeType = ctx.request.url.searchParams.get("cubeType") as
        | "3x3"
        | "2x2"
        | undefined;

      const sessions = await db.getSoloSessions(
        {
          page,
          limit,
          sortBy: sortBy as "time" | "created_at",
          sortOrder: sortOrder as "asc" | "desc",
        },
        { username, cubeType },
      );

      ctx.response.status = STATUS_CODE.OK;
      ctx.response.body = sessions;
    } catch (e) {
      logger.error("Error getting solo sessions", { error: e });
      ctx.response.status = STATUS_CODE.InternalServerError;
      ctx.response.body = {
        error: "An error occurred while getting solo sessions",
        details: e,
      };
    }
  },
);

// Get multi sessions list
router.get(
  "/competition/sessions/multi",
  async (ctx: RouterContext<"/competition/sessions/multi">) => {
    try {
      const page = parseInt(ctx.request.url.searchParams.get("page") ?? "1");
      const limit = parseInt(ctx.request.url.searchParams.get("limit") ?? "20");
      const sortBy = ctx.request.url.searchParams.get("sortBy") ?? "created_at";
      const sortOrder = ctx.request.url.searchParams.get("sortOrder") ?? "desc";
      const username = ctx.request.url.searchParams.get("username") ??
        undefined;
      const cubeType = ctx.request.url.searchParams.get("cubeType") as
        | "3x3"
        | "2x2"
        | undefined;

      const sessions = await db.getMultiSessions(
        {
          page,
          limit,
          sortBy: sortBy as "time" | "created_at",
          sortOrder: sortOrder as "asc" | "desc",
        },
        { username, cubeType },
      );

      ctx.response.status = STATUS_CODE.OK;
      ctx.response.body = sessions;
    } catch (e) {
      logger.error("Error getting multi sessions", { error: e });
      ctx.response.status = STATUS_CODE.InternalServerError;
      ctx.response.body = {
        error: "An error occurred while getting multi sessions",
        details: e,
      };
    }
  },
);

// Solo websocket endpoint
router.get(
  "/competition/ws/solo",
  verifyAndParseJWT,
  (ctx: RouterContext<"/competition/ws/solo">) => {
    if (!ctx.isUpgradable) {
      logger.error("Connection not upgradable", {
        username: ctx.state.username,
      });
      ctx.throw(
        STATUS_CODE.BadRequest,
        "Connection must upgrade to websocket!",
      );
    }

    const ws = ctx.upgrade();
    const username = ctx.state.username;
    ws.onopen = () => {
      logger.info("Websocket connection opened", { username });
      soloManager.addConnection(username, ws);
    };
  },
);

// Multi websocket endpoint
router.get(
  "/competition/ws/multi",
  verifyAndParseJWT,
  (ctx: RouterContext<"/competition/ws/multi">) => {
    if (!ctx.isUpgradable) {
      logger.error("Connection not upgradable", {
        username: ctx.state.username,
      });
      ctx.throw(
        STATUS_CODE.BadRequest,
        "Connection must upgrade to websocket!",
      );
    }

    const ws = ctx.upgrade();
    const username = ctx.state.username;
    ws.onopen = () => {
      logger.info("Websocket connection opened", { username });
      multiManager.addConnection(username, ws);
    };
  },
);

export default router;
