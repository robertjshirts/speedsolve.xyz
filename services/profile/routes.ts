import { Router } from "oak";
import * as v from "./validation.ts";
import * as h from "./handlers.ts";
import { authMiddleware } from "./auth.ts";

const router = new Router();
router.get("/profile/health", (ctx) => {
	ctx.response.status = 200;
});

router.post(
	"/profile",
	v.validateBody(v.ProfilePostBody),
	h.ProfilePostHandler,
);

router.get(
	"/profile",
	h.ProfileGetAllHandler,
);

router.get(
	"/profile/:username",
	h.ProfileGetHandler,
);

router.patch(
	"/profile/:username",
	v.validateBody(v.ProfileUpdateBody),
	authMiddleware,
	h.ProfilePutHandler,
);

router.delete(
	"/profile/:username",
	authMiddleware,
	h.ProfileDeleteHandler,
);

export default router;
