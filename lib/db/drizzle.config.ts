import { defineConfig } from "drizzle-kit";
import path from "path";

/**
 * Migrations run DDL, so they need the SESSION pooler (5432), not the
 * transaction pooler the app uses at runtime (6543). Transaction mode does not
 * hold prepared statements or DDL reliably and fails in confusing ways.
 */
const migrationUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error("DIRECT_URL or DATABASE_URL must be set to run migrations");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
  out: path.join(__dirname, "./migrations"),
});
