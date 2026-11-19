import "server-only";

import sharp from "sharp";
import { imageTypes, maxImageBytes } from "@/lib/validation/wishes";

const formats: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function prepareImage(file: File) {
  if (
    !imageTypes.some((type) => type === file.type) ||
    !file.size ||
    file.size > maxImageBytes
  )
    return null;
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 25_000_000,
      failOn: "error",
    });
    const metadata = await image.metadata();
    if (metadata.format !== formats[file.type] || (metadata.pages ?? 1) > 1)
      return null;
    return await image
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 79 })
      .toBuffer();
  } catch {
    return null;
  }
}
