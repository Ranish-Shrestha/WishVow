import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect } from "@playwright/test";

export const testMailDir = resolve(
  "test-results",
  `wishvow-mail-${process.env.WISHVOW_TEST_PORT ?? "3715"}`,
);

export async function receivedMail(email: string, subject: string) {
  let result: { to: string; subject: string; text: string } | undefined;
  await expect
    .poll(
      async () => {
        const names = await readdir(testMailDir).catch(
          (error: NodeJS.ErrnoException) => {
            if (error.code === "ENOENT") return [];
            throw error;
          },
        );
        for (const name of names) {
          if (!name.endsWith(".json")) continue;
          const stored = JSON.parse(
            await readFile(resolve(testMailDir, name), "utf8"),
          );
          if (stored.to === email && stored.subject === subject) {
            result = stored;
            return true;
          }
        }
        return false;
      },
      { timeout: 10_000 },
    )
    .toBe(true);
  return result!;
}
