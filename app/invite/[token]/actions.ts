"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/ui/form-feedback";
import { invitationPath } from "@/lib/security/invitation-tokens";
import { EventError } from "@/lib/services/events";
import { respondToInvitation } from "@/lib/services/invitations";
import {
  invitationTokenSchema,
  rsvpSchema,
} from "@/lib/validation/invitations";

export async function saveRsvp(
  token: string,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  if (!invitationTokenSchema.safeParse(token).success)
    return { error: "This invitation is unavailable." };
  const input = rsvpSchema.safeParse(Object.fromEntries(form));
  if (!input.success)
    return {
      error: "Check your RSVP and try again.",
      fields: z.flattenError(input.error).fieldErrors,
    };
  try {
    await respondToInvitation(token, input.data);
  } catch (error) {
    if (!(error instanceof EventError)) throw error;
    return { error: error.message };
  }
  revalidatePath(invitationPath(token));
  return { success: "Your RSVP was saved." };
}
