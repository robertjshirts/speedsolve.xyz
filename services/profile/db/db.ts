import { drizzle } from "drizzle-orm/node-postgres";
import { eq, or } from "drizzle-orm";
import { solves, soloSessions, multiSessions, multiSessionSolves, profiles } from "./schema.ts";
import pg from "pg";

const { Pool } = pg;

export const db = drizzle({
  client: new Pool({ connectionString: Deno.env.get("PGURL")! }), 
  schema: { solves, soloSessions, multiSessions, multiSessionSolves, profiles }
});

export async function checkProfileUsernameEmail(username: string, email: string) {
  const profile = await db.query.profiles.findFirst({
    where: or(eq(profiles.username, username), eq(profiles.email, email)),
  });

  if (profile) {
    console.log(`Conflict found for ${username} or ${email}`);
    return {
      usernameTaken: profile.username === username,
      emailTaken: profile.email === email,
    };
  }

  return {
    usernameTaken: false,
    emailTaken: false,
  };
}

export async function insertProfile(profile: typeof profiles.$inferInsert) {
  const insertedProfile = await db.insert(profiles).values(profile).returning();
  return insertedProfile[0];
}

export async function deleteProfile(username: string) {
  return await db.delete(profiles).where(eq(profiles.username, username));
}

export async function updateProfile(username: string, profile: Partial<typeof profiles.$inferInsert>) {
  return await db.update(profiles).set(profile).where(eq(profiles.username, username)).returning();
}

export async function getProfile(username: string) {
  return await db.query.profiles.findFirst({ where: eq(profiles.username, username) });
}

export async function getProfiles() {
  return await db.query.profiles.findMany();
}