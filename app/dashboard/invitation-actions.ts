"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/ui/form-feedback";
import { getAuthConfig, requireHost } from "@/lib/auth";
import { takeAttempt } from "@/lib/db/feature-limits";
import { EventError } from "@/lib/services/events";
import {
  changeInvitationLink,
  createInvitation,
  editableInvitation,
  saveInvitationCard,
} from "@/lib/services/invitations";
import { deleteImage, uploadImage } from "@/lib/storage";
import { prepareImage } from "@/lib/storage/prepare-image";
import {
  invitationCardSchema,
  invitationLinkSchema,
} from "@/lib/validation/invitations";

const base = (eventId: string) => `/dashboard/events/${eventId}/invitations`;

function failure(error: unknown): FormState {
  if (!(error instanceof EventError)) throw error;
  return { error: error.message };
}

async function discard(key: string) {
  try {
    await deleteImage(key);
  } catch {
    console.error("Failed to delete an unreferenced invitation image.");
  }
}

export async function saveInvitationDesign(
  eventId: string,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const host = await requireHost();
  if (
    !z.uuid().safeParse(eventId).success ||
    !(await editableInvitation(host.id, eventId))
  ) {
    return { error: "This event is unavailable." };
  }
  const parsed = invitationCardSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: "Check the highlighted fields.",
      fields: z.flattenError(parsed.error).fieldErrors,
    };
  const file = form.get("photo");
  let newKey: string | undefined;
  if (file instanceof File && file.size > 0) {
    if (!(await takeAttempt(`invitation-photo:${host.id}`, 30, 10 * 60_000))) {
      return { error: "Too many photo uploads. Try again in a few minutes." };
    }
    const image = await prepareImage(file);
    if (!image)
      return {
        error: "Check the highlighted fields.",
        fields: { photo: ["Choose a still JPEG, PNG, or WebP up to 4 MB."] },
      };
    try {
      newKey = await uploadImage(eventId, image, "invitations");
    } catch {
      return {
        error: "The photo could not be stored. Try again or save without it.",
      };
    }
  }
  let previousKey: string | null;
  try {
    const photo = newKey
      ? { key: newKey }
      : form.has("removePhoto")
        ? { key: null }
        : undefined;
    previousKey = await saveInvitationCard(
      host.id,
      eventId,
      parsed.data,
      photo,
    );
  } catch (error) {
    if (error instanceof EventError && newKey) await discard(newKey);
    return failure(error);
  }
  if (previousKey) await discard(previousKey);
  revalidatePath(base(eventId));
  return { success: "Invitation design saved." };
}

export async function addInvitationLink(
  eventId: string,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const host = await requireHost();
  if (!z.uuid().safeParse(eventId).success)
    return { error: "This event is unavailable." };
  const input = invitationLinkSchema.safeParse(Object.fromEntries(form));
  if (!input.success)
    return {
      error: "Check the highlighted fields.",
      fields: z.flattenError(input.error).fieldErrors,
    };
  try {
    await createInvitation(
      host.id,
      eventId,
      input.data,
      getAuthConfig().AUTH_SECRET,
    );
  } catch (error) {
    return failure(error);
  }
  revalidatePath(base(eventId));
  return { success: "Invitation link created." };
}

export async function changeGuestInvitation(
  eventId: string,
  recipientId: string,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const host = await requireHost();
  if (
    !z.uuid().safeParse(eventId).success ||
    !z.uuid().safeParse(recipientId).success
  )
    return { error: "This invitation is unavailable." };
  const intent = z.enum(["rotate", "revoke"]).safeParse(form.get("intent"));
  if (!intent.success) return { error: "Choose an invitation link action." };
  try {
    await changeInvitationLink(
      host.id,
      eventId,
      recipientId,
      intent.data,
      getAuthConfig().AUTH_SECRET,
    );
  } catch (error) {
    return failure(error);
  }
  revalidatePath(base(eventId));
  return {
    success:
      intent.data === "rotate"
        ? "New invitation link created."
        : "Invitation link revoked.",
  };
}
