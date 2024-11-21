import { drizzle } from "drizzle-orm/node-postgres";
import { solves, soloSessions, multiSessions, multiSessionSolves, profiles } from "./schema.ts";
import pg from "pg";

const { Pool } = pg;

export const db = drizzle({
  client: new Pool({ connectionString: Deno.env.get("PGURL")! }), 
  schema: { solves, soloSessions, multiSessions, multiSessionSolves, profiles }
});

export async function upsertMultiSession(multiSession: typeof multiSessions.$inferInsert) {
  await db.insert(multiSessions).values(multiSession).onConflictDoUpdate({
    target: [multiSessions.multi_session_id],
    set: {
      winner: multiSession.winner,
    },
  });
}

export async function upsertMultiSessionSolve(multiSessionSolve: typeof multiSessionSolves.$inferInsert) {
  await db.insert(multiSessionSolves).values(multiSessionSolve).onConflictDoNothing();
}

export async function upsertSolve(solve: typeof solves.$inferInsert) {
  await db.insert(solves).values(solve).onConflictDoUpdate({
    target: [solves.solve_id],
    set: {
      penalty: solve.penalty,
    },
  });
}

export async function upsertSoloSession(soloSession: typeof soloSessions.$inferInsert) {
  await db.insert(soloSessions).values(soloSession).onConflictDoNothing();
}

