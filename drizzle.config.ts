import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
import { databaseUrlSchema } from "./lib/validation/environment";

loadEnvConfig(process.cwd(), true);

const migrationUrl =
  process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
if (process.argv.includes("migrate") && !migrationUrl) {
  throw new Error(
    "Set DATABASE_URL or DATABASE_MIGRATION_URL before running migrations.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  ...(migrationUrl && {
    dbCredentials: { url: databaseUrlSchema.parse(migrationUrl) },
  }),
});
