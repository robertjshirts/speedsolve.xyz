import { STATUS_CODE } from "status";
import { Context, Next } from "oak";
import { z, ZodSchema } from "zod";

export const ProfilePostBody = z.object({
	id: z.string().length(30),
	username: z.string().min(3).max(15),
	email: z.string().email(),
	pfp: z.string().url().optional(),
});

export type ProfilePostBody = z.infer<typeof ProfilePostBody>;

export const ProfileUpdateBody = z.object({
	username: z.string().min(3).max(15).optional(),
	pfp: z.string().url().optional(),
});

export type ProfileUpdateBody = z.infer<typeof ProfileUpdateBody>;

export function validateBody<T>(schema: ZodSchema<T>) {
	return async (ctx: Context, next: Next) => {
		const body = await ctx.request.body.json();
		const { error, data } = schema.safeParse(body);

		if (error) {
			ctx.response.status = STATUS_CODE.BadRequest;
			ctx.response.body = error.errors;
			return;
		}

		ctx.state.validatedBody = data;
		await next();
	};
}
