import { describe, expect, it } from "vitest";
import { canTransition, eventSlug } from "@/lib/services/event-rules";
import {
  eventDetailsSchema,
  participantSchema,
  privacyInputSchema,
} from "@/lib/validation/events";

const details = {
  title: " Alex & Jules ",
  eventType: "reception",
  story: "",
  locationText: " ",
  eventDate: "2028-02-29",
  locale: "en-ca",
  timezone: "America/Toronto",
};

describe("event validation", () => {
  it("normalizes optional fields and ignores the submitted locale", () => {
    expect(eventDetailsSchema.parse(details)).toMatchObject({
      title: "Alex & Jules",
      story: null,
      locationText: null,
    });
    expect(eventDetailsSchema.parse(details)).not.toHaveProperty("locale");
  });

  it.each([
    { title: " " },
    { eventDate: "2027-02-29" },
    { timezone: "+01:00" },
    { timezone: "America/Nowhere" },
    { eventType: "unknown" },
  ])("rejects invalid event input %j", (invalid) => {
    expect(
      eventDetailsSchema.safeParse({ ...details, ...invalid }).success,
    ).toBe(false);
  });

  it("validates participants and passcode lengths", () => {
    expect(
      participantSchema.parse({ displayName: " Ren ", roleLabel: " Sibling " }),
    ).toEqual({ displayName: "Ren", roleLabel: "Sibling" });
    expect(
      participantSchema.safeParse({ displayName: "Ren", roleLabel: " " })
        .success,
    ).toBe(false);
    expect(
      privacyInputSchema.safeParse({
        privacy: "passcode",
        passcode: "short",
        showGiverNamesToGuests: false,
        surpriseMode: false,
      }).success,
    ).toBe(false);
  });
});

describe("event lifecycle and share slugs", () => {
  it.each([
    ["owner", "draft", "published", true],
    ["owner", "draft", "archived", true],
    ["owner", "published", "archived", true],
    ["owner", "archived", "published", false],
    ["cohost", "draft", "published", false],
    ["cohost", "published", "archived", false],
  ] as const)(
    "applies the role and state rules to %s/%s → %s",
    (role, source, target, allowed) => {
      expect(canTransition(role, source, target)).toBe(allowed);
    },
  );

  it("uses a readable prefix with fresh cryptographic randomness", () => {
    const first = eventSlug("Anaïs & Jay");
    expect(first).toMatch(/^anais-jay-[a-f0-9]{24}$/);
    expect(first).not.toBe(eventSlug("Anaïs & Jay"));
    expect(eventSlug("庆祝")).toMatch(/^event-[a-f0-9]{24}$/);
  });
});
