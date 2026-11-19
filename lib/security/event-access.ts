import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getAuthConfig } from "@/lib/auth";
import { getPublishedGate, type PublishedGate } from "@/lib/db/guest-events";
import { eventSlugSchema } from "@/lib/validation/wishes";

const cookieName = "wishvow_event_access";
const maxAge = 8 * 60 * 60;
const signature = (gate: PublishedGate, expires: number) =>
  createHmac("sha256", getAuthConfig().AUTH_SECRET)
    .update(
      JSON.stringify(["event-access-v1", gate.id, gate.passcodeHash, expires]),
    )
    .digest();

function validGrant(token: string, gate: PublishedGate) {
  const match = /^(\d{1,12})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return false;
  const expires = Number(match[1]);
  if (expires <= Math.floor(Date.now() / 1000)) return false;
  return timingSafeEqual(
    signature(gate, expires),
    Buffer.from(match[2], "base64url"),
  );
}

export async function guestAccess(slug: string) {
  if (!eventSlugSchema.safeParse(slug).success) return null;
  const gate = await getPublishedGate(slug);
  if (!gate) return null;
  if (gate.privacy === "unlisted") return { gate, allowed: true };
  const token = (await cookies()).get(cookieName)?.value;
  return { gate, allowed: Boolean(token && validGrant(token, gate)) };
}

export async function grantEventAccess(gate: PublishedGate) {
  const expires = Math.floor(Date.now() / 1000) + maxAge;
  const token = `${expires}.${signature(gate, expires).toString("base64url")}`;
  (await cookies()).set(cookieName, token, {
    path: `/e/${gate.slug}`,
    maxAge,
    httpOnly: true,
    sameSite: "lax",
    secure: getAuthConfig().APP_URL.startsWith("https://"),
  });
}

export async function passcodeRateKey(gate: PublishedGate) {
  const clientIp =
    process.env.VERCEL === "1"
      ? (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim()
      : null;
  const digest = createHmac("sha256", getAuthConfig().AUTH_SECRET)
    .update(
      JSON.stringify(["passcode-rate-v1", gate.id, clientIp ?? "unknown"]),
    )
    .digest("base64url");
  return `passcode:${digest}`;
}
