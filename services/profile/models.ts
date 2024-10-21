import { DataTypes, Op, Sequelize } from "sequelize";

export const sequelize = new Sequelize(
	Deno.env.get("PGDATABASE")!,
	Deno.env.get("PGUSER")!,
	Deno.env.get("PGPASSWORD")!,
	{
		host: Deno.env.get("PGHOST")!,
		dialect: "postgres",
	},
);

// Sequelize model
export const ProfileDB = sequelize.define(
	"profile",
	{
		id: {
			type: DataTypes.STRING,
			primaryKey: true,
		},
		username: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
		},
		email: {
			type: DataTypes.STRING,
			unique: true,
			allowNull: false,
			validate: {
				isEmail: true,
			},
		},
		pfp: {
			type: DataTypes.STRING,
			allowNull: true,
			defaultValue:
				"https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Default_pfp.svg/2048px-Default_pfp.svg.png",
		},
	},
	{
		timestamps: true,
		underscored: true,
	},
);

// Helper function
export async function isUsernameOrEmailTaken(username: string, email: string) {
	try {
		const existingUser = await ProfileDB.findOne({
			where: {
				[Op.or]: [
					{ username: username },
					{ email: email },
				],
			},
		});

		if (existingUser) {
			return {
				usernameTaken: existingUser.get("username") === username,
				emailTaken: existingUser.get("email") === email,
			};
		}

		return { usernameTaken: false, emailTaken: false };
	} catch (error) {
		console.error("Error checking existing user:", error);
		throw error;
	}
}

// Validate connection to postgres
try {
	await sequelize.authenticate();
} catch (e) {
	console.error(e);
	Deno.exit(1);
}

// TODO: REMOVE
// sync DB and drop Profiles table
await sequelize.sync({ force: true });
