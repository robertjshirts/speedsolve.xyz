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
		const ProfileDB = sequelize.define(
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
				bio: {
					type: DataTypes.TEXT,
					allowNull: true,
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
		const SolveDB = sequelize.define(
			"solve",
			{
				solve_id: {
					type: DataTypes.UUID,
					primaryKey: true,
					allowNull: false,
					defaultValue: DataTypes.UUIDV4,
				},
				scramble: {
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
				cube: {
					type: DataTypes.ENUM("2x2", "3x3"),
					allowNull: false,
				}
			},
			{
				timestamps: true,
				underscored: true,
			},
		);
		const MultiSessionDB = sequelize.define(
			"multi_session",
			{
				session_id: {
					type: DataTypes.UUID,
					primaryKey: true,
					allowNull: false,
					defaultValue: DataTypes.UUIDV4,
				},
				winner_id: {
					type: DataTypes.STRING,
					allowNull: false,
					references: {
						model: SolveDB,
						key: "solve_id",
					},
				},
			},
		);
		const MultiSessionSolvesDB = sequelize.define(
			"multi_session_solves",
			{
				session_id: {
					type: DataTypes.UUID,
					allowNull: false,
					primaryKey: true,
					references: {
						model: MultiSessionDB,
						key: "session_id",
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
				participant_id: {
					type: DataTypes.STRING,
					allowNull: false,
					primaryKey: true,
					references: {
						model: ProfileDB,
						key: "id",
					},
				},
			},
		)
		return { ProfileDB, SolveDB, MultiSessionDB, MultiSessionSolvesDB };
	}

	static async initialize(): Promise<void> {
		try {
			const sequelize = this.getInstance();
			await sequelize.authenticate();
			console.log("Connection has been established successfully.");

			// Define models
			const { ProfileDB, SolveDB, MultiSessionDB, MultiSessionSolvesDB } = this.defineModels();
			// Sync models
			await ProfileDB.sync();
			// TODO: remove force after finalizing schema
			await SolveDB.sync({ force: true });
			await MultisessionDB.sync({ force: true });
			await ParticipantsDB.sync({ force: true });
		} catch (error) {
			console.error("Unable to connect to the database:", error);
			Deno.exit(1);
		}
	}
}

export default Database;
