"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/ui/form-feedback";
import { requireHost } from "@/lib/auth";
import { sendCancellation } from "@/lib/email";
import { EventError } from "@/lib/services/events";
import {
  revealCommitmentGiver,
  updateHostCommitment,
} from "@/lib/services/host-commitments";
import { track } from "@/lib/utils/telemetry";
import { hostCommitmentUpdate } from "@/lib/validation/host-commitments";

export async function saveHostCommitment(
  eventId: string,
  id: string,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const host = await requireHost();
  if (!z.uuid().safeParse(eventId).success || !z.uuid().safeParse(id).success)
    return { error: "This commitment is unavailable." };
  const input = hostCommitmentUpdate.safeParse({
    note: "",
    ...Object.fromEntries(form),
  });
  if (!input.success)
    return {
      error: "Check the highlighted fields.",
      fields: z.flattenError(input.error).fieldErrors,
    };
  let cancellation: { id: string; email: string } | null;
  try {
    cancellation = await updateHostCommitment(host.id, eventId, id, input.data);
  } catch (error) {
    if (!(error instanceof EventError)) throw error;
    return { error: error.message };
  }
  let warning = "";
  if (cancellation) {
    track("commitment_cancelled");
    try {
      await sendCancellation(cancellation.email, cancellation.id);
    } catch {
      console.error("WishVow guest email delivery failed.");
      warning = " The cancellation email could not be sent.";
    }
  }
  revalidatePath(`/dashboard/events/${eventId}/commitments`);
  revalidatePath(`/dashboard/events/${eventId}/wishes`);
  if (input.data.intent === "receipt")
    return { success: "Received amount saved." };
  if (input.data.intent === "cancelled")
    return { success: "Commitment cancelled." + warning };
  return {
    success:
      input.data.intent === "purchased"
        ? "Marked as purchased."
        : "Marked as fulfilled.",
  };
}

type RevealState = FormState & {
  details?: { name: string; email: string; message: string | null };
};

export async function revealHostGiver(
  eventId: string,
  id: string,
): Promise<RevealState> {
  const host = await requireHost();
  if (!z.uuid().safeParse(eventId).success || !z.uuid().safeParse(id).success)
    return { error: "Giver details are unavailable." };
  try {
    return { details: await revealCommitmentGiver(host.id, eventId, id) };
  } catch (error) {
    if (!(error instanceof EventError)) throw error;
    return { error: error.message };
  }
}
