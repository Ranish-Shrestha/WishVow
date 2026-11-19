import "server-only";

import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { findEventMembership } from "@/lib/db/events";
import {
  currentInvitationForRsvp,
  findInvitation,
  findInvitationCard,
  insertInvitation,
  inviteCount,
  listInvitations,
  patchInvitation,
  publicInvitation,
  writeInvitationCard,
  writeRsvp,
} from "@/lib/db/invitations";
import {
  invitationPath,
  invitationToken,
  newInvitationToken,
} from "@/lib/security/invitation-tokens";
import { tokenHash } from "@/lib/security/guest-tokens";
import type {
  InvitationCardInput,
  InvitationLinkInput,
  RsvpInput,
} from "@/lib/validation/invitations";
import { EventError, lockEditableEvent } from "./events";

export async function invitationDashboard(userId: string, eventId: string) {
  const db = getDb();
  const membership = await findEventMembership(db, userId, eventId);
  if (!membership) return null;
  const [card, recipients] = await Promise.all([
    findInvitationCard(db, eventId),
    listInvitations(db, eventId),
  ]);
  return { event: membership.event, card, recipients };
}

export async function editableInvitation(userId: string, eventId: string) {
  const membership = await findEventMembership(getDb(), userId, eventId);
  return Boolean(membership && membership.event.status !== "archived");
}

export async function saveInvitationCard(
  userId: string,
  eventId: string,
  input: InvitationCardInput,
  photo?: { key: string | null },
) {
  return getDb().transaction(async (tx) => {
    await lockEditableEvent(tx, userId, eventId);
    const previous = await findInvitationCard(tx, eventId);
    const key = photo ? photo.key : (previous?.imageKey ?? null);
    await writeInvitationCard(tx, eventId, input, key);
    return previous?.imageKey && previous.imageKey !== key
      ? previous.imageKey
      : null;
  });
}

export async function createInvitation(
  userId: string,
  eventId: string,
  input: InvitationLinkInput,
  secret: string,
) {
  return getDb().transaction(async (tx) => {
    await lockEditableEvent(tx, userId, eventId);
    if (!(await findInvitationCard(tx, eventId)))
      throw new EventError("Save an invitation design first.");
    if ((await inviteCount(tx, eventId)) >= 500)
      throw new EventError("This event has reached its 500-invitation limit.");
    const id = randomUUID();
    await insertInvitation(tx, {
      ...input,
      id,
      eventId,
      ...newInvitationToken(id, secret),
    });
    return id;
  });
}

export async function changeInvitationLink(
  userId: string,
  eventId: string,
  id: string,
  intent: "rotate" | "revoke",
  secret: string,
) {
  await getDb().transaction(async (tx) => {
    await lockEditableEvent(tx, userId, eventId);
    const recipient = await findInvitation(tx, eventId, id);
    if (!recipient) throw new EventError("This invitation is unavailable.");
    if (recipient.revokedAt) {
      if (intent === "revoke") return;
      throw new EventError(
        "This invitation was revoked. Create another invitation to share a new link.",
      );
    }
    const values =
      intent === "rotate"
        ? newInvitationToken(id, secret)
        : { revokedAt: new Date() };
    await patchInvitation(tx, id, values);
  });
}

export function shareableInvitation(
  recipient: {
    id: string;
    tokenVersion: string;
    tokenHash: string;
    revokedAt: Date | null;
  },
  secret: string,
  origin: string,
) {
  if (recipient.revokedAt) return null;
  const token = invitationToken(recipient.id, recipient.tokenVersion, secret);
  if (tokenHash(token) !== recipient.tokenHash) return null;
  return new URL(invitationPath(token), origin).href;
}

export function invitationForGuest(token: string) {
  return publicInvitation(tokenHash(token));
}

export async function respondToInvitation(token: string, input: RsvpInput) {
  const hash = tokenHash(token);
  const opened = await publicInvitation(hash);
  if (!opened) throw new EventError("This invitation is unavailable.");
  await getDb().transaction(async (tx) => {
    const recipient = await currentInvitationForRsvp(
      tx,
      opened.invitation.eventId,
      hash,
    );
    if (!recipient) throw new EventError("This invitation is unavailable.");
    if (input.partySize > recipient.maxParty) {
      throw new EventError(
        `This invitation allows up to ${recipient.maxParty} guests.`,
      );
    }
    if (
      recipient.status === input.status &&
      recipient.partySize === input.partySize &&
      recipient.message === input.message
    )
      return;
    await writeRsvp(tx, recipient.id, input);
  });
}

export async function invitationForExport(
  userId: string,
  eventId: string,
  recipientId?: string,
) {
  const db = getDb();
  const access = await findEventMembership(db, userId, eventId);
  if (!access) return null;
  const card = await findInvitationCard(db, eventId);
  if (!card) return null;
  const recipient = recipientId
    ? await findInvitation(db, eventId, recipientId)
    : null;
  if (
    recipientId &&
    (!recipient || recipient.revokedAt || access.event.status !== "published")
  )
    return null;
  return { card, event: access.event, recipient };
}
