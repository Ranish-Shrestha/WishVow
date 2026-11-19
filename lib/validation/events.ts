import { z } from "zod";
import { eventTypes } from "@/lib/event-types";

export const eventIdSchema = z.uuid();
export const privacySchema = z.enum(
  ["unlisted", "passcode"],
  "Choose an event privacy setting.",
);

export const eventTimeZones = [
  "UTC",
  ...Intl.supportedValuesOf("timeZone").map((zone) =>
    zone === "Asia/Katmandu" ? "Asia/Kathmandu" : zone,
  ),
];

function supportsTimezone(value: string) {
  if (!/^[A-Za-z][A-Za-z0-9_+/-]*$/.test(value)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

export const eventDetailsSchema = z.object({
  title: z.string().trim().min(1, "Enter an event title.").max(120),
  eventType: z.enum(eventTypes, "Choose an event type."),
  story: optionalText(4000),
  eventDate: z
    .union([z.literal(""), z.iso.date()])
    .transform((value) => value || null),
  timezone: z
    .string()
    .trim()
    .max(80)
    .refine(supportsTimezone, "Choose a valid time zone."),
  locationText: optionalText(180),
});

export const privacyInputSchema = z.object({
  privacy: privacySchema,
  passcode: z
    .string()
    .trim()
    .max(128)
    .refine(
      (value) => value.length === 0 || value.length >= 8,
      "Use at least eight characters.",
    ),
  showGiverNamesToGuests: z.boolean(),
  surpriseMode: z.boolean(),
});

export const participantSchema = z.object({
  displayName: z.string().trim().min(1, "Enter a participant name.").max(120),
  roleLabel: z.string().trim().min(1, "Enter a role label.").max(80),
});

export const transitionSchema = z.enum(["published", "archived"]);
export type EventDetails = z.infer<typeof eventDetailsSchema>;
export type PrivacyInput = z.infer<typeof privacyInputSchema>;
export type ParticipantInput = z.infer<typeof participantSchema>;
