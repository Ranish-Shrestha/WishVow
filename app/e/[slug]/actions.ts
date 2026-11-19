"use server";

import { verifyPassword } from "better-auth/crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/ui/form-feedback";
import { takeAttempt } from "@/lib/db/feature-limits";
import { getPublishedGate } from "@/lib/db/guest-events";
import { grantEventAccess, passcodeRateKey } from "@/lib/security/event-access";
import { eventSlugSchema } from "@/lib/validation/wishes";

export async function unlockEvent(
  slug: string,
  wishId: string | null,
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  if (
    !eventSlugSchema.safeParse(slug).success ||
    (wishId !== null && !z.uuid().safeParse(wishId).success)
  ) {
    return { error: "This event is unavailable." };
  }
  const path = wishId ? `/e/${slug}/wishes/${wishId}` : `/e/${slug}`;
  const passcode = z
    .string()
    .trim()
    .min(1)
    .max(128)
    .safeParse(data.get("passcode"));
  if (!passcode.success) return { error: "Enter the event passcode." };
  const gate = await getPublishedGate(slug);
  if (!gate) return { error: "This event is unavailable." };
  if (gate.privacy === "unlisted") redirect(path);
  if (!(await takeAttempt(await passcodeRateKey(gate), 8, 10 * 60 * 1000))) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }
  if (
    !gate.passcodeHash ||
    !(await verifyPassword({
      password: passcode.data,
      hash: gate.passcodeHash,
    }))
  ) {
    return { error: "That passcode didn’t match. Try again." };
  }
  await grantEventAccess(gate);
  redirect(path);
}
