import "server-only";

import { Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as neonDrizzle } from "drizzle-orm/neon-serverless";
import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import { databaseEnv } from "@/lib/validation/environment";
import * as schema from "./schema";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
const shared = globalThis as typeof globalThis & { wishvowDb?: Database };

export function getDb(): Database {
  if (shared.wishvowDb) return shared.wishvowDb;

  const env = databaseEnv.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_DRIVER: process.env.DATABASE_DRIVER || undefined,
  });
  const hostname = new URL(env.DATABASE_URL).hostname;
  const driver =
    env.DATABASE_DRIVER ?? (hostname.endsWith(".neon.tech") ? "neon" : "pg");
  const options = {
    connectionString: env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 10_000,
  };

  shared.wishvowDb =
    driver === "neon"
      ? neonDrizzle(new NeonPool(options), { schema })
      : pgDrizzle(new Pool(options), { schema });
  return shared.wishvowDb;
}
