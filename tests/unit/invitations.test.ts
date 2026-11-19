import { expect, it } from "vitest";
import { invitationInk } from "@/lib/services/invitation-design";
import { rsvpCsv } from "@/lib/services/rsvp-csv";
import { invitationCardSchema, rsvpSchema } from "@/lib/validation/invitations";

const card = {
  names: "Ari & Morgan",
  venue: "Lake House",
  invitationDate: "2027-06-12",
  template: "classic",
  accentColor: "#9A4455",
  backgroundColor: "#faf6ee",
};

it("normalizes valid card colors and rejects invalid dates and style values", () => {
  expect(invitationCardSchema.parse(card).accentColor).toBe("#9a4455");
  expect(
    invitationCardSchema.safeParse({ ...card, invitationDate: "0000-06-12" })
      .success,
  ).toBe(false);
  expect(
    invitationCardSchema.safeParse({ ...card, accentColor: "url(external)" })
      .success,
  ).toBe(false);
  expect(
    invitationCardSchema.safeParse({ ...card, template: "unknown" }).success,
  ).toBe(false);
  expect(invitationInk("#111111")).toBe("#ffffff");
  expect(invitationInk("#fbf7ef")).toBe("#000000");
});

it("requires a positive attending party and clears party size for declines", () => {
  expect(rsvpSchema.parse({ status: "not_attending" }).message).toBeNull();
  expect(
    rsvpSchema.safeParse({ status: "attending", partySize: "0", message: "" })
      .success,
  ).toBe(false);
  expect(
    rsvpSchema.safeParse({ status: "attending", partySize: "13", message: "" })
      .success,
  ).toBe(false);
  expect(
    rsvpSchema.parse({
      status: "not_attending",
      partySize: "4",
      message: "  ",
    }),
  ).toEqual({ status: "not_attending", partySize: 0, message: null });
});

it("quotes CSV fields, escapes spreadsheet formulas, and exports no credentials", () => {
  const csv = rsvpCsv([
    {
      label: '=HYPERLINK("example")',
      status: "attending",
      partySize: 1,
      maxParty: 2,
      message: "  @SUM(1,2)",
      respondedAt: new Date("2026-11-18T18:00:00Z"),
      revokedAt: null,
    },
  ]);
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain('"\'=HYPERLINK(""example"")"');
  expect(csv).toContain('"\'  @SUM(1,2)"');
  expect(csv).not.toMatch(/token|private link/i);
});
