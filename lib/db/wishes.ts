import "server-only";

import { and, asc, eq, isNull, max } from "drizzle-orm";
import type { Database } from "./index";
import { eventParticipants, wishes } from "./schema";

type WishValues = typeof wishes.$inferInsert;
export const visibleWishes = (eventId: string) =>
  and(
    eq(wishes.eventId, eventId),
    eq(wishes.isVisible, true),
    isNull(wishes.archivedAt),
  );

export async function hasVisibleWish(db: Database, eventId: string) {
  const [wish] = await db
    .select({ id: wishes.id })
    .from(wishes)
    .where(visibleWishes(eventId))
    .limit(1);
  return Boolean(wish);
}

export function listEventWishes(db: Database, eventId: string) {
  return db
    .select({ wish: wishes, owner: eventParticipants.displayName })
    .from(wishes)
    .leftJoin(eventParticipants, eq(wishes.participantId, eventParticipants.id))
    .where(eq(wishes.eventId, eventId))
    .orderBy(asc(wishes.sortOrder), asc(wishes.id));
}

export async function findWish(db: Database, eventId: string, wishId: string) {
  const [wish] = await db
    .select()
    .from(wishes)
    .where(and(eq(wishes.eventId, eventId), eq(wishes.id, wishId)));
  return wish ?? null;
}

export async function belongsToEvent(
  db: Database,
  participantId: string,
  eventId: string,
) {
  const [participant] = await db
    .select({ id: eventParticipants.id })
    .from(eventParticipants)
    .where(
      and(
        eq(eventParticipants.id, participantId),
        eq(eventParticipants.eventId, eventId),
      ),
    );
  return Boolean(participant);
}

export async function insertWish(db: Database, values: WishValues) {
  const [{ last }] = await db
    .select({ last: max(wishes.sortOrder) })
    .from(wishes)
    .where(eq(wishes.eventId, values.eventId));
  await db.insert(wishes).values({ ...values, sortOrder: (last ?? -1) + 1 });
}

export async function writeWish(
  db: Database,
  wishId: string,
  changes: Partial<WishValues>,
) {
  await db
    .update(wishes)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(wishes.id, wishId));
}

export async function moveWish(
  db: Database,
  eventId: string,
  wishId: string,
  direction: "up" | "down",
) {
  const current = await db
    .select({ id: wishes.id, sortOrder: wishes.sortOrder })
    .from(wishes)
    .where(and(eq(wishes.eventId, eventId), isNull(wishes.archivedAt)))
    .orderBy(asc(wishes.sortOrder), asc(wishes.id));
  const index = current.findIndex(({ id }) => id === wishId);
  const neighbor = current[index + (direction === "up" ? -1 : 1)];
  if (index < 0 || !neighbor) return;
  await writeWish(db, wishId, { sortOrder: neighbor.sortOrder });
  await writeWish(db, neighbor.id, { sortOrder: current[index].sortOrder });
}

export async function assignWishesToShared(
  db: Database,
  eventId: string,
  participantId: string,
) {
  await db
    .update(wishes)
    .set({ participantId: null, updatedAt: new Date() })
    .where(
      and(eq(wishes.eventId, eventId), eq(wishes.participantId, participantId)),
    );
}
