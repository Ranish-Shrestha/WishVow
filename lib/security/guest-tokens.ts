import "server-only";

import { createHash, createHmac, randomUUID } from "node:crypto";
import type { PublishedGate } from "@/lib/db/guest-events";

export function tokenFor(
  purpose: "verify" | "manage",
  id: string,
  secret: string,
) {
  return createHmac("sha256", secret)
    .update(`wishvow:guest-token:v1:${purpose}:${id}`)
    .digest("base64url");
}

export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newGuestToken(purpose: "verify" | "manage", secret: string) {
  const id = randomUUID();
  const lifetime = purpose === "verify" ? 30 * 60_000 : 30 * 24 * 60 * 60_000;
  return {
    id,
    purpose,
    tokenHash: tokenHash(tokenFor(purpose, id, secret)),
    expiresAt: new Date(Date.now() + lifetime),
  };
}

export function accessStamp(gate: PublishedGate) {
  return tokenHash(JSON.stringify([gate.id, gate.privacy, gate.passcodeHash]));
}
