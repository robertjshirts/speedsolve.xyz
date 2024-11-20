import { DataTypes, Op, Sequelize } from "sequelize";

class Database {
	private static instance: Sequelize;

	static getInstance(): Sequelize {
		if (!this.instance) {
			console.log("Connecting to database at ", Deno.env.get("PGHOST")!);
			this.instance = new Sequelize(
				Deno.env.get("PGDATABASE")!,
				Deno.env.get("PGUSER")!,
				Deno.env.get("PGPASSWORD")!,
				{
					host: Deno.env.get("PGHOST")!,
					dialect: "postgres",
				},
			);
		}
		return this.instance;
	}

	static defineModels() {
		const sequelize = this.getInstance();
		const SolveDB = sequelize.define(
			"solve",
			{
				solve_id: {
					type: DataTypes.UUID,
					primaryKey: true,
					allowNull: false,
					defaultValue: DataTypes.UUIDV4,
				},
				username: {
					type: DataTypes.STRING,
					allowNull: false,
				},
				scramble: {
					type: DataTypes.STRING,
					allowNull: false,
				},
				type: {
					type: DataTypes.ENUM("solo", "multi"),
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
				cube: {
					type: DataTypes.ENUM("2x2", "3x3"),
					allowNull: false,
				}
			},
			{
				timestamps: true,
				underscored: true,
				indexes: [
					{ unique: false, fields: ["username"] },
				],
			},
		);
		const CompetitionDB = sequelize.define(
			"competition",
			{
				id: {
					type: DataTypes.UUID,
					primaryKey: true,
					allowNull: false,
					defaultValue: DataTypes.UUIDV4,
				},
				winner: {
					type: DataTypes.STRING,
					allowNull: false,
				},
			},
		);
		const ParticipantsDB = sequelize.define(
			"participants",
			{
				competition_id: {
					type: DataTypes.UUID,
					allowNull: false,
					primaryKey: true,
					references: {
						model: CompetitionDB,
						key: "id",
					},
				},
				solve_id: {
					type: DataTypes.UUID,
					allowNull: false,
					primaryKey: true,
					references: {
						model: SolveDB,
						key: "solve_id",
					},
				},
				participant: {
					type: DataTypes.STRING,
					allowNull: false,
				},
			},
			{
				timestamps: true,
				underscored: true,
				indexes: [
					{ unique: false, fields: ["competition_id"] },
					{ unique: false, fields: ["solve_id"] },
					{ unique: false, fields: ["participant"] },
				],
			}
		);

		// TODO: add relationships
		CompetitionDB.hasMany(ParticipantsDB);
	}

	static async initialize(): Promise<void> {
		try {
			const sequelize = this.getInstance();
			await sequelize.authenticate();
			console.log("Connection has been established successfully.");

			// Define models
			this.defineModels();
			// Sync models
			// TODO: remove force after finalizing schema
			await sequelize.sync({ force: true });
		} catch (error) {
			console.error("Unable to connect to the database:", error);
			Deno.exit(1);
		}
	}
}

export default Database;
