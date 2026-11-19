import "server-only";

import { usedCapacity } from "@/lib/db/commitments";
import { getDb } from "@/lib/db";
import { findEventMembership } from "@/lib/db/events";
import {
  belongsToEvent,
  findWish,
  insertWish,
  listEventWishes,
  moveWish,
  writeWish,
} from "@/lib/db/wishes";
import { maxWishesPerEvent, type WishInput } from "@/lib/validation/wishes";
import { EventError, lockEditableEvent } from "./events";

export async function getHostWish(
  userId: string,
  eventId: string,
  wishId: string,
) {
  const db = getDb();
  return (await findEventMembership(db, userId, eventId))
    ? findWish(db, eventId, wishId)
    : null;
}

type ImageChange = { imageKey: string | null };

export async function saveWish(
  userId: string,
  eventId: string,
  wishId: string | null,
  fields: WishInput,
  image?: ImageChange,
) {
  return getDb().transaction(async (tx) => {
    await lockEditableEvent(tx, userId, eventId);
    if (
      fields.participantId &&
      !(await belongsToEvent(tx, fields.participantId, eventId))
    ) {
      throw new EventError("Choose a wishlist owner from this event.");
    }
    if (wishId) {
      const existing = await findWish(tx, eventId, wishId);
      if (!existing || existing.archivedAt)
        throw new EventError("This wish is unavailable.");
      const used = await usedCapacity(tx, wishId);
      if (
        used.count &&
        (fields.type !== existing.type ||
          (fields.type === "group_fund" &&
            fields.currency !== existing.currency))
      ) {
        throw new EventError(
          "Keep the wish type and pledge currency while it has commitments.",
        );
      }
      if (
        (fields.quantityTotal !== null &&
          fields.quantityTotal < used.quantity) ||
        (fields.targetAmountMinor !== null &&
          fields.targetAmountMinor < used.amount)
      ) {
        throw new EventError(
          "Choose a quantity or goal that covers existing commitments.",
        );
      }
      await writeWish(tx, wishId, { ...fields, ...image });
      return image && existing.imageKey !== image.imageKey
        ? existing.imageKey
        : null;
    }
    const existing = await listEventWishes(tx, eventId);
    if (existing.length >= maxWishesPerEvent)
      throw new EventError("This event has reached its 200-wish limit.");
    await insertWish(tx, { ...fields, ...image, eventId });
    return null;
  });
}

export async function changeWish(
  userId: string,
  eventId: string,
  wishId: string,
  intent: "up" | "down" | "archive",
) {
  await getDb().transaction(async (tx) => {
    await lockEditableEvent(tx, userId, eventId);
    const wish = await findWish(tx, eventId, wishId);
    if (!wish) throw new EventError("This wish is unavailable.");
    if (wish.archivedAt) {
      if (intent === "archive") return;
      throw new EventError("Archived wishes cannot be reordered.");
    }
    if (intent === "archive")
      await writeWish(tx, wishId, { archivedAt: new Date(), isVisible: false });
    else await moveWish(tx, eventId, wishId, intent);
  });
}
