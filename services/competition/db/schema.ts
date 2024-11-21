import {
  integer,
  pgEnum,
  pgTable,
	text,
	timestamp,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const timestamps = {
	createdAt: timestamp().notNull().defaultNow(),
	updatedAt: timestamp().notNull().defaultNow(),
}

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
    ...timestamps,
  }, 
  (t) => [
    uniqueIndex("unique_username").on(t.username),
  ],
);

export const solves = pgTable(
  "solves", 
  {
    id: text("id").primaryKey(),
    time: integer("time").notNull(),
    scramble: text("scramble").notNull(),
    cube: dbCubeTypes("cube").notNull(),
    penalty: dbPenaltyTypes("penalty").notNull().default("none"),
    ...timestamps,
  },
);

export const soloSessions = pgTable(
  "solo_sessions", 
  {
    id: text("id").primaryKey(),
    participant_id: text("participant_id").references(() => profiles.id),
    solve_id: text("solve_id").references(() => solves.id),
    ...timestamps,
  },
);

export const multiSessions = pgTable(
  "multi_sessions", 
  {
    id: text("id").primaryKey(),
    winner_id: text("winner_id").references(() => profiles.id),
    ...timestamps,
  },
);

export const multiSessionSolves = pgTable(
  "multi_session_solves", 
  {
    session_id: text("session_id").references(() => multiSessions.id),
    participant_id: text("participant_id").references(() => profiles.id),
    solve_id: text("solve_id").references(() => solves.id),
    ...timestamps,
  }, 
  (t) => [
    primaryKey({ columns: [t.session_id, t.participant_id, t.solve_id] }),
  ],
);
