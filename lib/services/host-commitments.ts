import "server-only";

import { getDb } from "@/lib/db";
import { updateCommitment } from "@/lib/db/commitments";
import { findEventMembership } from "@/lib/db/events";
import {
  commitmentMetrics,
  commitmentWishOptions,
  hostCommitmentRows,
  hostCommitmentTarget,
  recordCommitmentAudit,
  writeReceipt,
} from "@/lib/db/host-commitments";
import type {
  CommitmentFilters,
  HostCommitmentUpdate,
} from "@/lib/validation/host-commitments";
import { parseMinor } from "@/lib/validation/wishes";
import { EventError, lockEditableEvent } from "./events";
import { fulfilmentOptions } from "./host-commitment-rules";

export async function getCommitmentDashboard(
  userId: string,
  eventId: string,
  filters: CommitmentFilters,
) {
  const db = getDb();
  const membership = await findEventMembership(db, userId, eventId);
  if (!membership) return null;
  const [rows, metrics, wishes] = await Promise.all([
    hostCommitmentRows(db, eventId, filters),
    commitmentMetrics(db, eventId, filters.wish),
    commitmentWishOptions(db, eventId),
  ]);
  return {
    event: membership.event,
    role: membership.role,
    rows,
    metrics,
    wishes,
  };
}

export async function updateHostCommitment(
  userId: string,
  eventId: string,
  id: string,
  input: HostCommitmentUpdate,
) {
  return getDb().transaction(async (tx) => {
    await lockEditableEvent(tx, userId, eventId);
    const row = await hostCommitmentTarget(tx, eventId, id);
    if (!row) throw new EventError("This commitment is unavailable.");
    const { commitment, email, receivedMinor } = row;
    if (input.intent === "receipt") {
      if (
        commitment.kind !== "pledge" ||
        commitment.status !== "active" ||
        !commitment.currency ||
        !commitment.amountMinor
      ) {
        throw new EventError("Record received amounts on active pledges.");
      }
      const amount = /^0+(?:\.0+)?$/.test(input.amount)
        ? 0
        : parseMinor(input.amount, commitment.currency);
      if (amount === null || amount > commitment.amountMinor) {
        throw new EventError(
          "Enter a received amount between zero and the pledged amount.",
        );
      }
      if (amount === (receivedMinor ?? 0)) return null;
      await writeReceipt(tx, id, commitment.currency, amount, userId);
      await recordCommitmentAudit(
        tx,
        id,
        userId,
        amount ? "receipt_updated" : "receipt_cleared",
      );
      return null;
    }

    if (commitment.status === input.intent) return null;
    if (
      !fulfilmentOptions(
        commitment.kind,
        commitment.status,
        receivedMinor ?? 0,
      ).includes(input.intent)
    ) {
      throw new EventError("This status change is no longer available.");
    }
    await updateCommitment(tx, id, {
      status: input.intent,
      ...(input.intent === "cancelled"
        ? { cancelledAt: new Date() }
        : { hostNote: input.note ?? commitment.hostNote }),
    });
    await recordCommitmentAudit(tx, id, userId, "status_" + input.intent);
    return input.intent === "cancelled" ? { id, email } : null;
  });
}

export async function revealCommitmentGiver(
  userId: string,
  eventId: string,
  id: string,
) {
  return getDb().transaction(async (tx) => {
    const member = await lockEditableEvent(tx, userId, eventId);
    if (member.role !== "owner" || !member.event.surpriseMode)
      throw new EventError("Giver details are unavailable.");
    const row = await hostCommitmentTarget(tx, eventId, id);
    if (!row?.commitment.verifiedAt || row.commitment.status === "fulfilled")
      throw new EventError("Giver details are unavailable.");
    await recordCommitmentAudit(tx, id, userId, "identity_revealed");
    return {
      name: row.commitment.displayName,
      email: row.email,
      message: row.commitment.message,
    };
  });
}
