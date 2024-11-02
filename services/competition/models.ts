import { DataTypes, Op, Sequelize } from "sequelize";

export const sequelize = new Sequelize(
	Deno.env.get("PGDATABASE")! as string,
	Deno.env.get("PGUSER")!,
	Deno.env.get("PGPASSWORD")!,
	{
		host: Deno.env.get("PGHOST")!,
		dialect: "postgres",
	},
);

export const SessionDB = sequelize.define(
	"session",
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: DataTypes.UUIDV4,
		},
		type: {
			type: DataTypes.ENUM("solo", "multi"),
			allowNull: false,
		},
		player_one: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		player_two: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		winner: {
			type: DataTypes.STRING,
			allowNull: true,
		},
	},
	{
		timestamps: true,
		underscored: true,
		indexes: [
			{
				unique: false,
				fields: ["player_one"],
			},
			{
				unique: false,
				fields: ["player_two"],
				where: {
					player_two: {
						[Op.not]: null,
					},
				},
			},
			{
				unique: false,
				fields: ["winner"],
				where: {
					winner: {
						[Op.not]: null,
					},
				},
			},
		],
	},
);

export const SolveDB = sequelize.define(
	"solve",
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: DataTypes.UUIDV4,
		},
		session_id: {
			type: DataTypes.UUID,
			allowNull: false,
		},
		scramble: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		username: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		time: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		penalty: {
			type: DataTypes.ENUM("DNF", "plus2", "none"),
			defaultValue: "none",
			allowNull: false,
		},
	},
	{
		timestamps: true,
		underscored: true,
		indexes: [
			{
				unique: false,
				fields: ["session_id"],
			},
			{
				unique: false,
				fields: ["username"],
			},
		],
	},
);

SessionDB.hasMany(SolveDB);

try {
	await sequelize.authenticate();
	console.log("Connection has been established successfully.");
} catch (error) {
	console.error("Unable to connect to the database:", error);
	Deno.exit(1);
}

await sequelize.sync({ force: true });
