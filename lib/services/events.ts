import "server-only";

import { hashPassword } from "better-auth/crypto";
import { getDb, type Database } from "@/lib/db";
import {
  deleteParticipant,
  findEventMembership,
  insertEventWithOwner,
  writeEvent,
  writeParticipant,
} from "@/lib/db/events";
import type {
  EventDetails,
  ParticipantInput,
  PrivacyInput,
} from "@/lib/validation/events";
import { assignWishesToShared, hasVisibleWish } from "@/lib/db/wishes";
import { canTransition, eventSlug } from "./event-rules";

export class EventError extends Error {}

export async function lockEditableEvent(
  db: Database,
  userId: string,
  eventId: string,
) {
  const entry = await findEventMembership(db, userId, eventId, true);
  if (!entry) throw new EventError("This event is unavailable.");
  if (entry.event.status === "archived")
    throw new EventError("Archived events cannot be changed.");
  return entry;
}

async function privacyChanges(
  input: PrivacyInput,
  previousPrivacy?: PrivacyInput["privacy"],
) {
  const { passcode, privacy, ...settings } = input;
  if (privacy === "unlisted")
    return { ...settings, privacy, passcodeHash: null };
  if (passcode)
    return { ...settings, privacy, passcodeHash: await hashPassword(passcode) };
  if (previousPrivacy !== "passcode")
    throw new EventError("Enter a passcode to protect this event.");
  return { ...settings, privacy };
}

export async function createEvent(
  userId: string,
  details: EventDetails,
  privacy: PrivacyInput,
) {
  const settings = await privacyChanges(privacy);
  return insertEventWithOwner(getDb(), {
    ...details,
    ...settings,
    slug: eventSlug(details.title),
    createdByUserId: userId,
  });
}

export async function updateEvent(
  userId: string,
  eventId: string,
  details: EventDetails,
  privacy?: PrivacyInput,
) {
  await getDb().transaction(async (tx) => {
    const { role, event } = await lockEditableEvent(tx, userId, eventId);
    if (privacy && role !== "owner")
      throw new EventError("Only the event owner can change privacy settings.");
    const settings = privacy
      ? await privacyChanges(privacy, event.privacy)
      : {};
    await writeEvent(tx, eventId, { ...details, ...settings });
  });
}

export async function transitionEvent(
  userId: string,
  eventId: string,
  target: "published" | "archived",
) {
  await getDb().transaction(async (tx) => {
    const { role, event } = await lockEditableEvent(tx, userId, eventId);
    if (role !== "owner")
      throw new EventError("Only the event owner can publish or archive.");
    if (event.status === target) return;
    if (!canTransition(role, event.status, target))
      throw new EventError("This event cannot change to that status.");
    if (target === "published" && !(await hasVisibleWish(tx, eventId))) {
      throw new EventError("Add at least one visible wish before publishing.");
    }
    const now = new Date();
    await writeEvent(tx, eventId, {
      status: target,
      ...(target === "published" ? { publishedAt: now } : { archivedAt: now }),
    });
  });
}

export async function saveParticipant(
  userId: string,
  eventId: string,
  input: ParticipantInput,
  participantId?: string,
) {
  await getDb().transaction(async (tx) => {
    await lockEditableEvent(tx, userId, eventId);
    if (!(await writeParticipant(tx, eventId, input, participantId))) {
      throw new EventError("This participant is unavailable.");
    }
  });
}

export async function removeParticipant(
  userId: string,
  eventId: string,
  participantId: string,
) {
  await getDb().transaction(async (tx) => {
    await lockEditableEvent(tx, userId, eventId);
    await assignWishesToShared(tx, eventId, participantId);
    await deleteParticipant(tx, eventId, participantId);
  });
}
