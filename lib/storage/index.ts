import "server-only";

import { del, get, put } from "@vercel/blob";
import { randomUUID } from "node:crypto";

type ImageStream = ReadableStream<Uint8Array>;
export interface StorageProvider {
  uploadImage(key: string, data: Buffer): Promise<void>;
  deleteImage(key: string): Promise<void>;
  readImage(key: string): Promise<ImageStream | null>;
}

const webp = "image/webp";

function vercelStorage(): StorageProvider {
  return {
    async uploadImage(key, data) {
      await put(key, data, { access: "private", contentType: webp });
    },
    async deleteImage(key) {
      await del(key);
    },
    async readImage(key) {
      const result = await get(key, { access: "private" });
      return result?.statusCode === 200 ? result.stream : null;
    },
  };
}

async function provider() {
  switch (process.env.STORAGE_PROVIDER || "vercel_blob") {
    case "local":
      if (process.env.NODE_ENV === "development" && !process.env.VERCEL) {
        const { createLocalStorage } = await import("./local");
        return createLocalStorage();
      }
      throw new Error("Local image storage is development-only.");
    case "vercel_blob":
      return vercelStorage();
    default:
      throw new Error("Unknown image storage provider.");
  }
}

function imageKey(key: string) {
  if (!/^(?:wishes|invitations)\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.webp$/.test(key))
    throw new Error("Invalid image key.");
  return key;
}

export async function uploadImage(
  eventId: string,
  data: Buffer,
  namespace: "wishes" | "invitations" = "wishes",
) {
  const key = imageKey(`${namespace}/${eventId}/${randomUUID()}.webp`);
  try {
    await (await provider()).uploadImage(key, data);
  } catch (error) {
    console.error("WishVow image storage upload failed.", {
      namespace,
      errorType: error instanceof Error ? error.constructor.name : "Unknown",
      hasBlobStoreId: Boolean(process.env.BLOB_STORE_ID?.trim()),
      hasBlobReadWriteToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim()),
    });
    throw error;
  }
  return key;
}

export async function deleteImage(key: string) {
  return (await provider()).deleteImage(imageKey(key));
}

export function getImageUrl(wishPath: string) {
  return `${wishPath}/image`;
}

export async function readStoredImage(key: string) {
  return (await provider()).readImage(imageKey(key));
}

export async function imageResponse(key: string | null) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (!key) return new Response(null, { status: 404, headers });
  const stream = await readStoredImage(key);
  return stream
    ? new Response(stream, { headers: { ...headers, "Content-Type": webp } })
    : new Response(null, { status: 404, headers });
}
