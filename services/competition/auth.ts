import { Next, Context } from "oak";
import * as jose from "jose";
import { STATUS_CODE } from "status";

export async function verifyAndParseJWT(
	ctx: Context,
	next: Next,
) {
	const token = ctx.request.url.searchParams.get("token");
	if (!token) {
		ctx.throw(
			STATUS_CODE.Unauthorized,
			"'token' must be present in searchParams!",
		);
	}

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

		// Store username and user_id in context. Persists through request.
		ctx.state.username = payload["https://speedsolve.xyz/username"];
		ctx.state.user_id = payload.sub;

		await next();
	} catch (error) {
		console.error("Token verification failed:", error);
		console.error("Token: ", token);
		ctx.response.status = STATUS_CODE.Unauthorized;
		ctx.response.body = { error: "Invalid token" };
	}
}
