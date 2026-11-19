import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { getDb, type Database } from "./index";
import { eventMembers, eventParticipants, events } from "./schema";

type NewEvent = typeof events.$inferInsert;
type ParticipantFields = Pick<
  typeof eventParticipants.$inferInsert,
  "displayName" | "roleLabel"
>;

const hostEventFields = {
  id: events.id,
  title: events.title,
  slug: events.slug,
  eventType: events.eventType,
  status: events.status,
  story: events.story,
  eventDate: events.eventDate,
  locale: events.locale,
  timezone: events.timezone,
  locationText: events.locationText,
  privacy: events.privacy,
  showGiverNamesToGuests: events.showGiverNamesToGuests,
  surpriseMode: events.surpriseMode,
  publishedAt: events.publishedAt,
  archivedAt: events.archivedAt,
};

export async function findEventMembership(
  db: Database,
  userId: string,
  eventId: string,
  lock = false,
) {
  const query = db
    .select({ event: hostEventFields, role: eventMembers.role })
    .from(events)
    .innerJoin(eventMembers, eq(events.id, eventMembers.eventId))
    .where(and(eq(events.id, eventId), eq(eventMembers.userId, userId)));

  const [entry] = await (lock
    ? query.for("update", { of: [events, eventMembers] })
    : query);
  return entry ?? null;
}

export function listEvents(userId: string) {
  return getDb()
    .select({
      id: events.id,
      title: events.title,
      status: events.status,
      eventDate: events.eventDate,
    })
    .from(eventMembers)
    .innerJoin(events, eq(eventMembers.eventId, events.id))
    .where(eq(eventMembers.userId, userId))
    .orderBy(desc(events.updatedAt), asc(events.id));
}

export async function getEvent(userId: string, eventId: string) {
  const db = getDb();
  const membership = await findEventMembership(db, userId, eventId);
  if (!membership) return null;
  const participants = await db
    .select()
    .from(eventParticipants)
    .innerJoin(
      eventMembers,
      eq(eventMembers.eventId, eventParticipants.eventId),
    )
    .where(
      and(
        eq(eventParticipants.eventId, eventId),
        eq(eventMembers.userId, userId),
      ),
    )
    .orderBy(
      asc(eventParticipants.sortOrder),
      asc(eventParticipants.createdAt),
      asc(eventParticipants.id),
    );
  return {
    ...membership,
    participants: participants.map((row) => row.event_participants),
  };
}

export async function insertEventWithOwner(db: Database, input: NewEvent) {
  return db.transaction(async (tx) => {
    const [{ id }] = await tx
      .insert(events)
      .values(input)
      .returning({ id: events.id });
    await tx
      .insert(eventMembers)
      .values({ eventId: id, userId: input.createdByUserId, role: "owner" });
    return id;
  });
}

export async function writeEvent(
  db: Database,
  eventId: string,
  changes: Partial<NewEvent>,
) {
  await db
    .update(events)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(events.id, eventId));
}

export async function writeParticipant(
  db: Database,
  eventId: string,
  input: ParticipantFields,
  participantId?: string,
) {
  if (!participantId) {
    await db.insert(eventParticipants).values({ eventId, ...input });
    return true;
  }
  const [updated] = await db
    .update(eventParticipants)
    .set(input)
    .where(
      and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.id, participantId),
      ),
    )
    .returning({ id: eventParticipants.id });
  return Boolean(updated);
}

export async function deleteParticipant(
  db: Database,
  eventId: string,
  participantId: string,
) {
  await db
    .delete(eventParticipants)
    .where(
      and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.id, participantId),
      ),
    );
}
