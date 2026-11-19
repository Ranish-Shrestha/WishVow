import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

const port = process.env.WISHVOW_TEST_PORT ?? "3715";
const engine = new PGlite();
await migrate(drizzle(engine), { migrationsFolder: "drizzle" });
const database = new PGLiteSocketServer({
  db: engine,
  port: 0,
  maxConnections: 10,
});
await database.start();
const mediaDir = await mkdtemp(join(tmpdir(), "wishvow-media-"));

const next = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    port,
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      APP_URL: `http://127.0.0.1:${port}`,
      AUTH_SECRET: randomBytes(32).toString("base64url"),
      DATABASE_URL: `postgresql://postgres:postgres@${database.getServerConn()}/postgres`,
      DATABASE_DRIVER: "pg",
      STORAGE_PROVIDER: "local",
      EMAIL_PROVIDER: "local",
      HOST_EMAIL_VERIFICATION: "true",
      WISHVOW_LOCAL_MAIL_DIR: join(
        process.cwd(),
        "test-results",
        "wishvow-mail-" + port,
      ),
      WISHVOW_LOCAL_STORAGE_DIR: mediaDir,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
);

process.on("SIGTERM", () => next.kill());
process.on("SIGINT", () => next.kill());

try {
  const [code] = await once(next, "exit");
  process.exitCode = code ?? 0;
} finally {
  await database.stop();
  await engine.close();
  await rm(mediaDir, { recursive: true, force: true });
}
