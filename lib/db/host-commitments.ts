import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { Database } from "./index";
import {
  commitmentAudit,
  commitments,
  contributionReceipts,
  events,
  guests,
  wishes,
} from "./schema";
import type {
  CommitmentFilters,
  CommitmentStatus,
} from "@/lib/validation/host-commitments";

const effectiveStatus = sql<CommitmentStatus>`case when ${commitments.status} = 'pending_verification' and ${commitments.expiresAt} <= now() then 'expired' else ${commitments.status} end`;
const masked = sql`(${commitments.verifiedAt} is null or (${events.surpriseMode} and ${commitments.status} <> 'fulfilled'))`;
const privateText = (
  column:
    | typeof commitments.displayName
    | typeof commitments.message
    | typeof guests.emailNormalized,
) => sql<string | null>`case when ${masked} then null else ${column} end`;

export const commitmentPageSize = 25;

export function hostCommitmentRows(
  db: Database,
  eventId: string,
  filters: CommitmentFilters,
) {
  return db
    .select({
      id: commitments.id,
      wishTitle: wishes.title,
      kind: commitments.kind,
      status: effectiveStatus,
      quantity: commitments.quantity,
      amountMinor: commitments.amountMinor,
      currency: commitments.currency,
      name: privateText(commitments.displayName),
      email: privateText(guests.emailNormalized),
      message: privateText(commitments.message),
      expectedDate: commitments.expectedFulfilmentDate,
      hostNote: commitments.hostNote,
      receivedMinor: contributionReceipts.amountMinor,
      createdAt: commitments.createdAt,
    })
    .from(commitments)
    .innerJoin(events, eq(events.id, commitments.eventId))
    .innerJoin(wishes, eq(wishes.id, commitments.wishId))
    .innerJoin(guests, eq(guests.id, commitments.guestId))
    .leftJoin(
      contributionReceipts,
      eq(contributionReceipts.commitmentId, commitments.id),
    )
    .where(
      and(
        eq(commitments.eventId, eventId),
        filters.wish ? eq(commitments.wishId, filters.wish) : undefined,
        filters.kind ? eq(commitments.kind, filters.kind) : undefined,
        filters.status
          ? sql`${effectiveStatus} = ${filters.status}`
          : undefined,
      ),
    )
    .orderBy(desc(commitments.createdAt), desc(commitments.id))
    .limit(commitmentPageSize + 1)
    .offset((filters.page - 1) * commitmentPageSize);
}

export function commitmentMetrics(
  db: Database,
  eventId: string,
  wishId?: string,
) {
  return db
    .select({
      status: effectiveStatus,
      kind: commitments.kind,
      currency: commitments.currency,
      count: sql<number>`count(*)`.mapWith(Number),
      quantity: sql<number>`coalesce(sum(${commitments.quantity}), 0)`.mapWith(
        Number,
      ),
      pledged:
        sql<number>`coalesce(sum(${commitments.amountMinor}), 0)`.mapWith(
          Number,
        ),
      received:
        sql<number>`coalesce(sum(${contributionReceipts.amountMinor}), 0)`.mapWith(
          Number,
        ),
    })
    .from(commitments)
    .leftJoin(
      contributionReceipts,
      eq(contributionReceipts.commitmentId, commitments.id),
    )
    .where(
      and(
        eq(commitments.eventId, eventId),
        wishId ? eq(commitments.wishId, wishId) : undefined,
      ),
    )
    .groupBy(effectiveStatus, commitments.kind, commitments.currency);
}

export function commitmentWishOptions(db: Database, eventId: string) {
  return db
    .select({ id: wishes.id, title: wishes.title })
    .from(wishes)
    .where(eq(wishes.eventId, eventId))
    .orderBy(asc(wishes.title), asc(wishes.id));
}

export async function hostCommitmentTarget(
  db: Database,
  eventId: string,
  id: string,
) {
  const [entry] = await db
    .select({
      commitment: commitments,
      email: guests.emailNormalized,
      receivedMinor: contributionReceipts.amountMinor,
    })
    .from(commitments)
    .innerJoin(guests, eq(guests.id, commitments.guestId))
    .leftJoin(
      contributionReceipts,
      eq(contributionReceipts.commitmentId, commitments.id),
    )
    .where(and(eq(commitments.id, id), eq(commitments.eventId, eventId)));
  return entry ?? null;
}

export async function writeReceipt(
  db: Database,
  commitmentId: string,
  currency: string,
  amountMinor: number,
  confirmedBy: string,
) {
  if (amountMinor === 0) {
    await db
      .delete(contributionReceipts)
      .where(eq(contributionReceipts.commitmentId, commitmentId));
    return;
  }
  await db
    .insert(contributionReceipts)
    .values({ commitmentId, amountMinor, currency, confirmedBy })
    .onConflictDoUpdate({
      target: contributionReceipts.commitmentId,
      set: { amountMinor, currency, confirmedBy, updatedAt: new Date() },
    });
}

export async function recordCommitmentAudit(
  db: Database,
  commitmentId: string,
  actorId: string,
  action: string,
) {
  await db.insert(commitmentAudit).values({ commitmentId, actorId, action });
}
