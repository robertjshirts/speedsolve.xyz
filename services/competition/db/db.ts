import { drizzle } from "drizzle-orm/node-postgres";
import { solves, soloSessions, multiSessions, multiSessionSolves, profiles } from "./schema.ts";
import pg from "pg";

const { Pool } = pg;

export const db = drizzle({
  client: new Pool({ connectionString: Deno.env.get("PGURL")! }), 
  schema: { solves, soloSessions, multiSessions, multiSessionSolves, profiles }
});

export async function upsertSolve(solve: typeof solves.$inferInsert) {
  await db.insert(solves)
    .values(solve)
    .onConflictDoUpdate({
      target: [solves.id],
      set: {
        time: solve.time,
        penalty: solve.penalty,
      },
    });
}

export async function upsertSoloSession(session: typeof soloSessions.$inferInsert) {
  await db.insert(soloSessions)
    .values(session)
    .onConflictDoUpdate({
      target: [soloSessions.id],
      set: session,
  });
}