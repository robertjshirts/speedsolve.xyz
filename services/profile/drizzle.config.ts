import { defineConfig } from "drizzle-kit";
import process from "node:process";

export default defineConfig({
	out: "./drizzle",
	schema: "./db/schema.ts",
	dialect: "postgresql",
	casing: "snake_case",
	dbCredentials: {
		url: process.env.PGURL!,
	},
});
