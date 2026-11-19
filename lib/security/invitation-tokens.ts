import "server-only";

import { createHmac, randomUUID } from "node:crypto";
import { tokenHash } from "./guest-tokens";

export function invitationToken(id: string, version: string, secret: string) {
  return createHmac("sha256", secret)
    .update(JSON.stringify(["invitation-v1", id, version]))
    .digest("base64url");
}

export function newInvitationToken(id: string, secret: string) {
  const tokenVersion = randomUUID();
  return {
    tokenVersion,
    tokenHash: tokenHash(invitationToken(id, tokenVersion, secret)),
  };
}

export function invitationPath(token: string) {
  return `/invite/${token}`;
}
