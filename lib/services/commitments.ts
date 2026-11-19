import "server-only";

import { getDb, type Database } from "@/lib/db";
import {
  activeToken,
  consumeToken,
  currentCommitment,
  findGuest,
  findGuestToken,
  getOrCreateGuest,
  insertCommitment,
  insertToken,
  lockCommitmentTarget,
  revokeTokens,
  updateCommitment,
  usedCapacity,
  type TokenRow,
} from "@/lib/db/commitments";
import type { PublishedGate } from "@/lib/db/guest-events";
import {
  accessStamp,
  newGuestToken,
  tokenFor,
  tokenHash,
} from "@/lib/security/guest-tokens";
import type {
  CommitmentRequest,
  TermsInput,
} from "@/lib/validation/commitments";
import {
  CommitmentError,
  fitsCapacity,
  readWishTerms,
} from "./commitment-rules";

function isUsable(token: TokenRow, now = new Date()) {
  return !token.revokedAt && !token.consumedAt && token.expiresAt > now;
}

function deriveExisting(
  purpose: "verify" | "manage",
  token: TokenRow | null,
  secret: string,
) {
  if (!token) return null;
  const value = tokenFor(purpose, token.id, secret);
  return token.tokenHash === tokenHash(value) ? value : null;
}

type Target = NonNullable<Awaited<ReturnType<typeof lockCommitmentTarget>>>;
const isBookable = ({ event, wish }: Target) =>
  event.status === "published" && wish.isVisible && !wish.archivedAt;

async function managementMail(
  tx: Database,
  commitmentId: string,
  secret: string,
) {
  const active = await activeToken(tx, commitmentId, "manage");
  let token = deriveExisting("manage", active, secret);
  if (!token) {
    await revokeTokens(tx, commitmentId, "manage");
    const replacement = newGuestToken("manage", secret);
    await insertToken(tx, commitmentId, replacement);
    token = tokenFor("manage", replacement.id, secret);
  }
  return {
    type: "manage" as const,
    token,
    id: commitmentId,
    key: `manage/${commitmentId}/${Math.floor(Date.now() / 600_000)}`,
  };
}

export async function recoverCommitment(
  gate: PublishedGate,
  wishId: string,
  email: string,
  secret: string,
) {
  return getDb().transaction(async (tx) => {
    const target = await lockCommitmentTarget(tx, gate.id, wishId);
    if (
      !target ||
      !isBookable(target) ||
      accessStamp(target.event) !== accessStamp(gate)
    )
      return null;
    const guestId = await findGuest(tx, gate.id, email);
    if (!guestId) return null;
    const row = await currentCommitment(tx, wishId, guestId);
    return row?.verifiedAt ? managementMail(tx, row.id, secret) : null;
  });
}

export async function requestCommitment(
  gate: PublishedGate,
  wishId: string,
  input: CommitmentRequest,
  secret: string,
) {
  return getDb().transaction(async (tx) => {
    const target = await lockCommitmentTarget(tx, gate.id, wishId);
    if (
      !target ||
      !isBookable(target) ||
      accessStamp(target.event) !== accessStamp(gate)
    ) {
      throw new CommitmentError(
        "This wish is unavailable. Reopen its wishlist and try again.",
      );
    }
    const { wish } = target;
    const terms = readWishTerms(wish, input);
    if (!fitsCapacity(wish, terms, await usedCapacity(tx, wish.id))) {
      throw new CommitmentError(
        "That quantity or amount is no longer available. Refresh the wish and try again.",
      );
    }
    const guestId = await getOrCreateGuest(tx, gate.id, input.email);
    const existing = await currentCommitment(tx, wishId, guestId);

    if (existing && existing.status !== "pending_verification")
      return managementMail(tx, existing.id, secret);

    if (existing) {
      const active = await activeToken(tx, existing.id, "verify");
      const currentToken = deriveExisting("verify", active, secret);
      if (
        active &&
        currentToken &&
        existing.accessStamp === accessStamp(gate)
      ) {
        return {
          type: "verify" as const,
          token: currentToken,
          id: existing.id,
          key: `verify/${active.id}`,
        };
      }
      await updateCommitment(tx, existing.id, { status: "expired" });
      await revokeTokens(tx, existing.id, "verify");
    }

    const verification = newGuestToken("verify", secret);
    const commitment = await insertCommitment(tx, {
      ...terms,
      eventId: gate.id,
      wishId,
      guestId,
      displayName: input.displayName,
      accessStamp: accessStamp(gate),
      expiresAt: verification.expiresAt,
    });
    await insertToken(tx, commitment.id, verification);
    return {
      type: "verify" as const,
      token: tokenFor("verify", verification.id, secret),
      id: commitment.id,
      key: `verify/${verification.id}`,
    };
  });
}

