import "server-only";

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EmailMessage } from "./index";

export async function saveLocalEmail(message: EmailMessage) {
  const inbox = path.resolve(
    process.env.WISHVOW_LOCAL_MAIL_DIR || ".wishvow-mail",
  );
  await mkdir(inbox, { recursive: true });
  const id = createHash("sha256").update(message.key).digest("hex");
  try {
    await writeFile(
      path.join(inbox, `${id}.json`),
      JSON.stringify({ ...message, sentAt: new Date() }),
      { flag: "wx", mode: 0o600 },
    );
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST"))
      throw error;
  }
}
