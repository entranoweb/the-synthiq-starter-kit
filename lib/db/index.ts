import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

// Supabase-compatible connection configuration
const client = postgres(DATABASE_URL, {
  prepare: false, // Required for Supabase
  max: 10,
  idle_timeout: 20,
});

export const db = drizzle(client, { schema });
