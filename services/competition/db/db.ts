import { drizzle } from "drizzle-orm/node-postgres";
import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { solves, soloSessions, multiSessions, multiSessionSolves, profiles } from "./schema.ts";
import { CubeType, Result } from "../types.ts";
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

interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: "time" | "created_at";
  sortOrder?: "asc" | "desc";
}

interface SolveFilters {
  scramble?: string;
  penaltyType?: "DNF" | "plus2" | "none";
  cubeType?: CubeType;
}

export async function getUserSolves(
  username: string,
  { page = 1, limit = 20, sortBy = "created_at", sortOrder = "desc" }: PaginationParams,
  filters?: SolveFilters
) {
  const offset = (page - 1) * limit;
  const conditions = [eq(solves.username, username)];

  if (filters?.scramble) {
    conditions.push(ilike(solves.scramble, `%${filters.scramble}%`));
  }
  if (filters?.penaltyType) {
    conditions.push(eq(solves.penalty, filters.penaltyType));
  }
  if (filters?.cubeType) {
    conditions.push(eq(solves.cube, filters.cubeType));
  }

  const orderClause = sortOrder === "asc" ? asc(solves[sortBy]) : desc(solves[sortBy]);

  const [records, totalCount] = await Promise.all([
    db.select()
      .from(solves)
      .where(and(...conditions))
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(solves)
      .where(and(...conditions))
  ]);

  return {
    records,
    pagination: {
      total: totalCount[0].count,
      page,
      limit,
      totalPages: Math.ceil(totalCount[0].count / limit)
    }
  };
}

export async function getSoloSession(sessionId: string) {
  const session = await db.select()
    .from(soloSessions)
    .where(eq(soloSessions.solo_session_id, sessionId))
    .leftJoin(solves, eq(soloSessions.solve_id, solves.solve_id));

  if (!session.length) return null;

  return session[0];
}

export async function getMultiSession(sessionId: string) {
  const [session, sessionSolves] = await Promise.all([
    db.select()
      .from(multiSessions)
      .where(eq(multiSessions.multi_session_id, sessionId)),
    db.select()
      .from(multiSessionSolves)
      .where(eq(multiSessionSolves.multi_session_id, sessionId))
      .leftJoin(solves, eq(multiSessionSolves.solve_id, solves.solve_id))
  ]);

  if (!session.length) return null;

  return {
    ...session[0],
    solves: sessionSolves
  };
}

interface SessionFilters {
  cubeType?: CubeType;
  username?: string;
}

export async function getSoloSessions(
  { page = 1, limit = 20, sortBy = "created_at", sortOrder = "desc" }: PaginationParams,
  filters?: SessionFilters
) {
  const offset = (page - 1) * limit;
  const conditions: any[] = [];

  if (filters?.username) {
    conditions.push(eq(solves.username, filters.username));
  }
  if (filters?.cubeType) {
    conditions.push(eq(solves.cube, filters.cubeType));
  }

  const orderClause = 
  sortBy === "time" 
    ? (sortOrder === "asc" ? asc(solves.time) : desc(solves.time))
    : (sortOrder === "asc" ? asc(soloSessions.created_at) : desc(soloSessions.created_at));

  const [records, totalCount] = await Promise.all([
    db.select()
      .from(soloSessions)
      .leftJoin(solves, eq(soloSessions.solve_id, solves.solve_id))
      .where(and(...conditions))
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(soloSessions)
      .leftJoin(solves, eq(soloSessions.solve_id, solves.solve_id))
      .where(and(...conditions))
  ]);

  return {
    records,
    pagination: {
      total: totalCount[0].count,
      page,
      limit,
      totalPages: Math.ceil(totalCount[0].count / limit)
    }
  };
}

export async function getMultiSessions(
  { page = 1, limit = 20, sortBy = "created_at", sortOrder = "desc" }: PaginationParams,
  filters?: SessionFilters
) {
  const offset = (page - 1) * limit;
  const conditions: any[] = [];

  if (filters?.username) {
    conditions.push(eq(solves.username, filters.username));
  }
  if (filters?.cubeType) {
    conditions.push(eq(solves.cube, filters.cubeType));
  }

  const orderClause = 
    sortBy === "time" 
      ? (sortOrder === "asc" ? asc(solves.time) : desc(solves.time))
      : (sortOrder === "asc" ? asc(multiSessions.created_at) : desc(multiSessions.created_at));

  const [records, totalCount] = await Promise.all([
    db.select()
      .from(multiSessions)
      .leftJoin(multiSessionSolves, eq(multiSessions.multi_session_id, multiSessionSolves.multi_session_id))
      .leftJoin(solves, eq(multiSessionSolves.solve_id, solves.solve_id))
      .where(and(...conditions))
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(multiSessions)
      .leftJoin(multiSessionSolves, eq(multiSessions.multi_session_id, multiSessionSolves.multi_session_id))
      .leftJoin(solves, eq(multiSessionSolves.solve_id, solves.solve_id))
      .where(and(...conditions))
  ]);

  return {
    records,
    pagination: {
      total: totalCount[0].count,
      page,
      limit,
      totalPages: Math.ceil(totalCount[0].count / limit)
    }
  };
}