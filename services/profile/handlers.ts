import { Context } from "oak";
import { ProfilePostBody } from "./validation.ts";
import * as db from "./models.ts";
import { STATUS_CODE } from "status";

export const ProfilePostHandler = async (ctx: Context) => {
	const body: ProfilePostBody = ctx.state.validatedBody;
	const { usernameTaken, emailTaken } = await db.isUsernameOrEmailTaken(
		body.username,
		body.email,
	);

	if (usernameTaken || emailTaken) {
		let message = "";
		if (usernameTaken) message += `Username ${body.username} is in use. `;
		if (emailTaken) message += `Email ${body.email} is in use.`;
		ctx.response.body = message;
		ctx.response.status = STATUS_CODE.BadRequest;
		return;
	}

	try {
		const profile = await db.ProfileDB.create(body);
		ctx.response.status = STATUS_CODE.Created;
		ctx.response.body = profile.toJSON();
		return;
	} catch (e) {
		ctx.response.status = STATUS_CODE.InternalServerError;
		ctx.response.body = {
			error: "An error occured while creating the profile",
			details: e,
		};
	}
};

export const ProfileGetHandler = async (ctx: Context) => {
	if (!ctx.params) {
		ctx.response.status = STATUS_CODE.BadRequest;
		ctx.response.body = { "error": "Username in path is required" };
		return;
	}

	const username = ctx.params.username;

	try {
		const profile = await db.ProfileDB.findOne({
			where: {
				username: username,
			},
		});

		if (profile) {
			ctx.response.status = STATUS_CODE.OK;
			ctx.response.body = profile.toJSON();
			return;
		} else {
			ctx.response.status = STATUS_CODE.NotFound;
			ctx.response.body = { error: "No profile found" };
		}
	} catch (e) {
		console.log("error fetching profile", e);
		ctx.response.status = STATUS_CODE.InternalServerError;
		ctx.response.body = String(e);
	}
};

export const ProfilePutHandler = async (ctx: Context) => {
	if (!ctx.params) {
		ctx.response.status = STATUS_CODE.BadRequest;
		ctx.response.body = { "error": "Username in path is required" };
		return;
	}

	const username = ctx.params.username;

	const body = ctx.state.validatedBody;
	if (!body) {
		ctx.response.status = STATUS_CODE.BadRequest;
		ctx.response.body = { "error": "Request body is required" };
		return;
	}

	try {
		let profile = await db.ProfileDB.findOne({
			where: {
				username: username,
			},
		});

		if (!profile) {
			ctx.response.status = STATUS_CODE.NotFound;
			return;
		}

		profile = await profile.update(body);
		ctx.response.status = STATUS_CODE.OK;
		ctx.response.body = profile?.toJSON();
	} catch (e) {
		console.log("error updating profile", e);
		ctx.response.status = STATUS_CODE.InternalServerError;
		ctx.response.body = {
			error: "An error occurred while updating the profile",
			details: e,
		};
	}
};

export const ProfileDeleteHandler = async (ctx: Context) => {
	if (!ctx.params) {
		ctx.response.status = STATUS_CODE.BadRequest;
		ctx.response.body = { "error": "Username in path is required" };
		return;
	}

	const username = ctx.params.username;

	const profile = await db.ProfileDB.findOne({
		where: {
			username: username,
		},
	});

	if (!profile) {
		ctx.response.status = STATUS_CODE.NotFound;
		ctx.response.body = "Profile not found";
		return;
	}

	await profile?.destroy();
	ctx.response.status = STATUS_CODE.NoContent;
};
