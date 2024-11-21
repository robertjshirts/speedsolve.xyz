import { drizzle } from "drizzle-orm/node-postgres";
import { solves, soloSessions, multiSessions, multiSessionSolves, profiles } from "./schema.ts";
import pg from "pg";

const { Pool } = pg;

export const db = drizzle({
  client: new Pool({ connectionString: Deno.env.get("PGURL")! }), 
  schema: { solves, soloSessions, multiSessions, multiSessionSolves, profiles }
});
