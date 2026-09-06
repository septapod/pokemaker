/**
 * Connection to the Neon Postgres that PokeTracker also uses.
 *
 * This replaces the Supabase client. That project was deleted, taking the
 * database, the stored artwork and the user accounts with it, so PokeMaker now
 * lives in the same database as the tracker: one identity, one set of
 * creatures, and no cross-service API between the two apps.
 */

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema.js";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
export { schema };
