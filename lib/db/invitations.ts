import "server-only";

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { getDb, type Database } from "./index";
import { events, invitationCards, invitations } from "./schema";
import type {
  InvitationCardInput,
  RsvpInput,
} from "@/lib/validation/invitations";

export function findInvitationCard(db: Database, eventId: string) {
  return db
    .select()
    .from(invitationCards)
    .where(eq(invitationCards.eventId, eventId))
    .then(([card]) => card ?? null);
}

export async function writeInvitationCard(
  db: Database,
  eventId: string,
  fields: InvitationCardInput,
  imageKey: string | null,
) {
  const values = { ...fields, imageKey };
  await db
    .insert(invitationCards)
    .values({ eventId, ...values })
    .onConflictDoUpdate({
      target: invitationCards.eventId,
      set: { ...values, updatedAt: new Date() },
    });
}

export function listInvitations(db: Database, eventId: string) {
  return db
    .select()
    .from(invitations)
    .where(eq(invitations.eventId, eventId))
    .orderBy(asc(invitations.createdAt), asc(invitations.id));
}

export function findInvitation(db: Database, eventId: string, id: string) {
  return db
    .select()
    .from(invitations)
    .where(and(eq(invitations.eventId, eventId), eq(invitations.id, id)))
    .then(([invitation]) => invitation ?? null);
}

export async function inviteCount(db: Database, eventId: string) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(invitations)
    .where(eq(invitations.eventId, eventId));
  return count;
}

export async function insertInvitation(
  db: Database,
  values: typeof invitations.$inferInsert,
) {
  await db.insert(invitations).values(values);
}

export async function patchInvitation(
  db: Database,
  id: string,
  values: Partial<typeof invitations.$inferInsert>,
) {
  await db.update(invitations).set(values).where(eq(invitations.id, id));
}

export function publicInvitation(hash: string) {
  return getDb()
    .select({
      card: invitationCards,
      invitation: {
        id: invitations.id,
        eventId: invitations.eventId,
        label: invitations.label,
        maxParty: invitations.maxParty,
        status: invitations.status,
        partySize: invitations.partySize,
        message: invitations.message,
      },
      event: { slug: events.slug, locale: events.locale },
    })
    .from(invitations)
    .innerJoin(
      invitationCards,
      eq(invitationCards.eventId, invitations.eventId),
    )
    .innerJoin(events, eq(events.id, invitations.eventId))
    .where(
      and(
        eq(invitations.tokenHash, hash),
        isNull(invitations.revokedAt),
        eq(events.status, "published"),
      ),
    )
    .then(([row]) => row ?? null);
}

export async function currentInvitationForRsvp(
  db: Database,
  eventId: string,
  hash: string,
) {
  // Match the host's lock order. A revoke, rotation, or event archive cannot race a confirmed update.
  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.status, "published")))
    .for("share");
  if (!event) return null;
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.eventId, event.id),
        eq(invitations.tokenHash, hash),
        isNull(invitations.revokedAt),
      ),
    )
    .for("update");
  return invitation ?? null;
}

export async function writeRsvp(
  db: Database,
  invitationId: string,
  input: RsvpInput,
) {
  await patchInvitation(db, invitationId, {
    ...input,
    respondedAt: new Date(),
  });
}
