import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 10_000,
});

export const db = drizzle(pool);

