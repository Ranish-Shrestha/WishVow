import "server-only";

import { and, asc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { emptyTotals } from "@/lib/services/commitment-rules";
import { eventTotals, usedCapacity } from "./commitments";
import { getDb } from "./index";
import {
  commitments,
  eventMembers,
  eventParticipants,
  events,
  wishes,
} from "./schema";
import { visibleWishes } from "./wishes";

export async function getPublishedGate(slug: string) {
  const [gate] = await getDb()
    .select({
      id: events.id,
      slug: events.slug,
      privacy: events.privacy,
      passcodeHash: events.passcodeHash,
    })
    .from(events)
    .where(and(eq(events.slug, slug), eq(events.status, "published")));
  return gate ?? null;
}
export type PublishedGate = NonNullable<
  Awaited<ReturnType<typeof getPublishedGate>>
>;

function gateConditions(gate: PublishedGate) {
  return and(
    eq(events.id, gate.id),
    eq(events.status, "published"),
    eq(events.privacy, gate.privacy),
    gate.passcodeHash
      ? eq(events.passcodeHash, gate.passcodeHash)
      : isNull(events.passcodeHash),
  );
}

export async function getGuestEvent(gate: PublishedGate) {
  const [event] = await getDb()
    .select({
      title: events.title,
      type: events.eventType,
      date: events.eventDate,
      story: events.story,
      location: events.locationText,
      locale: events.locale,
    })
    .from(events)
    .where(gateConditions(gate));
  return event ?? null;
}

function guestWishesQuery() {
  return getDb()
    .select({
      id: wishes.id,
      title: wishes.title,
      description: wishes.description,
      notes: wishes.notes,
      ownerId: wishes.participantId,
      owner: eventParticipants.displayName,
      category: wishes.category,
      type: wishes.type,
      hasImage: wishes.imageKey,
      priority: wishes.priority,
      quantity: wishes.quantityTotal,
      deadline: wishes.deadline,
      currency: wishes.currency,
      suggested: wishes.suggestedAmountMinor,
      target: wishes.targetAmountMinor,
      minimum: wishes.minimumAmountMinor,
      externalUrl: wishes.externalUrl,
    })
    .from(wishes)
    .innerJoin(events, eq(wishes.eventId, events.id))
    .leftJoin(
      eventParticipants,
      eq(wishes.participantId, eventParticipants.id),
    );
}

export async function listGuestWishes(gate: PublishedGate) {
  const rows = await guestWishesQuery()
    .where(and(visibleWishes(gate.id), gateConditions(gate)))
    .orderBy(asc(wishes.sortOrder), asc(wishes.id));
  const totals = new Map(
    (await eventTotals(gate.id)).map(({ wishId, ...value }) => [wishId, value]),
  );
  return rows.map(({ hasImage, ...wish }) => ({
    ...wish,
    hasImage: Boolean(hasImage),
    totals: totals.get(wish.id) ?? emptyTotals,
  }));
}

export async function getGuestWish(gate: PublishedGate, wishId: string) {
  const [wish] = await guestWishesQuery()
    .where(
      and(visibleWishes(gate.id), gateConditions(gate), eq(wishes.id, wishId)),
    )
    .limit(1);
  if (!wish) return null;
  const { hasImage, ...details } = wish;
  return {
    ...details,
    hasImage: Boolean(hasImage),
    totals: await usedCapacity(getDb(), wishId),
  };
}
export type GuestWish = NonNullable<Awaited<ReturnType<typeof getGuestWish>>>;

export async function getGuestImageKey(gate: PublishedGate, wishId: string) {
  const [wish] = await getDb()
    .select({ imageKey: wishes.imageKey })
    .from(wishes)
    .innerJoin(events, eq(wishes.eventId, events.id))
    .where(
      and(visibleWishes(gate.id), gateConditions(gate), eq(wishes.id, wishId)),
    );
  return wish?.imageKey ?? null;
}

export async function listPreviewWishes(
  userId: string,
  eventId: string,
  wishId?: string,
): Promise<GuestWish[]> {
  const rows = await guestWishesQuery()
    .innerJoin(
      eventMembers,
      and(eq(events.id, eventMembers.eventId), eq(eventMembers.userId, userId)),
    )
    .where(
      and(
        visibleWishes(eventId),
        ne(events.status, "archived"),
        wishId ? eq(wishes.id, wishId) : undefined,
      ),
    )
    .orderBy(asc(wishes.sortOrder), asc(wishes.id));
  const totals = new Map(
    (await eventTotals(eventId)).map(({ wishId, ...value }) => [wishId, value]),
  );
  return rows.map(({ hasImage, ...wish }) => ({
    ...wish,
    hasImage: Boolean(hasImage),
    totals: totals.get(wish.id) ?? emptyTotals,
  }));
}

export async function visibleGiverNames(gate: PublishedGate, wishId: string) {
  const rows = await getDb()
    .selectDistinct({ name: commitments.displayName })
    .from(commitments)
    .innerJoin(events, eq(commitments.eventId, events.id))
    .innerJoin(wishes, eq(commitments.wishId, wishes.id))
    .where(
      and(
        gateConditions(gate),
        visibleWishes(gate.id),
        eq(wishes.id, wishId),
        eq(events.showGiverNamesToGuests, true),
        eq(commitments.allowPublicName, true),
        inArray(commitments.status, ["active", "purchased", "fulfilled"]),
        or(eq(events.surpriseMode, false), eq(commitments.status, "fulfilled")),
      ),
    )
    .orderBy(asc(commitments.displayName))
    .limit(20);
  return rows.map(({ name }) => name);
}
