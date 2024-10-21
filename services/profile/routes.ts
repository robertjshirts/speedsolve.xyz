import { Router } from "oak";
import * as v from "./validation.ts";
import * as h from "./handlers.ts";
import { authMiddleware } from "./auth.ts";

const router = new Router();
router.get("/", (ctx) => {
	ctx.response.body = "Hello, world! :)";
});

router.post(
	"/profile",
	v.validateBody(v.ProfilePostBody),
	h.ProfilePostHandler,
);

router.get(
	"/profile/:username",
	h.ProfileGetHandler,
);

router.put(
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
