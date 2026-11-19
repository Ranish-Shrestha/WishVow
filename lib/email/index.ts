import "server-only";

import { z } from "zod";
import { getAuthConfig } from "@/lib/auth/config";
import { tokenHash } from "@/lib/security/guest-tokens";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  key: string;
};

const resendConfig = z.object({
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z
    .string()
    .min(1)
    .max(254)
    .regex(/^[^\r\n]+$/),
});

async function send(message: EmailMessage) {
  const provider = process.env.EMAIL_PROVIDER || "resend";
  if (
    provider === "local" &&
    process.env.NODE_ENV === "development" &&
    !process.env.VERCEL
  ) {
    const { saveLocalEmail } = await import("./local");
    return saveLocalEmail(message);
  }
  if (provider !== "resend")
    throw new Error("Invalid email provider configuration.");
  const config = resendConfig.parse({
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
  });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": message.key,
    },
    body: JSON.stringify({
      from: config.EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      text: message.text,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    if (response.status === 409) {
      const error: unknown = await response.json();
      if (
        typeof error === "object" &&
        error &&
        "name" in error &&
        error.name === "concurrent_idempotent_requests"
      )
        return;
    }
    throw new Error("The email provider did not accept the message.");
  }
}

function guestLink(path: "verify" | "manage", token: string) {
  return new URL(`/guest/${path}/${token}`, getAuthConfig().APP_URL).href;
}

export function sendVerification(to: string, token: string, key: string) {
  return send({
    to,
    key,
    subject: "Confirm your WishVow commitment",
    text: `Open the link and choose Confirm commitment within 30 minutes. Capacity is checked when you confirm.\n\n${guestLink("verify", token)}\n\nIf you didn't request this, you can ignore this email.`,
  });
}

export function sendCommitmentConfirmation(
  to: string,
  token: string,
  id: string,
) {
  return send({
    to,
    key: `confirmed/${id}`,
    subject: "Your WishVow commitment is confirmed",
    text: `Your commitment is now active. No payment was collected. Manage or cancel it using this private link.\n\n${guestLink("manage", token)}`,
  });
}

export function sendManagement(to: string, token: string, key: string) {
  return send({
    to,
    key,
    subject: "Manage your WishVow commitment",
    text: `Use this private link to manage your commitment.\n\n${guestLink("manage", token)}\n\nIf you didn't request this link, you can ignore this email.`,
  });
}

export function sendCancellation(to: string, id: string) {
  return send({
    to,
    key: `cancelled/${id}`,
    subject: "Your WishVow commitment was cancelled",
    text: "Your commitment was cancelled. Your quantity or pledged amount is available to other guests again.",
  });
}

export function sendUnavailable(to: string, id: string) {
  return send({
    to,
    key: `unavailable/${id}`,
    subject: "Your WishVow request is no longer available",
    text: "The event, wish, or available capacity changed before you could confirm. Reopen the original wishlist for current options.",
  });
}

export function sendHostAccountEmail(
  kind: "verify" | "reset",
  to: string,
  url: string,
  token: string,
) {
  const verification = kind === "verify";
  return send({
    to,
    key: "host-" + kind + "/" + tokenHash(token),
    subject: verification
      ? "Verify your WishVow host account"
      : "Reset your WishVow password",
    text:
      (verification
        ? "Open the link to verify your host email."
        : "Open the link to set a new password.") +
      "\n\n" +
      url +
      "\n\nThe link expires in one hour. If you didn't request it, you can ignore this email.",
  });
}
