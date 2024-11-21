import { RouterContext } from "oak";
import { ProfilePostBody } from "./validation.ts";
import * as db from "./db/db.ts";
import { STATUS_CODE } from "status";

export const ProfilePostHandler = async (ctx: RouterContext<"/profile">) => {
	const body: ProfilePostBody = ctx.state.validatedBody;
	const { usernameTaken, emailTaken } = await db.checkProfileUsernameEmail(
		body.username,
		body.email,
	);

	if (usernameTaken || emailTaken) {
		let message = "";
		if (usernameTaken) {
			message += `Username ${body.username} is in use. `;
		}
		if (emailTaken) message += `Email ${body.email} is in use.`;
		ctx.response.body = message;
		ctx.response.status = STATUS_CODE.BadRequest;
		return;
	}

	try {
		const profile = await db.insertProfile(body);
		ctx.response.status = STATUS_CODE.Created;
		ctx.response.body = profile;
		return;
	} catch (e) {
		ctx.response.status = STATUS_CODE.InternalServerError;
		ctx.response.body = {
			error: "An error occured while creating the profile",
			details: e,
		};
	}
};

export const ProfileGetAllHandler = async (ctx: RouterContext<"/profile">) => {
	try {
		const profiles = await db.getProfiles();
		ctx.response.status = STATUS_CODE.OK;
		ctx.response.body = profiles;
	} catch (e) {
		ctx.response.status = STATUS_CODE.InternalServerError;
		ctx.response.body = {
			error: "An error occurred while getting all profiles",
			details: e,
		};
	}
};

export const ProfileGetHandler = async (
	ctx: RouterContext<"/profile/:username">,
) => {
	if (!ctx.params) {
		ctx.response.status = STATUS_CODE.BadRequest;
		ctx.response.body = { "error": "Username in path is required" };
		return;
	}

	const username = ctx.params.username;

	try {
		const profile = await db.getProfile(username);

		if (profile) {
			ctx.response.status = STATUS_CODE.OK;
			ctx.response.body = profile;
			return;
		} else {
			ctx.response.status = STATUS_CODE.NotFound;
			ctx.response.body = { error: "No profile found" };
		}
	} catch (e) {
		ctx.response.status = STATUS_CODE.InternalServerError;
		ctx.response.body = {
			error: "An error occurred while getting the profile",
			details: e,
		};
	}
};

export const ProfilePutHandler = async (
	ctx: RouterContext<"/profile/:username">,
) => {
	if (!ctx.params) {
		ctx.response.status = STATUS_CODE.BadRequest;
		ctx.response.body = { "error": "Username in path is required" };
		return;
	}

	// Get the username and body from the request
	const username = ctx.params.username;
	const body = ctx.state.validatedBody;
	if (!body) {
		ctx.response.status = STATUS_CODE.BadRequest;
		ctx.response.body = { "error": "Request body is required" };
		return;
	}

	try {
		// Get the profile from the database to ensure it exists
		const profile = await db.getProfile(username);
		if (!profile) {
			ctx.response.status = STATUS_CODE.NotFound;
			ctx.response.body = "Profile not found";
			return;
		}

		// Update the profile
		const updatedProfile = await db.updateProfile(username, body);
		ctx.response.status = STATUS_CODE.OK;
		ctx.response.body = updatedProfile;
	} catch (e) {
		console.log("error updating profile", e);
		ctx.response.status = STATUS_CODE.InternalServerError;
		ctx.response.body = {
			error: "An error occurred while updating the profile",
			details: e,
		};
	}
};

export const ProfileDeleteHandler = async (
	ctx: RouterContext<"/profile/:username">,
) => {
	if (!ctx.params) {
		ctx.response.status = STATUS_CODE.BadRequest;
		ctx.response.body = { "error": "Username in path is required" };
		return;
	}

	// Get the username from the path
	const username = ctx.params.username;

	try {
		// Get the profile from the database to ensure it exists
		const profile = await db.getProfile(username);
		if (!profile) {
			ctx.response.status = STATUS_CODE.NotFound;
			ctx.response.body = "Profile not found";
			return;
		}

		// Delete the profile
		await db.deleteProfile(username);
		ctx.response.status = STATUS_CODE.NoContent;
	} catch (e) {
		console.log("error deleting profile", e);
		ctx.response.status = STATUS_CODE.InternalServerError;
		ctx.response.body = {
			error: "An error occurred while deleting the profile",
			details: e,
		};
	}
};
