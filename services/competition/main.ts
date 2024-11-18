import "dotenv";
import { Application } from "oak";

import router from "./websocket.ts";
import Database from "./models.ts";

await Database.initialize();

const app = new Application();

const ALLOWED_ORIGINS = ["http://localhost:3000", "https://speedsolve.xyz", "https://react.speedsolve.xyz"];
app.use(async (ctx, next) => {
	const origin = ctx.request.headers.get("origin");
	if (origin && ALLOWED_ORIGINS.includes(origin)) {
		ctx.response.headers.set(
			"Access-Control-Allow-Origin",
			origin,
		);
	}
	ctx.response.headers.set(
		"Access-Control-Allow-Methods",
		"GET, POST, PATCH, DELETE, OPTIONS",
	);
	ctx.response.headers.set(
		"Access-Control-Allow-Headers",
		"Content-Type, Authorization",
	);

	if (ctx.request.method === "OPTIONS") {
		ctx.response.status = 200;
		return;
	}

	await next();
});
app.use(router.routes());
app.use(router.allowedMethods());

const port = Number(Deno.env.get("COMPETITION_PORT")) | 8000;
console.log(`Server runing on port ${port}`);

await app.listen({ port: port });
