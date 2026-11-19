"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/ui/form-feedback";
import { requireHost } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { findEventMembership } from "@/lib/db/events";
import { takeAttempt } from "@/lib/db/feature-limits";
import { EventError } from "@/lib/services/events";
import { changeWish, getHostWish, saveWish } from "@/lib/services/wishes";
import { deleteImage, uploadImage } from "@/lib/storage";
import { prepareImage } from "@/lib/storage/prepare-image";
import { eventIdSchema } from "@/lib/validation/events";
import { wishSchema } from "@/lib/validation/wishes";

async function discardImage(key: string) {
  try {
    await deleteImage(key);
  } catch {
    console.error("Failed to delete an unreferenced wish image.");
  }
}

export async function saveWishAction(
  eventId: string,
  wishId: string | null,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const host = await requireHost();
  if (
    !eventIdSchema.safeParse(eventId).success ||
    (wishId !== null && !z.uuid().safeParse(wishId).success)
  ) {
    return { error: "This wish is unavailable." };
  }

  const membership = await findEventMembership(getDb(), host.id, eventId);
  if (!membership || membership.event.status === "archived")
    return { error: "This event is unavailable." };
  if (wishId) {
    const wish = await getHostWish(host.id, eventId, wishId);
    if (!wish || wish.archivedAt) return { error: "This wish is unavailable." };
  }

  const input = wishSchema.safeParse({
    quantity: "",
    target: "",
    minimum: "",
    suggested: "",
    currency: "CAD",
    ...Object.fromEntries(form),
    isVisible: form.has("isVisible"),
    allowMultipleCommitments: form.has("allowMultipleCommitments"),
  });
  if (!input.success)
    return {
      error: "Check the highlighted fields.",
      fields: z.flattenError(input.error).fieldErrors,
    };

  const file = form.get("image");
  let newKey: string | undefined;
  if (file instanceof File && file.size > 0) {
    if (!(await takeAttempt(`wish-image:${host.id}`, 30, 10 * 60 * 1000))) {
      return {
        error: "Too many image uploads. Please try again in a few minutes.",
      };
    }
    const processed = await prepareImage(file);
    if (!processed)
      return {
        error: "Check the highlighted fields.",
        fields: {
          image: ["Choose a still JPEG, PNG, or WebP image up to 4 MB."],
        },
      };
    try {
      newKey = await uploadImage(eventId, processed);
    } catch {
      return {
        error:
          "The image couldn’t be stored. Try again or save without a new image.",
      };
    }
  }

  let oldKey: string | null;
  try {
    const image = newKey
      ? { imageKey: newKey }
      : form.has("removeImage")
        ? { imageKey: null }
        : undefined;
    oldKey = await saveWish(host.id, eventId, wishId, input.data, image);
  } catch (error) {
    if (error instanceof EventError) {
      if (newKey) await discardImage(newKey);
      return { error: error.message };
    }
    // A transport failure can occur after COMMIT. Keep the new object until its reference can be checked.
    throw error;
  }

  if (oldKey) await discardImage(oldKey);
  revalidatePath(`/dashboard/events/${eventId}`);
  redirect(`/dashboard/events/${eventId}/wishes`);
}

export async function changeWishAction(
  eventId: string,
  wishId: string,
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const host = await requireHost();
  const intent = z
    .enum(["up", "down", "archive"])
    .safeParse(form.get("intent"));
  if (
    !intent.success ||
    !eventIdSchema.safeParse(eventId).success ||
    !z.uuid().safeParse(wishId).success
  ) {
    return { error: "Invalid wish action." };
  }
  try {
    await changeWish(host.id, eventId, wishId, intent.data);
  } catch (error) {
    if (error instanceof EventError) return { error: error.message };
    throw error;
  }
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/dashboard/events/${eventId}/wishes`);
  return {
    success:
      intent.data === "archive" ? "Wish archived." : "Wishlist order saved.",
  };
}
