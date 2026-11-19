"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireHost } from "@/lib/auth";
import {
  createEvent,
  updateEvent,
  transitionEvent,
  saveParticipant,
  removeParticipant,
  EventError,
} from "@/lib/services/events";
import {
  eventDetailsSchema,
  eventIdSchema,
  participantSchema,
  privacyInputSchema,
  transitionSchema,
} from "@/lib/validation/events";
import type { FormState } from "@/components/ui/form-feedback";

function invalid(error: z.ZodError): FormState {
  return {
    error: "Check the highlighted fields.",
    fields: z.flattenError(error).fieldErrors,
  };
}

function failure(error: unknown): FormState {
  if (error instanceof EventError) return { error: error.message };
  throw error;
}

export async function saveEventAction(
  eventId: string | null,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const host = await requireHost();
  if (eventId !== null && !eventIdSchema.safeParse(eventId).success)
    return { error: "This event is unavailable." };
  const details = eventDetailsSchema.safeParse(Object.fromEntries(form));
  if (!details.success) return invalid(details.error);

  let privacy;
  if (
    !eventId ||
    form.has("privacy") ||
    form.has("passcode") ||
    form.has("surpriseMode") ||
    form.has("showGiverNamesToGuests")
  ) {
    const parsed = privacyInputSchema.safeParse({
      privacy: form.get("privacy"),
      passcode: form.get("passcode") ?? "",
      surpriseMode: form.has("surpriseMode"),
      showGiverNamesToGuests: form.has("showGiverNamesToGuests"),
    });
    if (!parsed.success) return invalid(parsed.error);
    privacy = parsed.data;
  }

  let savedId: string;
  try {
    if (eventId) {
      await updateEvent(host.id, eventId, details.data, privacy);
      savedId = eventId;
    } else {
      if (!privacy) return { error: "Choose an event privacy setting." };
      savedId = await createEvent(host.id, details.data, privacy);
    }
  } catch (error) {
    return failure(error);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/events/${savedId}`);
  redirect(`/dashboard/events/${savedId}`);
}

export async function lifecycleAction(
  eventId: string,
  target: string,
): Promise<FormState> {
  const host = await requireHost();
  const action = transitionSchema.safeParse(target);
  if (!action.success || !eventIdSchema.safeParse(eventId).success)
    return { error: "Invalid event action." };

  try {
    await transitionEvent(host.id, eventId, action.data);
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/events/${eventId}`);
  return {
    success:
      action.data === "published" ? "Event published." : "Event archived.",
  };
}

export async function participantAction(
  eventId: string,
  participantId: string | null,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const host = await requireHost();
  if (
    !eventIdSchema.safeParse(eventId).success ||
    (participantId !== null && !eventIdSchema.safeParse(participantId).success)
  ) {
    return { error: "Invalid participant action." };
  }
  const remove = Boolean(participantId && form.get("intent") === "remove");

  try {
    if (remove && participantId) {
      await removeParticipant(host.id, eventId, participantId);
    } else {
      const input = participantSchema.safeParse(Object.fromEntries(form));
      if (!input.success) return invalid(input.error);
      await saveParticipant(
        host.id,
        eventId,
        input.data,
        participantId ?? undefined,
      );
    }
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/dashboard/events/${eventId}`);
  return { success: remove ? "Participant removed." : "Participant saved." };
}
