import { z } from "zod";

export const invitationTemplates = [
  ["classic", "Classic"],
  ["modern", "Modern"],
  ["garden", "Garden"],
] as const;
export const invitationPalette = {
  accentColor: "#69394b",
  backgroundColor: "#faf6ee",
};
export const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const color = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^#[0-9a-f]{6}$/, "Choose a six-digit hex color.");

export const invitationCardSchema = z.object({
  names: z
    .string()
    .trim()
    .min(1, "Enter the invitation names.")
    .max(88)
    .regex(/^[^\r\n]+$/),
  invitationDate: z.iso
    .date()
    .refine((value) => value.slice(0, 4) !== "0000", "Enter a valid year."),
  venue: z
    .string()
    .trim()
    .min(1, "Enter the venue.")
    .max(120)
    .regex(/^[^\r\n]+$/),
  template: z.enum(["classic", "modern", "garden"]),
  accentColor: color,
  backgroundColor: color,
});

const party = z
  .string()
  .regex(/^(?:[1-9]|1[0-2])$/, "Enter a party size from 1 to 12.")
  .transform(Number);
export const invitationLinkSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Enter a household label.")
    .max(100)
    .regex(/^[^\r\n]+$/),
  maxParty: party,
});
export const rsvpSchema = z
  .discriminatedUnion("status", [
    z.object({
      status: z.literal("attending"),
      partySize: party,
      message: z.string().trim().max(1000).default(""),
    }),
    z.object({
      status: z.literal("not_attending"),
      message: z.string().trim().max(1000).default(""),
    }),
  ])
  .transform((input) => ({
    status: input.status,
    partySize: input.status === "attending" ? input.partySize : 0,
    message: input.message || null,
  }));

export type InvitationCardInput = z.output<typeof invitationCardSchema>;
export type InvitationLinkInput = z.output<typeof invitationLinkSchema>;
export type RsvpInput = z.output<typeof rsvpSchema>;
