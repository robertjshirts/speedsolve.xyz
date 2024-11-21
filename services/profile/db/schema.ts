import {
  integer,
  pgEnum,
  pgTable,
	text,
	timestamp,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const dbCubeTypes = pgEnum("cube_types", ["3x3", "2x2", "4x4", "5x5", "6x6", "7x7"]);
export const dbPenaltyTypes = pgEnum("penalty_types", ["DNF", "plus2", "none"]);

export const profiles = pgTable(
  "profiles", 
  {
    id: text().primaryKey(),
    username: text().notNull(),
    email: text().notNull().unique(),
    bio: text(),
    pfp: text().default("https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Default_pfp.svg/2048px-Default_pfp.svg.png"),
    created_at: timestamp().notNull().defaultNow(),
  }, 
  (t) => [
    uniqueIndex("unique_username").on(t.username),
  ],
);

export const solves = pgTable(
  "solves", 
  {
    solve_id: text().primaryKey(),
    time: integer().notNull(),
    scramble: text().notNull(),
    cube: dbCubeTypes().notNull(),
    penalty: dbPenaltyTypes().notNull(),
    created_at: timestamp().notNull().defaultNow(),
  },
);

export const soloSessions = pgTable(
  "solo_sessions", 
  {
    solo_session_id: text().primaryKey(),
    participant_id: text().references(() => profiles.id),
    solve_id: text().references(() => solves.solve_id),
    created_at: timestamp().notNull().defaultNow(),
  },
);

export const multiSessions = pgTable(
  "multi_sessions", 
  {
    multi_session_id: text().primaryKey(),
    winner_id: text().references(() => profiles.id),
    created_at: timestamp().notNull().defaultNow(),
  },
);

export const multiSessionSolves = pgTable(
  "multi_session_solves", 
  {
    multi_session_id: text().references(() => multiSessions.multi_session_id),
    participant_id: text().references(() => profiles.id),
    solve_id: text().references(() => solves.solve_id),
    created_at: timestamp().notNull().defaultNow(),
  }, 
  (t) => [
    primaryKey({ columns: [t.multi_session_id, t.participant_id, t.solve_id] }),
  ],
);
