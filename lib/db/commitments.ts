import "server-only";

import { and, desc, eq, gt, inArray, isNull, ne, sql } from "drizzle-orm";
import { getDb, type Database } from "./index";
import {
  commitments,
  contributionReceipts,
  events,
  guests,
  guestTokens,
  wishes,
} from "./schema";

export type CommitmentRow = typeof commitments.$inferSelect;
export type TokenRow = typeof guestTokens.$inferSelect;
const counted = ["active", "purchased", "fulfilled"] as const;
const current = ["pending_verification", ...counted] as const;
const totalsFields = {
  quantity: sql<number>`coalesce(sum(${commitments.quantity}), 0)`.mapWith(
    Number,
  ),
  amount: sql<number>`coalesce(sum(${commitments.amountMinor}), 0)`.mapWith(
    Number,
  ),
  count: sql<number>`count(*)`.mapWith(Number),
};

export async function usedCapacity(
  db: Database,
  wishId: string,
  excludeId?: string,
) {
  const [totals] = await db
    .select(totalsFields)
    .from(commitments)
    .where(
      and(
        eq(commitments.wishId, wishId),
        inArray(commitments.status, counted),
        excludeId ? ne(commitments.id, excludeId) : undefined,
      ),
    );
  return totals;
}

export function eventTotals(eventId: string) {
  return getDb()
    .select({ wishId: commitments.wishId, ...totalsFields })
    .from(commitments)
    .where(
      and(
        eq(commitments.eventId, eventId),
        inArray(commitments.status, counted),
      ),
    )
    .groupBy(commitments.wishId);
}

// The event lock pairs with host edits. The wish lock serializes every change to its capacity.
export async function lockCommitmentTarget(
  db: Database,
  eventId: string,
  wishId: string,
) {
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .for("share");
  if (!event) return null;
  const [wish] = await db
    .select()
    .from(wishes)
    .where(and(eq(wishes.eventId, eventId), eq(wishes.id, wishId)))
    .for("update");
  return wish ? { event, wish } : null;
}

export async function getOrCreateGuest(
  db: Database,
  eventId: string,
  emailNormalized: string,
) {
  const [inserted] = await db
    .insert(guests)
    .values({ eventId, emailNormalized })
    .onConflictDoNothing({ target: [guests.eventId, guests.emailNormalized] })
    .returning({ id: guests.id });
  if (inserted) return inserted.id;
  return (await findGuest(db, eventId, emailNormalized))!;
}

export async function findGuest(
  db: Database,
  eventId: string,
  emailNormalized: string,
) {
  const [guest] = await db
    .select({ id: guests.id })
    .from(guests)
    .where(
      and(
        eq(guests.eventId, eventId),
        eq(guests.emailNormalized, emailNormalized),
      ),
    );
  return guest?.id ?? null;
}

export async function currentCommitment(
  db: Database,
  wishId: string,
  guestId: string,
) {
  const [row] = await db
    .select()
    .from(commitments)
    .where(
      and(
        eq(commitments.wishId, wishId),
        eq(commitments.guestId, guestId),
        inArray(commitments.status, current),
      ),
    );
  return row ?? null;
}

export async function insertCommitment(
  db: Database,
  value: typeof commitments.$inferInsert,
) {
  const [row] = await db.insert(commitments).values(value).returning();
  return row;
}

export async function updateCommitment(
  db: Database,
  id: string,
  changes: Partial<typeof commitments.$inferInsert>,
) {
  await db
    .update(commitments)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(commitments.id, id));
}

export async function activeToken(
  db: Database,
  commitmentId: string,
  purpose: TokenRow["purpose"],
) {
  const [row] = await db
    .select()
    .from(guestTokens)
    .where(
      and(
        eq(guestTokens.commitmentId, commitmentId),
        eq(guestTokens.purpose, purpose),
        isNull(guestTokens.consumedAt),
        isNull(guestTokens.revokedAt),
        gt(guestTokens.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(guestTokens.expiresAt))
    .limit(1);
  return row ?? null;
}

export async function insertToken(
  db: Database,
  commitmentId: string,
  token: Omit<typeof guestTokens.$inferInsert, "commitmentId">,
) {
  await db.insert(guestTokens).values({ commitmentId, ...token });
}

export async function consumeToken(db: Database, id: string, now: Date) {
  await db
    .update(guestTokens)
    .set({ consumedAt: now })
    .where(eq(guestTokens.id, id));
}

export async function revokeTokens(
  db: Database,
  commitmentId: string,
  purpose: TokenRow["purpose"],
) {
  await db
    .update(guestTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(guestTokens.commitmentId, commitmentId),
        eq(guestTokens.purpose, purpose),
        isNull(guestTokens.revokedAt),
      ),
    );
}

export async function findGuestToken(
  db: Database,
  hash: string,
  purpose: TokenRow["purpose"],
) {
  const [row] = await db
    .select({
      token: guestTokens,
      commitment: commitments,
      email: guests.emailNormalized,
      receivedMinor: contributionReceipts.amountMinor,
      wishTitle: wishes.title,
      wishType: wishes.type,
      eventStatus: events.status,
      visible: wishes.isVisible,
      archivedAt: wishes.archivedAt,
    })
    .from(guestTokens)
    .innerJoin(commitments, eq(guestTokens.commitmentId, commitments.id))
    .innerJoin(guests, eq(commitments.guestId, guests.id))
    .innerJoin(wishes, eq(commitments.wishId, wishes.id))
    .innerJoin(events, eq(commitments.eventId, events.id))
    .leftJoin(
      contributionReceipts,
      eq(commitments.id, contributionReceipts.commitmentId),
    )
    .where(
      and(eq(guestTokens.tokenHash, hash), eq(guestTokens.purpose, purpose)),
    );
  return row ?? null;
}
