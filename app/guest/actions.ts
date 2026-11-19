"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/ui/form-feedback";
import { getAuthConfig } from "@/lib/auth";
import { takeAttempt } from "@/lib/db/feature-limits";
import {
  sendCancellation,
  sendCommitmentConfirmation,
  sendManagement,
  sendUnavailable,
  sendVerification,
} from "@/lib/email";
import { guestAccess } from "@/lib/security/event-access";
import {
  changeCommitment,
  confirmCommitment,
  recoverCommitment,
  requestCommitment,
} from "@/lib/services/commitments";
import { track } from "@/lib/utils/telemetry";
import { CommitmentError } from "@/lib/services/commitment-rules";
import {
  commitmentRequestSchema,
  guestTokenSchema,
  readTerms,
  termsSchema,
} from "@/lib/validation/commitments";

const neutral =
  "Check your inbox for the next step. If a link doesn’t arrive, check spam or try again in a few minutes.";

async function guestClientIp() {
  if (process.env.VERCEL !== "1") return "unknown";
  return (
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  );
}

function limitKey(scope: string, value: string, secret: string) {
  return createHmac("sha256", secret)
    .update(JSON.stringify(["wishvow-guest-v2", scope, value]))
    .digest("hex");
}

async function guestEmailLimit(email: string, secret: string) {
  const window = 15 * 60_000;
  const ip = await guestClientIp();
  return (
    (await takeAttempt(limitKey("mail-ip", ip, secret), 50, window)) &&
    (await takeAttempt(limitKey("email", email, secret), 5, window))
  );
}

async function guestActionLimit(secret: string) {
  return takeAttempt(
    limitKey("action-ip", await guestClientIp(), secret),
    120,
    15 * 60_000,
  );
}

function failure(error: unknown): FormState {
  if (!(error instanceof CommitmentError)) throw error;
  if (error.field)
    return {
      error: "Check the highlighted field.",
      fields: { [error.field]: [error.message] },
    };
  return { error: error.message };
}

async function notify(delivery: Promise<void>) {
  try {
    await delivery;
    return true;
  } catch {
    console.error("WishVow guest email delivery failed.");
    return false;
  }
}

export async function requestGuestCommitment(
  slug: string,
  wishId: string,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const input = commitmentRequestSchema.safeParse({
    ...readTerms(form),
    displayName: form.get("displayName"),
    email: form.get("email"),
  });
  if (!input.success)
    return {
      error: "Check the highlighted fields.",
      fields: z.flattenError(input.error).fieldErrors,
    };
  const access =
    z.uuid().safeParse(wishId).success && (await guestAccess(slug));
  if (!access || !access.allowed)
    return { error: "Open the wish from its event link before continuing." };
  const { AUTH_SECRET } = getAuthConfig();
  if (!(await guestEmailLimit(input.data.email, AUTH_SECRET)))
    return { success: neutral };
  try {
    const result = await requestCommitment(
      access.gate,
      wishId,
      input.data,
      AUTH_SECRET,
    );
    await notify(
      result.type === "verify"
        ? sendVerification(input.data.email, result.token, result.key)
        : sendManagement(input.data.email, result.token, result.key),
    );
    return { success: neutral };
  } catch (error) {
    return failure(error);
  }
}

export async function recoverGuestCommitment(
  slug: string,
  wishId: string,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const input = z
    .string()
    .trim()
    .max(254)
    .toLowerCase()
    .pipe(z.email())
    .safeParse(form.get("email"));
  if (!input.success) return { error: "Enter a valid email address." };
  const access =
    z.uuid().safeParse(wishId).success && (await guestAccess(slug));
  if (!access || !access.allowed)
    return { error: "Open the wish from its event link before continuing." };
  const { AUTH_SECRET } = getAuthConfig();
  if (await guestEmailLimit(input.data, AUTH_SECRET)) {
    const result = await recoverCommitment(
      access.gate,
      wishId,
      input.data,
      AUTH_SECRET,
    );
    if (result)
      await notify(sendManagement(input.data, result.token, result.key));
  }
  return { success: neutral };
}

export async function verifyGuestCommitment(token: string): Promise<FormState> {
  if (!guestTokenSchema.safeParse(token).success)
    return {
      error: "This verification link is invalid, expired, or already used.",
    };
  const { AUTH_SECRET } = getAuthConfig();
  if (!(await guestActionLimit(AUTH_SECRET)))
    return { error: "Too many attempts. Try again in a few minutes." };
  const result = await confirmCommitment(token, AUTH_SECRET);
  if (result.status === "invalid")
    return {
      error: "This verification link is invalid, expired, or already used.",
    };
  if (result.status === "unavailable") {
    track("commitment_unavailable");
    await notify(sendUnavailable(result.email, result.id));
    return {
      error:
        "This wish or the requested capacity is no longer available. Return to the original wishlist to see your options.",
    };
  }
  track("commitment_confirmed");
  await notify(
    sendCommitmentConfirmation(result.email, result.token, result.id),
  );
  redirect(`/guest/manage/${result.token}?confirmed=1`);
}

export async function manageGuestCommitment(
  token: string,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  if (!guestTokenSchema.safeParse(token).success)
    return { error: "This management link is invalid or expired." };
  if (!(await guestActionLimit(getAuthConfig().AUTH_SECRET)))
    return { error: "Too many attempts. Try again in a few minutes." };
  const intent = z.enum(["edit", "cancel"]).safeParse(form.get("intent"));
  if (!intent.success)
    return { error: "Choose whether to save or cancel the commitment." };
  const input =
    intent.data === "edit" ? termsSchema.safeParse(readTerms(form)) : null;
  if (input && !input.success)
    return {
      error: "Check the highlighted fields.",
      fields: z.flattenError(input.error).fieldErrors,
    };
  try {
    const result = await changeCommitment(token, input?.data ?? null);
    if (result) {
      track("commitment_cancelled");
      await notify(sendCancellation(result.email, result.id));
    }
  } catch (error) {
    return failure(error);
  }
  redirect(`/guest/manage/${token}?updated=${intent.data}`);
}
