import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

// Parse DATABASE_URL for explicit connection params (Supabase compatibility)
const databaseUrl = process.env.DATABASE_URL!;
const url = new URL(databaseUrl);

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    host: url.hostname,
    port: parseInt(url.port),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1), // Remove leading '/'
    ssl: {
      rejectUnauthorized: false, // Allow self-signed certificates for Supabase
    },
  },
});
