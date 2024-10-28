import { Next, RouterContext } from "oak";
import * as jose from "jose";
import { STATUS_CODE } from "status";
export async function authMiddleware(
	ctx: RouterContext<"/profile/:username">,
	next: Next,
) {
	const authHeader = ctx.request.headers.get("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		ctx.response.status = 401;
		ctx.response.body = { error: "No token provided" };
		return;
	}

	const token = authHeader.split(" ")[1];

	try {
		// Verify JWT
		const JWKS = jose.createRemoteJWKSet(
			new URL(
				Deno.env.get("AUTH_ISSUER")! +
					".well-known/jwks.json",
			),
		)!;

		const { payload } = await jose.jwtVerify(
			token,
			JWKS,
			{
				issuer: Deno.env.get("AUTH_ISSUER")!,
				audience: Deno.env.get("AUTH_AUDIENCE")!,
			},
		);

		// If payload doesn't have namespace'd username, invalid token
		if (!payload["https://speedsolve.xyz/username"]) {
			ctx.response.status = STATUS_CODE.Unauthorized;
			ctx.response.body = {
				error:
					"Invalid token! Expected 'https://speedsolve.xyz/username' claim!",
			};
			return;
		}

		// If token username and path don't match, block request
		if (
			ctx.params?.username !==
				payload["https://speedsolve.xyz/username"]
		) {
			ctx.response.status = STATUS_CODE.Forbidden;
			ctx.response.body = {
				error:
					`You do not have permission to edit or delete ${ctx.params?.username}'s profile!`,
			};
			return;
		}

		await next();
	} catch (error) {
		console.error("Token verification failed:", error);
		console.error("Token: ", token);
		ctx.response.status = STATUS_CODE.Unauthorized;
		ctx.response.body = { error: "Invalid token" };
	}
}
