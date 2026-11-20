import nextEnv from "@next/env";
import { z } from "zod";

nextEnv.loadEnvConfig(process.cwd(), false);

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

const env = process.env;
const app = parseUrl(env.APP_URL);
const db = parseUrl(env.DATABASE_URL);
const isLoopback = (url) =>
  ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
const sender =
  env.EMAIL_FROM?.match(/^[^<>\r\n]+<([^<>\r\n]+)>$/)?.[1] ?? env.EMAIL_FROM;
const checks = {
  APP_URL: [
    app?.protocol === "https:" &&
      app.origin === env.APP_URL?.replace(/\/$/, "") &&
      !isLoopback(app),
    "Use the public HTTPS origin without a path or query.",
  ],
  AUTH_SECRET: [
    (env.AUTH_SECRET?.length ?? 0) >= 32,
    "Set a generated secret of at least 32 characters.",
  ],
  DATABASE_URL: [
    db &&
      ["postgresql:", "postgres:"].includes(db.protocol) &&
      db.username &&
      db.password &&
      !isLoopback(db) &&
      ["require", "verify-ca", "verify-full"].includes(
        db.searchParams.get("sslmode"),
      ),
    "Use a hosted PostgreSQL connection with TLS and credentials.",
  ],
  DATABASE_DRIVER: [
    !env.DATABASE_DRIVER || ["neon", "pg"].includes(env.DATABASE_DRIVER),
    "Use neon, pg, or omit for automatic selection.",
  ],
  DATABASE_MIGRATION_URL: [
    !env.DATABASE_MIGRATION_URL ||
      /^postgres(?:ql)?:\/\//.test(env.DATABASE_MIGRATION_URL),
    "Use a PostgreSQL migration connection or omit.",
  ],
  STORAGE_PROVIDER: [
    (env.STORAGE_PROVIDER || "vercel_blob") === "vercel_blob",
    "Use the private Vercel Blob adapter.",
  ],
  "BLOB_STORE_ID / BLOB_READ_WRITE_TOKEN": [
    !!(env.BLOB_STORE_ID?.trim() || env.BLOB_READ_WRITE_TOKEN?.trim()),
    "Connect the private Blob store with Vercel OIDC or set its read-write token.",
  ],
  EMAIL_PROVIDER: [
    (env.EMAIL_PROVIDER || "resend") === "resend",
    "Use the Resend adapter.",
  ],
  RESEND_API_KEY: [
    !!env.RESEND_API_KEY?.trim(),
    "Set a Resend key scoped to the environment.",
  ],
  EMAIL_FROM: [
    z.email().safeParse(sender).success,
    "Use a verified sender email or Name <email>.",
  ],
  PRIVACY_CONTACT_EMAIL: [
    z.email().safeParse(env.PRIVACY_CONTACT_EMAIL).success,
    "Provide an address where guests can request privacy help.",
  ],
};

const missing = Object.entries(checks).filter(([, [valid]]) => !valid);
if (missing.length) {
  for (const [key, [, guidance]] of missing)
    console.error(key + " — " + guidance);
  process.exitCode = 1;
} else {
  console.log(
    "Release configuration passed local validation. Verify the installed services on the HTTPS preview.",
  );
}
