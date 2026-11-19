import "server-only";

import { mkdir, open, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { StorageProvider } from "./index";

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export function createLocalStorage(): StorageProvider {
  const root = path.resolve(
    process.env.WISHVOW_LOCAL_STORAGE_DIR || ".wishvow-storage",
  );
  return {
    async uploadImage(key, data) {
      const file = path.join(root, key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, data, { flag: "wx" });
    },
    async deleteImage(key) {
      try {
        await unlink(path.join(root, key));
      } catch (error) {
        if (!isMissing(error)) throw error;
      }
    },
    async readImage(key) {
      try {
        const file = await open(path.join(root, key));
        return Readable.toWeb(
          file.createReadStream(),
        ) as ReadableStream<Uint8Array>;
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
    },
  };
}