export async function verificationPage(token: string) {
  const row = await findGuestToken(getDb(), tokenHash(token), "verify");
  if (
    !row ||
    row.commitment.status !== "pending_verification" ||
    !isUsable(row.token)
  )
    return null;
  const { displayName, kind, quantity, amountMinor, currency } = row.commitment;
  return { displayName, kind, quantity, amountMinor, currency };
}

export async function confirmCommitment(token: string, secret: string) {
  const hash = tokenHash(token);
  const db = getDb();
  const first = await findGuestToken(db, hash, "verify");
  if (!first || !isUsable(first.token)) return { status: "invalid" as const };

  return db.transaction(async (tx) => {
    const target = await lockCommitmentTarget(
      tx,
      first.commitment.eventId,
      first.commitment.wishId,
    );
    if (!target) return { status: "invalid" as const };
    const row = await findGuestToken(tx, hash, "verify");
    const now = new Date();
    if (
      !row ||
      row.commitment.status !== "pending_verification" ||
      !isUsable(row.token, now)
    ) {
      return { status: "invalid" as const };
    }
    await consumeToken(tx, row.token.id, now);

    if (
      !isBookable(target) ||
      accessStamp(target.event) !== row.commitment.accessStamp ||
      !fitsCapacity(
        target.wish,
        row.commitment,
        await usedCapacity(tx, target.wish.id),
      )
    ) {
      await updateCommitment(tx, row.commitment.id, { status: "expired" });
      return {
        status: "unavailable" as const,
        email: row.email,
        id: row.commitment.id,
      };
    }

    await updateCommitment(tx, row.commitment.id, {
      status: "active",
      verifiedAt: now,
    });
    const management = newGuestToken("manage", secret);
    await insertToken(tx, row.commitment.id, management);
    return {
      status: "confirmed" as const,
      email: row.email,
      id: row.commitment.id,
      token: tokenFor("manage", management.id, secret),
    };
  });
}

export async function managedCommitment(token: string) {
  const row = await findGuestToken(getDb(), tokenHash(token), "manage");
  if (!row || !row.commitment.verifiedAt || !isUsable(row.token)) return null;
  const {
    kind,
    status,
    quantity,
    amountMinor,
    currency,
    message,
    allowPublicName,
    expectedFulfilmentDate,
  } = row.commitment;
  return {
    kind,
    status,
    quantity,
    amountMinor,
    currency,
    message,
    allowPublicName,
    expectedFulfilmentDate,
    wishTitle: row.wishTitle,
    wishType: row.wishType,
    canCancel: status === "active" && !row.receivedMinor,
    canEdit:
      status === "active" &&
      row.eventStatus === "published" &&
      row.visible &&
      !row.archivedAt,
  };
}

export async function changeCommitment(
  token: string,
  input: TermsInput | null,
) {
  const hash = tokenHash(token);
  const db = getDb();
  const first = await findGuestToken(db, hash, "manage");
  if (!first || !isUsable(first.token))
    throw new CommitmentError("This management link is invalid or expired.");
  return db.transaction(async (tx) => {
    const target = await lockCommitmentTarget(
      tx,
      first.commitment.eventId,
      first.commitment.wishId,
    );
    const row = target && (await findGuestToken(tx, hash, "manage"));
    if (!target || !row || !isUsable(row.token))
      throw new CommitmentError("This management link is invalid or expired.");
    if (!input && row.commitment.status === "cancelled") return null;
    if (row.commitment.status !== "active")
      throw new CommitmentError("This commitment can no longer be changed.");

    if (!input) {
      if (row.receivedMinor)
        throw new CommitmentError(
          "Contact the host to resolve the recorded received amount before cancelling.",
        );
      await updateCommitment(tx, row.commitment.id, {
        status: "cancelled",
        cancelledAt: new Date(),
      });
      return { email: row.email, id: row.commitment.id };
    }
    if (!isBookable(target))
      throw new CommitmentError("This wish can only be cancelled now.");
    const terms = readWishTerms(target.wish, input);
    if (row.receivedMinor && (terms.amountMinor ?? 0) < row.receivedMinor) {
      throw new CommitmentError(
        "The pledge cannot be lower than the amount the host recorded as received.",
        "amount",
      );
    }
    if (
      !fitsCapacity(
        target.wish,
        terms,
        await usedCapacity(tx, target.wish.id, row.commitment.id),
      )
    ) {
      throw new CommitmentError(
        "That quantity or amount is no longer available. Try a smaller value.",
      );
    }
    await updateCommitment(tx, row.commitment.id, terms);
    return null;
  });
}
